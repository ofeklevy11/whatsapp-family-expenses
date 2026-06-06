"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getPrimaryFamily } from "@/server/services/family.service";
import { addFamilyMember, removeFamilyMember } from "@/server/services/user.service";

export type AddMemberState = { error?: string; success?: string };

/** Add a family member (grants the number access to the bot). */
export async function addMemberAction(
  _prev: AddMemberState,
  formData: FormData,
): Promise<AddMemberState> {
  const family = await getPrimaryFamily();
  if (!family) return { error: "לא נמצאה משפחה." };

  const name = String(formData.get("name") ?? "");
  const phone = String(formData.get("phone") ?? "");

  if (!phone.trim()) return { error: "יש להזין מספר טלפון." };

  const result = await addFamilyMember({ familyId: family.id, phone, name });
  if (!result.ok) {
    return {
      error:
        result.reason === "already_member"
          ? "המספר כבר רשום כבן משפחה."
          : "מספר טלפון לא תקין. הזינו מספר כולל קידומת מדינה (לדוגמה 972501234567).",
    };
  }

  revalidatePath("/family");
  return { success: `${result.user.name ?? result.user.phone} נוסף/ה למשפחה ויש לו/ה כעת גישה לבוט.` };
}

/** Remove a member and revoke their bot access. */
export async function removeMemberAction(formData: FormData): Promise<void> {
  const family = await getPrimaryFamily();
  if (!family) return;
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  await removeFamilyMember({ familyId: family.id, userId });
  revalidatePath("/family");
}

export type AddCategoryState = { error?: string; success?: string };

/** Add a custom expense category for the family (used by the AI classifier too). */
export async function addCategoryAction(
  _prev: AddCategoryState,
  formData: FormData,
): Promise<AddCategoryState> {
  const family = await getPrimaryFamily();
  if (!family) return { error: "לא נמצאה משפחה." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "יש להזין שם קטגוריה." };

  const existing = await prisma.category.findUnique({
    where: { familyId_name: { familyId: family.id, name } },
  });
  if (existing) return { error: "קטגוריה בשם זה כבר קיימת." };

  await prisma.category.create({ data: { familyId: family.id, name } });
  revalidatePath("/family");
  return { success: `הקטגוריה "${name}" נוספה.` };
}

/** Delete a category (its expenses keep their data, just lose the link). */
export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const family = await getPrimaryFamily();
  if (!family) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat || cat.familyId !== family.id) return;
  await prisma.category.delete({ where: { id } });
  revalidatePath("/family");
}
