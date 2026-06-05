"use client";

import { Card } from "@/components/ui/card";
import { MultiSelect } from "./multi-select";
import { cn } from "@/lib/utils";
import {
  type FilterState,
  type FilterOptions,
  DATE_PRESETS,
  DEFAULT_FILTERS,
  SOURCE_LABELS,
  STATUS_LABELS,
  activeFilterCount,
} from "@/lib/analytics";

const STATUS_OPTIONS = [
  { value: "CONFIRMED", label: STATUS_LABELS.CONFIRMED },
  { value: "NEEDS_REVIEW", label: STATUS_LABELS.NEEDS_REVIEW },
];

export function ExpenseFilterBar({
  filters,
  options,
  onChange,
}: {
  filters: FilterState;
  options: FilterOptions;
  onChange: (next: FilterState) => void;
}) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const active = activeFilterCount(filters);

  return (
    <Card className="space-y-4 p-4">
      {/* Date presets */}
      <div className="flex flex-wrap items-center gap-2">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => set("preset", p.value)}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition",
              filters.preset === p.value
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {p.label}
          </button>
        ))}
        {filters.preset === "month" && (
          <input
            type="month"
            value={filters.month ?? ""}
            onChange={(e) => set("month", e.target.value || null)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
          />
        )}
        {filters.preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => set("from", e.target.value || null)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
            />
            <span className="text-slate-400">–</span>
            <input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => set("to", e.target.value || null)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
            />
          </div>
        )}
      </div>

      {/* Row of dropdown + text filters */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <div className="col-span-2 flex items-center gap-1 md:col-span-1">
          <select
            value={filters.searchField}
            onChange={(e) => set("searchField", e.target.value as FilterState["searchField"])}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-600"
            title="היכן לחפש"
          >
            <option value="all">הכל</option>
            <option value="merchant">שם עסק</option>
          </select>
          <input
            type="search"
            placeholder={
              filters.searchField === "merchant" ? "🔍 שם בית עסק…" : "🔍 חיפוש חופשי…"
            }
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>

        <MultiSelect
          label="קטגוריות"
          options={options.categories.map((c) => ({ value: c.id, label: c.name }))}
          selected={filters.categoryIds}
          onChange={(v) => set("categoryIds", v)}
        />
        <MultiSelect
          label="בני משפחה"
          options={options.members.map((m) => ({ value: m.id, label: m.name }))}
          selected={filters.userIds}
          onChange={(v) => set("userIds", v)}
        />
        <MultiSelect
          label="אמצעי תשלום"
          options={options.paymentMethods.map((p) => ({ value: p, label: p }))}
          selected={filters.paymentMethods}
          onChange={(v) => set("paymentMethods", v)}
        />
        <MultiSelect
          label="מקור"
          options={options.sources.map((s) => ({
            value: s,
            label: SOURCE_LABELS[s] ?? s,
          }))}
          selected={filters.sources}
          onChange={(v) => set("sources", v)}
        />
        <MultiSelect
          label="סטטוס"
          options={STATUS_OPTIONS}
          selected={filters.statuses}
          onChange={(v) => set("statuses", v)}
        />

        {/* Amount range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            placeholder="₪ מ-"
            value={filters.amountMin ?? ""}
            onChange={(e) =>
              set("amountMin", e.target.value === "" ? null : Number(e.target.value))
            }
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="עד"
            value={filters.amountMax ?? ""}
            onChange={(e) =>
              set("amountMax", e.target.value === "" ? null : Number(e.target.value))
            }
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </div>

        {/* Recurring */}
        <select
          value={filters.recurring}
          onChange={(e) => set("recurring", e.target.value as FilterState["recurring"])}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
        >
          <option value="all">קבועות + רגילות</option>
          <option value="yes">קבועות בלבד</option>
          <option value="no">רגילות בלבד</option>
        </select>
      </div>

      {active > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">{active} פילטרים פעילים</span>
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            נקה הכל ✕
          </button>
        </div>
      )}
    </Card>
  );
}
