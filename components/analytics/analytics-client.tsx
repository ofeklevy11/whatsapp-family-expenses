"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ExpenseFilterBar } from "@/components/filters/expense-filter-bar";
import { ChartPanel } from "@/components/analytics/chart-panel";
import { formatCurrency } from "@/lib/format";
import { formatDateHe } from "@/lib/dates";
import {
  type ExpenseRow,
  type FilterOptions,
  type FilterState,
  DEFAULT_FILTERS,
  applyFilters,
  summarize,
} from "@/lib/analytics";

interface ApiResponse {
  family: { id: string; name: string; currency: string } | null;
  currency: string;
  rows: ExpenseRow[];
  categories: { id: string; name: string }[];
  members: { id: string; name: string }[];
  paymentMethods: string[];
  sources: string[];
}

export function AnalyticsClient() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((json: ApiResponse) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("שגיאה בטעינת הנתונים");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currency = data?.currency ?? "ILS";

  const options: FilterOptions = useMemo(
    () => ({
      categories: data?.categories ?? [],
      members: data?.members ?? [],
      paymentMethods: data?.paymentMethods ?? [],
      sources: data?.sources ?? [],
    }),
    [data],
  );

  const filtered = useMemo(
    () => (data ? applyFilters(data.rows, filters) : []),
    [data, filters],
  );
  const summary = useMemo(() => summarize(filtered), [filtered]);

  if (loading) {
    return <p className="text-sm text-slate-400">טוען נתונים…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }
  if (!data?.family) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        עדיין אין משפחה / נתונים להצגה.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <ExpenseFilterBar filters={filters} options={options} onChange={setFilters} />

      {/* KPI summary — reacts to filters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard title="סה״כ" value={formatCurrency(summary.total, currency)} />
        <StatCard title="מספר הוצאות" value={String(summary.count)} />
        <StatCard title="ממוצע להוצאה" value={formatCurrency(summary.average, currency)} />
        <StatCard title="ההוצאה הגדולה" value={formatCurrency(summary.largest, currency)} />
        <StatCard title="בתי עסק" value={String(summary.distinctMerchants)} />
      </div>

      {/* Two independent charts, side by side (half/half) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartPanel rows={filtered} currency={currency} defaultType="pie" />
        <ChartPanel rows={filtered} currency={currency} defaultType="bar" />
      </div>

      {/* Breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle>פירוט ({filtered.length} הוצאות)</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <p className="px-5 text-sm text-slate-400">אין הוצאות התואמות לפילטרים.</p>
          ) : (
            <table className="w-full text-right text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-2 font-medium">תאריך</th>
                  <th className="px-5 py-2 font-medium">עסק</th>
                  <th className="px-5 py-2 font-medium">קטגוריה</th>
                  <th className="px-5 py-2 font-medium">בן משפחה</th>
                  <th className="px-5 py-2 font-medium">סכום</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice(0, 50).map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-slate-500">
                      {formatDateHe(new Date(e.expenseDate))}
                    </td>
                    <td className="px-5 py-2.5 text-slate-800">{e.merchantName ?? "—"}</td>
                    <td className="px-5 py-2.5 text-slate-600">{e.categoryName}</td>
                    <td className="px-5 py-2.5 text-slate-600">{e.userName}</td>
                    <td className="px-5 py-2.5 font-medium">
                      {formatCurrency(e.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {filtered.length > 50 && (
            <p className="px-5 pt-3 text-xs text-slate-400">
              מוצגות 50 הראשונות מתוך {filtered.length}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
