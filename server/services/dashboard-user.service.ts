import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

/** All dashboard logins the admin has created (newest first). */
export function listDashboardUsers() {
  return prisma.dashboardUser.findMany({
    select: { id: true, username: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export type CreateDashboardUserResult =
  | { ok: false; reason: "invalid" | "taken" }
  | { ok: true; username: string };

/** Create a new dashboard login. Username is case-insensitive-unique-ish. */
export async function createDashboardUser(
  username: string,
  password: string,
): Promise<CreateDashboardUserResult> {
  const u = username.trim();
  if (u.length < 3 || password.length < 6) return { ok: false, reason: "invalid" };

  const existing = await prisma.dashboardUser.findUnique({ where: { username: u } });
  if (existing) return { ok: false, reason: "taken" };

  await prisma.dashboardUser.create({
    data: { username: u, passwordHash: hashPassword(password) },
  });
  return { ok: true, username: u };
}

/** Delete a dashboard login by id. */
export async function deleteDashboardUser(id: string): Promise<void> {
  await prisma.dashboardUser.deleteMany({ where: { id } });
}
