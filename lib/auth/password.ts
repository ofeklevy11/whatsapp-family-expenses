import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for dashboard users stored in the database.
 * Uses Node's built-in scrypt (no native dependency). Format: `salt:hash`,
 * both hex. Runs only in server actions / Node runtime — never in middleware.
 */

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, KEYLEN);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
