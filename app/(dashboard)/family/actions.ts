"use server";

import { revalidatePath } from "next/cache";
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
