import { UserRole, type Family, type User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { normalizePhone } from "@/lib/utils";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

export interface CreateFamilyInput {
  name: string;
  inviteCode: string;
  currency?: string;
  monthlyBudget?: number | null;
}

/** Create a family together with its default category set. */
export async function createFamily(input: CreateFamilyInput): Promise<Family> {
  const family = await prisma.family.create({
    data: {
      name: input.name,
      inviteCode: input.inviteCode.toUpperCase(),
      currency: input.currency ?? env.DEFAULT_CURRENCY,
      monthlyBudget: input.monthlyBudget ?? null,
    },
  });

  await ensureDefaultCategories(family.id);
  return family;
}

/** Make sure the family has all default categories (idempotent). */
export async function ensureDefaultCategories(familyId: string): Promise<void> {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((name) => ({ familyId, name })),
    skipDuplicates: true,
  });
}

export async function findFamilyByInviteCode(code: string): Promise<Family | null> {
  return prisma.family.findUnique({
    where: { inviteCode: code.toUpperCase() },
  });
}

/**
 * The family shown in the dashboard. With no auth layer yet we use the
 * seeded family (by default invite code), falling back to the first one.
 */
export async function getPrimaryFamily(): Promise<Family | null> {
  const byCode = await prisma.family.findUnique({
    where: { inviteCode: env.DEFAULT_INVITE_CODE.toUpperCase() },
  });
  if (byCode) return byCode;
  return prisma.family.findFirst({ orderBy: { createdAt: "asc" } });
}

export type JoinResult =
  | { ok: false; reason: "code_not_found" }
  | { ok: true; family: Family; user: User; alreadyMember: boolean };

/**
 * Join (or re-confirm membership of) a family using an invite code.
 * Everyone who joins is an OWNER — the system has no role hierarchy.
 */
export async function joinFamily(params: {
  phone: string;
  code: string;
  name?: string;
}): Promise<JoinResult> {
  const phone = normalizePhone(params.phone);
  const family = await findFamilyByInviteCode(params.code);
  if (!family) return { ok: false, reason: "code_not_found" };

  const existing = await prisma.user.findUnique({
    where: { familyId_phone: { familyId: family.id, phone } },
  });
  if (existing) {
    return { ok: true, family, user: existing, alreadyMember: true };
  }

  const user = await prisma.user.create({
    data: { familyId: family.id, phone, name: params.name ?? null, role: UserRole.OWNER },
  });

  return { ok: true, family, user, alreadyMember: false };
}
