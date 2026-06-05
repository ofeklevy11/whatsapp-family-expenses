"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Bucket, ChartType, Metric } from "@/lib/analytics";

const COLORS = [
  "#16a34a",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#84cc16",
  "#f97316",
  "#06b6d4",
  "#a855f7",
];

export function ChartView({
  buckets,
  type,
  metric,
  currency,
}: {
  buckets: Bucket[];
  type: ChartType;
  metric: Metric;
  currency: string;
}) {
  if (buckets.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center text-sm text-slate-400">
        אין נתונים לתצוגה — נסה לשנות את הפילטרים.
      </div>
    );
  }

  // Map to the value being plotted + a display field.
  const data = buckets.map((b) => ({
    name: b.label,
    value: metric === "amount" ? b.amount : b.count,
  }));

  const fmt = (v: number) =>
    metric === "amount" ? formatCurrency(v, currency) : `${formatNumber(v)} פריטים`;

  const tooltip = (
    <Tooltip
      formatter={(v: number) => [fmt(v), metric === "amount" ? "סכום" : "כמות"]}
      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
    />
  );

  return (
    <div className="h-[420px] w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );

  function renderChart() {
    switch (type) {
      case "pie":
      case "donut":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={150}
              innerRadius={type === "donut" ? 80 : 0}
              paddingAngle={2}
              label={(e) => e.name}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            {tooltip}
            <Legend />
          </PieChart>
        );

      case "line":
        return (
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={70} />
            {tooltip}
            <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.4} />
                <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={70} />
            {tooltip}
            <Area type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2.5} fill="url(#areaFill)" />
          </AreaChart>
        );

      case "hbar":
        return (
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
            {tooltip}
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        );

      case "bar":
      default:
        return (
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={70} />
            {tooltip}
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        );
    }
  }
}
