import { ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getPrimaryFamily } from "@/server/services/family.service";
import { listFamilyMembers } from "@/server/services/user.service";
import { NoFamilyState } from "@/components/ui/empty-state";
import { ExpensesExplorer } from "@/components/expenses/expenses-explorer";
import type { ExpenseRow, FilterOptions } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

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

  const options: FilterOptions = {
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    members: members.map((m) => ({ id: m.id, name: m.name ?? m.phone })),
    paymentMethods: [
      ...new Set(
        expenses.map((e) => e.paymentMethod).filter((p): p is string => Boolean(p)),
      ),
    ].sort(),
    sources: [...new Set(expenses.map((e) => e.sourceType))],
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">הוצאות</h1>
        <p className="text-sm text-slate-500">
          פילטרים חכמים, חיפוש, הוספה ידנית וייצוא ל-Excel/PDF — הכל מיידי.
        </p>
      </header>
      <ExpensesExplorer rows={rows} options={options} currency={family.currency} />
    </div>
  );
}
