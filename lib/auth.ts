import { SignJWT, jwtVerify } from "jose";
import { CONFIG } from "./config";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "default_local_dev_secret_at_least_32_chars_long_123456";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  authenticated: boolean;
  issuedAt: number;
}

/**
 * Creates a signed JWT session token.
 */
export async function createSessionToken(): Promise<string> {
  const key = getSecretKey();
  return await new SignJWT({ authenticated: true, issuedAt: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CONFIG.AUTH.MAX_AGE_SECONDS}s`)
    .sign(key);
}

/**
 * Verifies a signed JWT session token.
 */
export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });

    if (payload.authenticated === true) {
      return {
        authenticated: true,
        issuedAt: (payload.issuedAt as number) || (payload.iat ? payload.iat * 1000 : Date.now()),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validates the submitted application password.
 */
export function verifyAppPassword(password: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    // If not set, allow in development or reject safely
    return false;
  }
  return password === expected;
}

/**
 * Standard cookie configuration for the session.
 */
export const sessionCookieOptions = {
  name: CONFIG.AUTH.COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: CONFIG.AUTH.MAX_AGE_SECONDS,
  },
};

