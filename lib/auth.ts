import "server-only";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const PIN_PATTERN = /^\d{4}$/;

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

interface SessionClaims {
  tripId: string;
  memberId: string;
  name: string;
}

const SESSION_COOKIE_PREFIX = "tripsync_session_";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function sessionCookieName(tripId: string): string {
  return `${SESSION_COOKIE_PREFIX}${tripId}`;
}

// HTTP session used by our own API routes to identify "who is calling".
export function signSessionToken(claims: SessionClaims): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return jwt.sign(claims, secret, { expiresIn: SESSION_TTL_SECONDS });
}

export function verifySessionToken(token: string): SessionClaims | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  try {
    return jwt.verify(token, secret) as unknown as SessionClaims;
  } catch {
    return null;
  }
}

// Reads and verifies the trip's session cookie from an incoming request,
// scoped to the given internal trip id. Returns null if absent/invalid/
// for a different trip, so callers can 401 instead of trusting a
// client-supplied member id.
export function getSessionFromCookies(
  cookies: { get(name: string): { value: string } | undefined },
  tripInternalId: string
): SessionClaims | null {
  const cookie = cookies.get(sessionCookieName(tripInternalId));
  if (!cookie) return null;
  const claims = verifySessionToken(cookie.value);
  if (!claims || claims.tripId !== tripInternalId) return null;
  return claims;
}
