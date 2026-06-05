import { NextResponse } from "next/server";
import { ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getPrimaryFamily } from "@/server/services/family.service";
import { listFamilyMembers } from "@/server/services/user.service";
import type { ExpenseRow } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Returns the full (non-deleted) expense set for the primary family plus the
 * available filter options. The dashboard loads this once and filters/aggregates
 * entirely in the browser for instant interactivity.
 */
export async function GET() {
  const family = await getPrimaryFamily();
  if (!family) {
    return NextResponse.json({
      family: null,
      currency: "ILS",
      rows: [],
      categories: [],
      members: [],
      paymentMethods: [],
      sources: [],
    });
  }

  const [expenses, categories, members] = await Promise.all([
    prisma.expense.findMany({
      where: { familyId: family.id, status: { not: ExpenseStatus.DELETED } },
      include: { category: true, user: true },
      orderBy: { expenseDate: "desc" },
    }),
    prisma.category.findMany({
      where: { familyId: family.id },
      orderBy: { name: "asc" },
    }),
    listFamilyMembers(family.id),
  ]);

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    amount: e.amount,
    currency: e.currency,
    merchantName: e.merchantName,
    description: e.description,
    categoryId: e.categoryId,
    categoryName: e.category?.name ?? "אחר",
    userId: e.userId,
    userName: e.user?.name ?? e.user?.phone ?? "לא ידוע",
    paymentMethod: e.paymentMethod,
    sourceType: e.sourceType,
    status: e.status,
    isRecurring: e.isRecurring,
    expenseDate: e.expenseDate.toISOString(),
  }));

  const paymentMethods = [
    ...new Set(expenses.map((e) => e.paymentMethod).filter((p): p is string => Boolean(p))),
  ].sort();
  const sources = [...new Set(expenses.map((e) => e.sourceType))];

  return NextResponse.json({
    family: { id: family.id, name: family.name, currency: family.currency },
    currency: family.currency,
    rows,
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    members: members.map((m) => ({ id: m.id, name: m.name ?? m.phone })),
    paymentMethods,
    sources,
  });
}
