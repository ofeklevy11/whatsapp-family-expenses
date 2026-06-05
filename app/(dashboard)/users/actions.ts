"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/auth";
import {
  createDashboardUser,
  deleteDashboardUser,
} from "@/server/services/dashboard-user.service";

export type CreateUserState = { error?: string; success?: string };

async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "admin";
}

/** Create a new dashboard login. Admin only. */
export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  if (!(await isAdmin())) return { error: "אין לך הרשאה לפעולה זו." };

  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await createDashboardUser(username, password);
  if (!result.ok) {
    return {
      error:
        result.reason === "taken"
          ? "שם המשתמש כבר קיים."
          : "נדרש שם משתמש (3+ תווים) וסיסמה (6+ תווים).",
    };
  }

  revalidatePath("/users");
  return { success: `המשתמש "${result.username}" נוצר ויכול להתחבר לדשבורד.` };
}

/** Delete a dashboard login. Admin only. */
export async function deleteUserAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteDashboardUser(id);
  revalidatePath("/users");
}
