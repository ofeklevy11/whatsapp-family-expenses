import { prisma } from "@/lib/db/prisma";
import { getPrimaryFamily } from "@/server/services/family.service";
import { listExpenses } from "@/server/services/expense.service";
import { listFamilyMembers } from "@/server/services/user.service";
import { getCurrentMonthKey, formatDateHe } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { StatusBadge, SourceBadge } from "@/components/ui/badge";
import { NoFamilyState, EmptyRow } from "@/components/ui/empty-state";
import { deleteExpenseAction, updateExpenseCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; categoryId?: string; userId?: string }>;
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const params = await searchParams;
  const month = params.month ?? getCurrentMonthKey();
  const categoryId = params.categoryId || undefined;
  const userId = params.userId || undefined;

  const [expenses, categories, members] = await Promise.all([
    listExpenses({ familyId: family.id, monthKey: month, categoryId, userId }),
    prisma.category.findMany({ where: { familyId: family.id }, orderBy: { name: "asc" } }),
    listFamilyMembers(family.id),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">הוצאות</h1>
        <p className="text-sm text-slate-500">סינון, עריכת קטגוריה ומחיקה רכה.</p>
      </header>

      {/* Filters (GET form) */}
      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-slate-500">חודש</span>
            <input
              type="month"
              name="month"
              defaultValue={month}
              className="rounded-lg border border-slate-200 px-3 py-1.5"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-slate-500">קטגוריה</span>
            <select
              name="categoryId"
              defaultValue={categoryId ?? ""}
              className="rounded-lg border border-slate-200 px-3 py-1.5"
            >
              <option value="">הכל</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-slate-500">משתמש</span>
            <select
              name="userId"
              defaultValue={userId ?? ""}
              className="rounded-lg border border-slate-200 px-3 py-1.5"
            >
              <option value="">הכל</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name ?? m.phone}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            סנן
          </button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">תאריך</th>
              <th className="px-4 py-3 font-medium">משתמש</th>
              <th className="px-4 py-3 font-medium">עסק</th>
              <th className="px-4 py-3 font-medium">סכום</th>
              <th className="px-4 py-3 font-medium">קטגוריה</th>
              <th className="px-4 py-3 font-medium">מקור</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.length === 0 ? (
              <EmptyRow message="אין הוצאות לחודש / לסינון שנבחר." cols={8} />
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{formatDateHe(e.expenseDate)}</td>
                  <td className="px-4 py-3 text-slate-600">{e.user?.name ?? e.user?.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-800">{e.merchantName ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(e.amount, e.currency)}</td>
                  <td className="px-4 py-3">
                    <form action={updateExpenseCategoryAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={e.id} />
                      <select
                        name="categoryId"
                        defaultValue={e.categoryId ?? ""}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="">— ללא —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                      >
                        שמור
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3"><SourceBadge source={e.sourceType} /></td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-4 py-3">
                    <form action={deleteExpenseAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100"
                      >
                        מחק
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
