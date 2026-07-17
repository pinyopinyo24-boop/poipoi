import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * Hash password using SHA-256
 */
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Create JWT session token
 */
export async function createSessionToken(
  payload: {
    openId: string;
    name: string;
    appId: string;
  },
  jwtSecret: string
): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);
  const tokenPayload = {
    openId: payload.openId,
    appId: payload.appId,
    name: payload.name,
  };
  console.log("[LocalAuth] createSessionToken payload:", tokenPayload);
  const token = await new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);
  console.log("[LocalAuth] Token created:", token.substring(0, 50) + "...");
  return token;
}

/**
 * Verify JWT session token
 */
export async function verifySessionToken(
  token: string,
  jwtSecret: string
): Promise<any> {
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    console.log("[LocalAuth] verifySessionToken: token prefix:", token.substring(0, 50) + "...");
    const verified = await jwtVerify(token, secret);
    console.log("[LocalAuth] verifySessionToken: verified payload:", verified.payload);
    return verified.payload;
  } catch (error) {
    console.error("[LocalAuth] verifySessionToken: error:", error);
    return null;
  }
}

/**
 * Get session cookie options
 */
export function getSessionCookieOptions(req: any) {
  const isSecure = req.protocol === "https" || req.secure;
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

export const COOKIE_NAME = "session";
