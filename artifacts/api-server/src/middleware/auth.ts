import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, type PublicUser } from "@workspace/db";
import { verifyToken, SESSION_COOKIE_NAME } from "../lib/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
      userId?: string;
    }
  }
}

const extractToken = (req: Request): string | null => {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookies && typeof cookies[SESSION_COOKIE_NAME] === "string") {
    return cookies[SESSION_COOKIE_NAME];
  }
  return null;
};

const toPublicUser = (user: typeof usersTable.$inferSelect): PublicUser => {
  const { passwordHash: _ph, ...publicUser } = user;
  return publicUser;
};

export const getPublicUserById = async (userId: string): Promise<PublicUser | null> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) return null;
  return toPublicUser(user);
};

export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    next();
    return;
  }

  // In dev, skip DB lookups on every request to keep UI responsive.
  if (process.env.NODE_ENV !== "production") {
    req.userId = payload.sub;
    next();
    return;
  }

  const user = await getPublicUserById(payload.sub);
  if (user) {
    req.user = user;
    req.userId = user.id;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export async function requireCredits(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!req.user) {
    const user = await getPublicUserById(req.userId);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.user = user;
  }

  if (req.user.credits <= 0) {
    res.status(402).json({ error: "Out of credits", code: "OUT_OF_CREDITS" });
    return;
  }
  next();
}
