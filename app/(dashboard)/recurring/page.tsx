import { getPrimaryFamily } from "@/server/services/family.service";
import { getRecurringReport } from "@/server/services/recurring.service";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { NoFamilyState, EmptyRow } from "@/components/ui/empty-state";
import type { RecurringFrequency } from "@prisma/client";

export const dynamic = "force-dynamic";

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  WEEKLY: "שבועי",
  MONTHLY: "חודשי",
  YEARLY: "שנתי",
};

export default async function RecurringPage() {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const report = await getRecurringReport(family.id);
  const currency = family.currency;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">הוצאות קבועות</h1>
        <p className="text-sm text-slate-500">
          זוהו אוטומטית לפי חיובים חוזרים מאותו עסק.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="סה״כ קבועים (חודשי)"
          value={formatCurrency(report.totalMonthly, currency)}
        />
        <StatCard title="מספר הוצאות קבועות" value={String(report.items.length)} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>רשימת הוצאות קבועות</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">עסק</th>
                <th className="px-4 py-3 font-medium">תדירות</th>
                <th className="px-4 py-3 font-medium">סכום משוער</th>
                <th className="px-4 py-3 font-medium">חודשי משוער</th>
                <th className="px-4 py-3 font-medium">קטגוריה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.items.length === 0 ? (
                <EmptyRow
                  message="עדיין לא זוהו הוצאות קבועות (נדרשים לפחות 3 חיובים דומים)."
                  cols={5}
                />
              ) : (
                report.items.map((item) => (
                  <tr key={item.merchantName}>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.merchantName}</td>
                    <td className="px-4 py-3 text-slate-600">{FREQUENCY_LABELS[item.frequency]}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(item.estimatedAmount, currency)}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(item.monthlyEquivalent, currency)}</td>
                    <td className="px-4 py-3 text-slate-500">{item.categoryName ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
