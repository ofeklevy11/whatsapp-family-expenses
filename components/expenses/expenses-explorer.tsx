"use client";

import { useMemo, useState } from "react";
import { ExpenseStatus, ExpenseSource } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { StatusBadge, SourceBadge } from "@/components/ui/badge";
import { ExpenseFilterBar } from "@/components/filters/expense-filter-bar";
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
import { downloadExcel, downloadPdf, rangeLabelFor } from "@/lib/export";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import {
  deleteExpenseAction,
  updateExpenseCategoryAction,
} from "@/app/(dashboard)/expenses/actions";

export function ExpensesExplorer({
  rows,
  options,
  currency,
}: {
  rows: ExpenseRow[];
  options: FilterOptions;
  currency: string;
}) {
  // Expenses default to "all time" so nothing is hidden unexpectedly.
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    preset: "all",
  });

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const summary = useMemo(() => summarize(filtered), [filtered]);

  const exportMeta = {
    currency,
    rangeLabel: rangeLabelFor(filters.preset, filters.from, filters.to, filters.month),
  };

  return (
    <div className="space-y-5">
      {/* Toolbar: add expense + export the current (filtered) view */}
      <div className="flex flex-wrap items-center gap-2">
        <AddExpenseDialog options={options} currency={currency} />
        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadExcel(filtered, exportMeta)}
            disabled={filtered.length === 0}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            ⬇ Excel
          </button>
          <button
            type="button"
            onClick={() => downloadPdf(filtered, exportMeta)}
            disabled={filtered.length === 0}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            ⬇ PDF
          </button>
        </div>
      </div>

      <ExpenseFilterBar filters={filters} options={options} onChange={setFilters} />

      <div className="flex flex-wrap items-center gap-4 px-1 text-sm text-slate-600">
        <span>
          <strong className="text-slate-900">{filtered.length}</strong> הוצאות
        </span>
        <span>
          סה״כ{" "}
          <strong className="text-slate-900">
            {formatCurrency(summary.total, currency)}
          </strong>
        </span>
        <span>
          ממוצע{" "}
          <strong className="text-slate-900">
            {formatCurrency(summary.average, currency)}
          </strong>
        </span>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">תאריך</th>
              <th className="px-4 py-3 font-medium">בן משפחה</th>
              <th className="px-4 py-3 font-medium">עסק</th>
              <th className="px-4 py-3 font-medium">סכום</th>
              <th className="px-4 py-3 font-medium">קטגוריה</th>
              <th className="px-4 py-3 font-medium">מקור</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                  אין הוצאות התואמות לפילטרים.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">
                    {formatDateHe(new Date(e.expenseDate))}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{e.userName}</td>
                  <td className="px-4 py-3 text-slate-800">{e.merchantName ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(e.amount, currency)}
                  </td>
                  <td className="px-4 py-3">
                    <form action={updateExpenseCategoryAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={e.id} />
                      <select
                        name="categoryId"
                        defaultValue={e.categoryId ?? ""}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="">— ללא —</option>
                        {options.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
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
                  <td className="px-4 py-3">
                    <SourceBadge source={e.sourceType as ExpenseSource} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status as ExpenseStatus} />
                  </td>
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
