import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, usersTable } from "@workspace/db";
import {
  hashPassword,
  verifyPassword,
  signToken,
  setSessionCookie,
  clearSessionCookie,
} from "../lib/auth";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const GENERIC_AUTH_ERROR = "Invalid email or password";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const sanitizeUser = (u: typeof usersTable.$inferSelect) => {
  const { passwordHash: _ph, ...rest } = u;
  return rest;
};

// Generic error used for both "email already exists" and other registration
// failures so attackers can't enumerate registered emails.
const GENERIC_REGISTER_ERROR =
  "Unable to register with these details. If you already have an account, please log in.";

router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Hash unconditionally so timing doesn't differ between "exists" and "new".
  const passwordHash = await hashPassword(password);

  let user: typeof usersTable.$inferSelect | undefined;
  try {
    [user] = await db
      .insert(usersTable)
      .values({
        fullName: name,
        email: normalizedEmail,
        passwordHash,
        authMethod: "email",
      })
      .returning();
  } catch (err: unknown) {
    // Postgres unique_violation = 23505 (drizzle/pg surfaces err.code)
    const code = (err as { code?: string } | null)?.code;
    if (code === "23505") {
      res.status(409).json({ error: GENERIC_REGISTER_ERROR });
      return;
    }
    throw err;
  }

  if (!user) {
    res.status(409).json({ error: GENERIC_REGISTER_ERROR });
    return;
  }

  const token = signToken({ sub: user.id, email: user.email });
  setSessionCookie(res, token);
  res.status(201).json({ user: sanitizeUser(user) });
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: GENERIC_AUTH_ERROR });
    return;
  }
  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: GENERIC_AUTH_ERROR });
    return;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: GENERIC_AUTH_ERROR });
    return;
  }

  await db
    .update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id));

  const token = signToken({ sub: user.id, email: user.email });
  setSessionCookie(res, token);
  res.json({ user: sanitizeUser(user) });
});

router.post("/auth/logout", async (_req: Request, res: Response): Promise<void> => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  res.json({ user: req.user });
});

// Google OAuth — only enabled if credentials are configured
router.get("/auth/google", async (req: Request, res: Response): Promise<void> => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    res.status(503).send("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    return;
  }
  const { startGoogleOAuth } = await import("../lib/google-oauth");
  startGoogleOAuth(req, res);
});

router.get("/auth/google/callback", async (req: Request, res: Response): Promise<void> => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    res.status(503).send("Google OAuth is not configured.");
    return;
  }
  const { handleGoogleCallback } = await import("../lib/google-oauth");
  await handleGoogleCallback(req, res);
});

export default router;
