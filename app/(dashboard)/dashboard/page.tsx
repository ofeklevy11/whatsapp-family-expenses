import { getPrimaryFamily } from "@/server/services/family.service";
import { getMonthlyReport } from "@/server/services/report.service";
import { getBudgetStatus } from "@/server/services/budget.service";
import { listExpenses } from "@/server/services/expense.service";
import { getCurrentMonthKey, formatMonthNameHe, formatDateHe } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { NoFamilyState } from "@/components/ui/empty-state";
import { CategoryBars } from "@/components/dashboard/category-bars";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const monthKey = getCurrentMonthKey();
  const [report, budget, recent] = await Promise.all([
    getMonthlyReport(family.id, monthKey),
    getBudgetStatus(family.id, monthKey),
    listExpenses({ familyId: family.id, monthKey, take: 8 }),
  ]);

  const remaining = budget.overall.remaining;
  const currency = family.currency;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">סקירה כללית</h1>
        <p className="text-sm text-slate-500">
          {family.name} · {formatMonthNameHe(monthKey)}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="סה״כ הוצאות החודש"
          value={formatCurrency(report.totalAmount, currency)}
        />
        <StatCard title="מספר הוצאות" value={String(report.totalExpensesCount)} />
        <StatCard
          title="תקציב חודשי"
          value={budget.overall.limit !== null ? formatCurrency(budget.overall.limit, currency) : "—"}
          hint={budget.overall.limit === null ? 'הגדר עם "קבע תקציב חודשי"' : undefined}
        />
        <StatCard
          title="נשאר בתקציב"
          value={remaining !== null ? formatCurrency(remaining, currency) : "—"}
          tone={remaining !== null && remaining < 0 ? "danger" : "good"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>קטגוריות מובילות</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBars buckets={report.byCategory} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>תובנות</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              {report.insights.map((insight, i) => (
                <li key={i} className="flex gap-2">
                  <span>💡</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>הוצאות אחרונות</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {recent.length === 0 ? (
            <p className="px-5 text-sm text-slate-400">עדיין אין הוצאות.</p>
          ) : (
            <table className="w-full text-right text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-2 font-medium">תאריך</th>
                  <th className="px-5 py-2 font-medium">עסק</th>
                  <th className="px-5 py-2 font-medium">קטגוריה</th>
                  <th className="px-5 py-2 font-medium">סכום</th>
                  <th className="px-5 py-2 font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-3 text-slate-500">{formatDateHe(e.expenseDate)}</td>
                    <td className="px-5 py-3 text-slate-800">{e.merchantName ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{e.category?.name ?? "אחר"}</td>
                    <td className="px-5 py-3 font-medium">{formatCurrency(e.amount, e.currency)}</td>
                    <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
