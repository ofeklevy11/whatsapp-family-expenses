import { prisma } from "@/lib/db/prisma";
import { normalizePhone } from "@/lib/utils";

/** Find a user (with their family) by phone number. */
export async function findUserByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  return prisma.user.findFirst({
    where: { phone: normalized },
    include: { family: true },
  });
}

/** All members of a family, owners first. */
export async function listFamilyMembers(familyId: string) {
  return prisma.user.findMany({
    where: { familyId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

/** Update a user's display name (e.g. from WhatsApp pushName) if missing. */
export async function ensureUserName(userId: string, name?: string) {
  if (!name) return;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && !user.name) {
    await prisma.user.update({ where: { id: userId }, data: { name } });
  }
}
