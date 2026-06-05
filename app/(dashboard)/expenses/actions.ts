"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import {
  softDeleteExpense,
  createManualExpense,
} from "@/server/services/expense.service";
import { getPrimaryFamily } from "@/server/services/family.service";

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await softDeleteExpense(id);
  revalidatePath("/expenses");
}

export async function createManualExpenseAction(formData: FormData): Promise<void> {
  const family = await getPrimaryFamily();
  if (!family) return;

  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return;

  const str = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v ? v : null;
  };

  const dateRaw = str("expenseDate");
  const expenseDate = dateRaw ? new Date(dateRaw) : new Date();

  await createManualExpense({
    familyId: family.id,
    userId: str("userId"),
    amount,
    currency: str("currency") ?? family.currency,
    merchantName: str("merchantName"),
    description: str("description"),
    categoryName: str("categoryName"),
    paymentMethod: str("paymentMethod"),
    expenseDate: Number.isNaN(expenseDate.getTime()) ? new Date() : expenseDate,
    isRecurring: formData.get("isRecurring") === "on",
  });

  revalidatePath("/expenses");
}

export async function updateExpenseCategoryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!id) return;
  await prisma.expense.update({
    where: { id },
    data: { categoryId: categoryId || null },
  });
  revalidatePath("/expenses");
}
