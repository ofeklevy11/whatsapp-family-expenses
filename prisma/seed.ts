import "dotenv/config";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { normalizePhone } from "@/lib/utils";
import { createFamily, ensureDefaultCategories } from "@/server/services/family.service";

async function main() {
  const inviteCode = env.DEFAULT_INVITE_CODE.toUpperCase();

  let family = await prisma.family.findUnique({ where: { inviteCode } });
  if (!family) {
    family = await createFamily({
      name: env.DEFAULT_FAMILY_NAME,
      inviteCode,
      currency: env.DEFAULT_CURRENCY,
    });
    console.log(`✅ Created family "${family.name}" (invite code: ${inviteCode})`);
  } else {
    await ensureDefaultCategories(family.id);
    console.log(`ℹ️  Family "${family.name}" already exists — ensured categories.`);
  }

  const ownerPhone = normalizePhone(env.OWNER_PHONE);
  if (ownerPhone) {
    await prisma.user.upsert({
      where: { familyId_phone: { familyId: family.id, phone: ownerPhone } },
      update: { role: UserRole.OWNER },
      create: {
        familyId: family.id,
        phone: ownerPhone,
        role: UserRole.OWNER,
        name: "Owner",
      },
    });
    console.log(`✅ Ensured OWNER user (${ownerPhone}).`);
  } else {
    console.log("⚠️  OWNER_PHONE is empty — skipped creating the owner user.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("❌ Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
