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
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.sub))
    .limit(1);
  if (user) {
    const { passwordHash: _ph, ...publicUser } = user;
    req.user = publicUser;
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

export function requireCredits(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.credits <= 0) {
    res.status(402).json({ error: "Out of credits", code: "OUT_OF_CREDITS" });
    return;
  }
  next();
}
