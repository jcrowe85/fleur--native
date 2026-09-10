// server/src/auth.middleware.ts
import type { Request, Response, NextFunction } from "express";
import { supabaseAuth } from "./services/supabase";

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string | null;
}

/**
 * Verifies the Supabase access token supplied as `Authorization: Bearer <jwt>`
 * and pins req.userId to the token subject.
 *
 * Every endpoint that mints discounts, spends points, or reads user rows must
 * sit behind this. Never take a userId from the request body — a caller can
 * type any UUID they like.
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.userId = data.user.id;
    req.userEmail = data.user.email ?? null;
    return next();
  } catch (err) {
    console.error("[auth] token verification failed:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Guards the internal promotion-dashboard endpoints.
 *
 * These routes create promotion templates and fan out push notifications to the
 * whole user base; they were previously reachable by anyone who knew the URL.
 * Set ADMIN_API_KEY in the server environment and send it as `x-admin-key`.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    console.error("[auth] ADMIN_API_KEY is not set; refusing admin request");
    return res.status(503).json({ error: "Admin API is not configured" });
  }

  const provided = req.headers["x-admin-key"];
  const supplied = Array.isArray(provided) ? provided[0] : provided;

  if (!supplied || !timingSafeEqual(supplied, expected)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

/** Constant-time string compare so the key cannot be recovered byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
