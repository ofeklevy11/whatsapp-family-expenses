import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { verifyPassword } from "./password";
import {
  SESSION_COOKIE,
  verifySession,
  type SessionPayload,
  type SessionRole,
} from "./session";

/** True when the dashboard login is configured (admin password + secret set). */
export const authConfigured =
  env.ADMIN_PASSWORD.trim().length > 0 && env.AUTH_SECRET.trim().length > 0;

/**
 * Check a username/password against the .env admin first, then the database
 * users. Returns the role on success, or null on failure.
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<SessionRole | null> {
  const u = username.trim();
  if (!u || !password) return null;

  if (
    env.ADMIN_PASSWORD &&
    u === env.ADMIN_USERNAME &&
    password === env.ADMIN_PASSWORD
  ) {
    return "admin";
  }

  const dbUser = await prisma.dashboardUser.findUnique({ where: { username: u } });
  if (dbUser && verifyPassword(password, dbUser.passwordHash)) {
    return "user";
  }

  return null;
}

/** Read and verify the current session from the request cookies. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
