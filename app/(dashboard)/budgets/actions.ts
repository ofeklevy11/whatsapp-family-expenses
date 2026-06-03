"use server";

import { revalidatePath } from "next/cache";
import { getPrimaryFamily } from "@/server/services/family.service";
import { setMonthlyBudget, setCategoryBudget } from "@/server/services/budget.service";
import { getCurrentMonthKey } from "@/lib/dates";

export async function setOverallBudgetAction(formData: FormData): Promise<void> {
  const family = await getPrimaryFamily();
  if (!family) return;
  const amount = Number(formData.get("amount"));
  if (Number.isFinite(amount) && amount > 0) {
    await setMonthlyBudget(family.id, amount);
    revalidatePath("/budgets");
  }
}

export async function setCategoryBudgetAction(formData: FormData): Promise<void> {
  const family = await getPrimaryFamily();
  if (!family) return;
  const categoryName = String(formData.get("categoryName") ?? "");
  const amount = Number(formData.get("amount"));
  if (categoryName && Number.isFinite(amount) && amount > 0) {
    await setCategoryBudget(family.id, categoryName, amount, getCurrentMonthKey());
    revalidatePath("/budgets");
  }
}
