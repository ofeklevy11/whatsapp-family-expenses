"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChartView } from "@/components/charts/chart-view";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type ExpenseRow,
  type Dimension,
  type Metric,
  type ChartType,
  DIMENSIONS,
  aggregate,
  summarize,
} from "@/lib/analytics";

const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: "bar", label: "עמודות", icon: "📊" },
  { value: "hbar", label: "אופקי", icon: "📶" },
  { value: "pie", label: "עוגה", icon: "🥧" },
  { value: "donut", label: "טבעת", icon: "🍩" },
  { value: "line", label: "קו", icon: "📈" },
  { value: "area", label: "שטח", icon: "🏔️" },
];

/**
 * A self-contained chart panel: its own chart-type, group-by dimension and
 * metric, sharing the page-level filtered rows. Two of these sit side by side.
 */
export function ChartPanel({
  rows,
  currency,
  defaultType,
  defaultDimension = "category",
  defaultMetric = "amount",
}: {
  rows: ExpenseRow[];
  currency: string;
  defaultType: ChartType;
  defaultDimension?: Dimension;
  defaultMetric?: Metric;
}) {
  const [type, setType] = useState<ChartType>(defaultType);
  const [dimension, setDimension] = useState<Dimension>(defaultDimension);
  const [metric, setMetric] = useState<Metric>(defaultMetric);

  const buckets = useMemo(() => aggregate(rows, dimension), [rows, dimension]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const topShare =
    summary.total > 0 && buckets[0] ? buckets[0].amount / summary.total : 0;

  return (
    <Card className="flex flex-col">
      {/* Compact controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <select
          value={dimension}
          onChange={(e) => setDimension(e.target.value as Dimension)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
        >
          {DIMENSIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setMetric("amount")}
            className={cn(
              "px-2 py-1",
              metric === "amount" ? "bg-brand text-white" : "bg-white text-slate-600",
            )}
          >
            ₪
          </button>
          <button
            type="button"
            onClick={() => setMetric("count")}
            className={cn(
              "px-2 py-1",
              metric === "count" ? "bg-brand text-white" : "bg-white text-slate-600",
            )}
          >
            #
          </button>
        </div>

        <div className="ms-auto flex flex-wrap gap-1">
          {CHART_TYPES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setType(c.value)}
              title={c.label}
              className={cn(
                "rounded-lg px-2 py-1 text-sm transition",
                type === c.value
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {c.icon}
            </button>
          ))}
        </div>
      </div>

      <CardContent className="flex-1">
        <ChartView buckets={buckets} type={type} metric={metric} currency={currency} />
        {buckets.length > 0 && topShare >= 0.3 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            💡 “{buckets[0].label}” — {Math.round(topShare * 100)}% מההוצאות (
            {formatCurrency(buckets[0].amount, currency)}).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
