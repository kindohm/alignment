import crypto from "node:crypto";
import type { Request, Response } from "express";
import { normalizeAdminEmail } from "./normalizeAdminEmail";

const cookieName = "alignment_admin";

type AdminSession = {
  email: string;
  exp: number;
};

const getSecret = (): string => process.env.ADMIN_SESSION_SECRET || "change-me-in-dev";

const sign = (payload: string): string => crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");

const encodeSession = (session: AdminSession): string => {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
};

const decodeSession = (value: string): AdminSession | null => {
  const [payload, signature] = value.split(".");

  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
  return session.exp > Date.now() ? session : null;
};

const readCookie = (request: Request, name: string): string | undefined =>
  request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

export const readAdminSession = (request: Request): AdminSession | null => {
  const cookie = readCookie(request, cookieName);
  return cookie ? decodeSession(cookie) : null;
};

export const setAdminSession = (response: Response, email: string): void => {
  const sevenDays = 1000 * 60 * 60 * 24 * 7;
  const token = encodeSession({
    email: normalizeAdminEmail(email),
    exp: Date.now() + sevenDays
  });

  response.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sevenDays,
    path: "/"
  });
};

export const clearAdminSession = (response: Response): void => {
  response.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
};
