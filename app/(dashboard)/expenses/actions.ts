"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { softDeleteExpense } from "@/server/services/expense.service";

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await softDeleteExpense(id);
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
