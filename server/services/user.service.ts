import { UserRole, type User } from "@prisma/client";
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

/**
 * Find a user by any of their known identities — phone number and/or LID.
 * WhatsApp privacy / business contacts message under a LID rather than their
 * phone, so we match a member whichever identifier a message arrives with.
 * A stored value may also legitimately appear in either column (e.g. a row
 * created before we learned the real phone holds the LID in `phone`), so we
 * check both columns against both ids.
 */
export async function findUserByIdentity(params: { phone?: string; lid?: string }) {
  const ids = Array.from(
    new Set(
      [params.phone, params.lid]
        .filter((v): v is string => Boolean(v))
        .map((v) => normalizePhone(v))
        .filter((v) => v.length > 0),
    ),
  );
  if (ids.length === 0) return null;

  return prisma.user.findFirst({
    where: { OR: [{ phone: { in: ids } }, { lid: { in: ids } }] },
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

/**
 * Keep a recognised member's identity up to date from an incoming message:
 *   - record their LID once we see it, so future LID-only messages still match;
 *   - upgrade a row whose `phone` still holds a LID to the real phone number
 *     once WhatsApp reveals it (so the dashboard shows a normal number).
 * Best-effort: a unique-phone clash (another row already owns that number) is
 * swallowed rather than surfaced.
 */
export async function reconcileUserIdentity(
  userId: string,
  identity: { phone?: string; lid?: string },
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const realPhone = identity.phone ? normalizePhone(identity.phone) : undefined;
  const lid = identity.lid ? normalizePhone(identity.lid) : undefined;

  const data: { phone?: string; lid?: string } = {};
  // A real phone is one we know is distinct from the LID; only then is it safe
  // to promote it into the human-readable `phone` column.
  if (realPhone && realPhone !== lid && user.phone !== realPhone) {
    data.phone = realPhone;
  }
  if (lid && user.lid !== lid) data.lid = lid;

  if (Object.keys(data).length === 0) return;

  try {
    await prisma.user.update({ where: { id: user.id }, data });
  } catch {
    // Unique [familyId, phone] clash — the contact already exists under their
    // real number; leave this row as-is.
  }
}

export type AddMemberResult =
  | { ok: false; reason: "invalid_phone" | "already_member" }
  | { ok: true; user: User };

/**
 * Add a family member directly from the dashboard. Creating the User row is
 * what grants the number access to the bot: the incoming-message handler
 * looks the sender up (findUserByIdentity) and onboards anyone it can't find.
 * A member added here skips onboarding and is handled normally.
 *
 * Everyone who is granted access is an OWNER — the system has no role
 * hierarchy.
 */
export async function addFamilyMember(params: {
  familyId: string;
  phone: string;
  name?: string | null;
}): Promise<AddMemberResult> {
  const phone = normalizePhone(params.phone);
  // Israeli mobiles are 12 digits with country code (972…); require a sane minimum.
  if (phone.length < 9) return { ok: false, reason: "invalid_phone" };

  const existing = await prisma.user.findUnique({
    where: { familyId_phone: { familyId: params.familyId, phone } },
  });
  if (existing) return { ok: false, reason: "already_member" };

  const user = await prisma.user.create({
    data: {
      familyId: params.familyId,
      phone,
      name: params.name?.trim() || null,
      role: UserRole.OWNER,
    },
  });
  return { ok: true, user };
}

/** Remove a member and revoke their bot access. */
export async function removeFamilyMember(params: {
  familyId: string;
  userId: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user || user.familyId !== params.familyId) return;
  await prisma.user.delete({ where: { id: params.userId } });
}
