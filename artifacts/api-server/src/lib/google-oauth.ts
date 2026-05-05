import type { Request, Response } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken, setSessionCookie } from "./auth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const OAUTH_STATE_COOKIE = "dla_oauth_state";
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

// Resolve the canonical app origin from APP_BASE_URL when configured.
// In production APP_BASE_URL is required — we never trust proxy headers there
// because a misconfigured proxy could enable open-redirect attacks.
// In dev we fall back to proxy/host headers for convenience.
const getAppOrigin = (req: Request): string => {
  const configured = process.env.APP_BASE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_BASE_URL must be set in production for OAuth redirect safety",
    );
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
};

const getRedirectUri = (req: Request): string => `${getAppOrigin(req)}/api/auth/google/callback`;

export function startGoogleOAuth(req: Request, res: Response): void {
  const redirectUri = getRedirectUri(req);

  // Random opaque state, stored in a short-lived httpOnly cookie. The callback
  // verifies the cookie matches the `state` query param to prevent CSRF.
  const state = crypto.randomBytes(32).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: OAUTH_STATE_MAX_AGE_MS,
    path: "/api/auth/google",
  });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}

interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

const safeRedirect = (res: Response, origin: string, path: string): void => {
  // Only allow same-origin redirects.
  res.redirect(`${origin}${path.startsWith("/") ? path : `/${path}`}`);
};

const clearStateCookie = (res: Response): void => {
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/api/auth/google" });
};

export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const origin = getAppOrigin(req);

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const error = typeof req.query.error === "string" ? req.query.error : null;
  const stateParam = typeof req.query.state === "string" ? req.query.state : null;
  const stateCookie = (req.cookies as Record<string, string> | undefined)?.[OAUTH_STATE_COOKIE] ?? null;

  // Always clear the state cookie once the callback is hit, success or fail.
  clearStateCookie(res);

  // CSRF check: validate state BEFORE acting on anything else, so an attacker
  // can't trigger a redirect (even an error redirect) without having gone
  // through our /auth/google initiator that set the cookie.
  if (
    !stateParam ||
    !stateCookie ||
    stateParam.length !== stateCookie.length ||
    !crypto.timingSafeEqual(Buffer.from(stateParam), Buffer.from(stateCookie))
  ) {
    safeRedirect(res, origin, "/login?error=invalid_state");
    return;
  }

  if (error) {
    safeRedirect(res, origin, `/login?error=${encodeURIComponent(error)}`);
    return;
  }
  if (!code) {
    safeRedirect(res, origin, "/login?error=missing_code");
    return;
  }

  const redirectUri = getRedirectUri(req);

  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    safeRedirect(res, origin, "/login?error=token_exchange_failed");
    return;
  }

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  // Get user info
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) {
    safeRedirect(res, origin, "/login?error=userinfo_failed");
    return;
  }
  const profile = (await userRes.json()) as GoogleUserInfo;

  if (!profile.email) {
    safeRedirect(res, origin, "/login?error=no_email");
    return;
  }

  const normalizedEmail = profile.email.toLowerCase().trim();

  // Find or create user
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(usersTable)
      .values({
        fullName: profile.name || profile.given_name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleId: profile.id,
        avatarUrl: profile.picture || null,
        authMethod: "google",
      })
      .returning();
  } else {
    // Update Google info
    [user] = await db
      .update(usersTable)
      .set({
        googleId: profile.id,
        avatarUrl: profile.picture || user.avatarUrl,
        lastLoginAt: new Date(),
      })
      .where(eq(usersTable.id, user.id))
      .returning();
  }

  const token = signToken({ sub: user.id, email: user.email });
  setSessionCookie(res, token);
  safeRedirect(res, origin, "/dashboard");
}
