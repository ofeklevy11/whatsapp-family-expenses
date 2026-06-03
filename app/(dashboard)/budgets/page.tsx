import { prisma } from "@/lib/db/prisma";
import { getPrimaryFamily } from "@/server/services/family.service";
import { getBudgetStatus } from "@/server/services/budget.service";
import { getCurrentMonthKey, formatMonthNameHe } from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { NoFamilyState } from "@/components/ui/empty-state";
import { setOverallBudgetAction, setCategoryBudgetAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const monthKey = getCurrentMonthKey();
  const [status, categories] = await Promise.all([
    getBudgetStatus(family.id, monthKey),
    prisma.category.findMany({ where: { familyId: family.id }, orderBy: { name: "asc" } }),
  ]);
  const currency = family.currency;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">תקציבים</h1>
        <p className="text-sm text-slate-500">{formatMonthNameHe(monthKey)}</p>
      </header>

      {/* Overall budget */}
      <Card>
        <CardHeader>
          <CardTitle>תקציב חודשי כללי</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.overall.limit !== null ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  נוצלו {formatCurrency(status.overall.spent, currency)} מתוך{" "}
                  {formatCurrency(status.overall.limit, currency)}
                </span>
                <span className="font-medium">
                  {status.overall.ratio !== null ? formatPercent(status.overall.ratio) : "—"}
                </span>
              </div>
              <ProgressBar ratio={status.overall.ratio ?? 0} />
              <p className="text-sm text-slate-500">
                נשאר: {formatCurrency(status.overall.remaining ?? 0, currency)}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">לא הוגדר תקציב חודשי עדיין.</p>
          )}

          <form action={setOverallBudgetAction} className="flex items-end gap-2 pt-2">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-slate-500">קביעת תקציב חודשי</span>
              <input
                type="number"
                name="amount"
                min={1}
                step="any"
                placeholder="12000"
                className="rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              שמור
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Category budgets */}
      <Card>
        <CardHeader>
          <CardTitle>תקציב לפי קטגוריה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {status.categories.length === 0 ? (
            <p className="text-sm text-slate-400">לא הוגדרו תקציבי קטגוריות לחודש זה.</p>
          ) : (
            status.categories.map((c) => (
              <div key={c.categoryId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-700">{c.categoryName}</span>
                  <span className="text-slate-500">
                    {formatCurrency(c.spent, currency)} / {formatCurrency(c.limit, currency)} ·{" "}
                    {formatPercent(c.ratio)}
                  </span>
                </div>
                <ProgressBar ratio={c.ratio} />
              </div>
            ))
          )}

          <form action={setCategoryBudgetAction} className="flex flex-wrap items-end gap-2 pt-2">
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-slate-500">קטגוריה</span>
              <select
                name="categoryName"
                className="rounded-lg border border-slate-200 px-3 py-1.5"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              <span className="mb-1 text-slate-500">תקציב</span>
              <input
                type="number"
                name="amount"
                min={1}
                step="any"
                placeholder="3500"
                className="rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              הוסף תקציב
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
