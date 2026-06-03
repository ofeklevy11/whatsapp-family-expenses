import { formatCurrency } from "@/lib/format";
import type { AmountBucket } from "@/server/services/report.service";

const BAR_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
];

export function CategoryBars({
  buckets,
  currency,
}: {
  buckets: AmountBucket[];
  currency: string;
}) {
  if (buckets.length === 0) {
    return <p className="text-sm text-slate-400">אין נתונים להצגה.</p>;
  }

  const max = Math.max(...buckets.map((b) => b.amount), 1);

  return (
    <div className="flex flex-col gap-3">
      {buckets.slice(0, 8).map((bucket, i) => (
        <div key={bucket.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-600">{bucket.label}</span>
            <span className="font-medium text-slate-800">
              {formatCurrency(bucket.amount, currency)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
              style={{ width: `${(bucket.amount / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
