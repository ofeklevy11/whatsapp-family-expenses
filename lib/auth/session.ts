/**
 * Stateless signed-session tokens for the dashboard login.
 *
 * A token is `base64url(payload).base64url(HMAC-SHA256(payload))`. We verify the
 * signature and expiry on every request. Implemented with Web Crypto so the same
 * code runs in both the Edge middleware and Node server actions.
 *
 * The signing secret is read straight from `process.env.AUTH_SECRET` (not via the
 * zod-validated env module) so this stays usable inside Edge middleware.
 */

export const SESSION_COOKIE = "session";

export type SessionRole = "admin" | "user";

export interface SessionPayload {
  /** Username (admin from .env, or a dashboard user). */
  sub: string;
  role: SessionRole;
  /** Expiry, epoch seconds. */
  exp: number;
}

const encoder = new TextEncoder();

function base64urlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlFromString(value: string): string {
  return base64urlFromBytes(encoder.encode(value));
}

function stringFromBase64url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET ?? "";
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set — dashboard login cannot sign sessions.",
    );
  }
  return secret;
}

async function hmac(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return base64urlFromBytes(new Uint8Array(sig));
}

/** Constant-time-ish string compare (lengths are public, content isn't). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Number of seconds a session is valid for, from SESSION_DAYS (default 7). */
export function sessionMaxAgeSeconds(): number {
  const days = Number(process.env.SESSION_DAYS ?? "7");
  return (Number.isFinite(days) && days > 0 ? days : 7) * 24 * 60 * 60;
}

/** Create a signed token for `username`/`role`, expiring per SESSION_DAYS. */
export async function signSession(
  username: string,
  role: SessionRole,
): Promise<string> {
  const payload: SessionPayload = {
    sub: username,
    role,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds(),
  };
  const body = base64urlFromString(JSON.stringify(payload));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

/** Verify a token's signature and expiry. Returns the payload or null. */
export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expectedSig: string;
  try {
    expectedSig = await hmac(body);
  } catch {
    return null;
  }
  if (!safeEqual(sig, expectedSig)) return null;

  try {
    const payload = JSON.parse(stringFromBase64url(body)) as SessionPayload;
    if (!payload?.sub || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
