import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Response } from "express";

const SALT_ROUNDS = 12;
const JWT_EXPIRY_DAYS = 15;
const COOKIE_NAME = "dla_session";

const getJwtSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET env var is required for JWT signing");
  }
  return secret;
};

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

export interface JwtPayload {
  sub: string; // user id
  email: string;
}

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, getJwtSecret(), { expiresIn: `${JWT_EXPIRY_DAYS}d` });

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
};

export const setSessionCookie = (res: Response, token: string): void => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: JWT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

export const clearSessionCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
};

export const SESSION_COOKIE_NAME = COOKIE_NAME;
