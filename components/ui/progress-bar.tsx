import { clamp } from "@/lib/utils";

export function ProgressBar({ ratio }: { ratio: number }) {
  const pct = clamp(ratio * 100, 0, 100);
  const color =
    ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
