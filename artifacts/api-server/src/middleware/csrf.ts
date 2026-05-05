import type { Request, Response, NextFunction } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const DEV_ORIGIN_REGEX =
  /^https?:\/\/(10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[0-1])(\.\d+){2}|localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/;

const isDevOrigin = (origin: string): boolean => {
  if (process.env.NODE_ENV === "production") return false;
  return DEV_ORIGIN_REGEX.test(origin);
};

const getRequestOrigin = (req: Request): string | null => {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) return null;
  return `${proto}://${host}`;
};

const getAllowedOrigins = (req: Request): Set<string> => {
  const allowed = new Set<string>();
  const self = getRequestOrigin(req);
  if (self) allowed.add(self);
  if (process.env.APP_BASE_URL) {
    allowed.add(process.env.APP_BASE_URL.replace(/\/$/, ""));
  }
  // Allow comma-separated extra origins (e.g. preview domains)
  if (process.env.ALLOWED_ORIGINS) {
    for (const o of process.env.ALLOWED_ORIGINS.split(",")) {
      const t = o.trim().replace(/\/$/, "");
      if (t) allowed.add(t);
    }
  }
  return allowed;
};

/**
 * Origin/Referer check for state-changing requests. Cookies are SameSite=Lax
 * and httpOnly, but defense-in-depth: reject any non-GET request whose Origin
 * (or Referer if Origin is missing) does not match an allowed app origin.
 */
export const csrfGuard = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const allowed = getAllowedOrigins(req);

  const originHeader = req.headers.origin;
  if (typeof originHeader === "string" && originHeader) {
    const origin = originHeader.replace(/\/$/, "");
    if (isDevOrigin(origin)) {
      next();
      return;
    }
    if (!allowed.has(origin)) {
      res.status(403).json({ error: "Cross-origin request blocked" });
      return;
    }
    next();
    return;
  }

  const referer = req.headers.referer;
  if (typeof referer === "string" && referer) {
    try {
      const refUrl = new URL(referer);
      const refOrigin = `${refUrl.protocol}//${refUrl.host}`;
      if (isDevOrigin(refOrigin)) {
        next();
        return;
      }
      if (!allowed.has(refOrigin)) {
        res.status(403).json({ error: "Cross-origin request blocked" });
        return;
      }
      next();
      return;
    } catch {
      res.status(403).json({ error: "Invalid referer" });
      return;
    }
  }

  // No Origin/Referer on a state-changing request → reject.
  res.status(403).json({ error: "Missing Origin/Referer header" });
};
