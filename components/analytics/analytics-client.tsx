"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Eyebrow, SectionCard, CatIcon, Avatar } from "@/components/ds/primitives";
import { Select, Segmented } from "@/components/ds/controls";
import { Donut, AreaChart, Bars, HBars } from "@/components/ds/charts";
import {
  type ExpenseRow,
  type Dimension,
  aggregate,
} from "@/lib/analytics";
import {
  categoryMeta,
  memberColor,
  sourceMeta,
  shekel,
  fmt0,
  compact,
  monthShort,
  monthLabel,
  CAT_PALETTE,
} from "@/lib/category-meta";
import { getCurrentMonthKey } from "@/lib/dates";

const MONTH_RE = /^\d{4}-\d{2}$/;

interface ApiResponse {
  family: { id: string; name: string; currency: string } | null;
  currency: string;
  rows: ExpenseRow[];
  categories: { id: string; name: string }[];
  members: { id: string; name: string }[];
  paymentMethods: string[];
  sources: string[];
}

const ymOf = (iso: string) => iso.slice(0, 7);

/** Last `n` month keys ending at `monthKey` (oldest→newest). */
function lastMonths(monthKey: string, n: number): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

type Metric = "amount" | "count";
type Scope = "month" | "3m" | "6m";

export function AnalyticsClient() {
  const params = useSearchParams();
  const monthKey = params.get("month") && MONTH_RE.test(params.get("month")!) ? params.get("month")! : getCurrentMonthKey();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metric, setMetric] = useState<Metric>("amount");
  const [scope, setScope] = useState<Scope>("6m");
  const [dim, setDim] = useState<Dimension>("category");
  const [chartType, setChartType] = useState<"bars" | "donut">("bars");

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
  const allRows = useMemo(() => data?.rows ?? [], [data]);

  const scopeMonths = useMemo(() => {
    if (scope === "month") return [monthKey];
    return lastMonths(monthKey, scope === "3m" ? 3 : 6);
  }, [scope, monthKey]);

  const rows = useMemo(() => allRows.filter((r) => scopeMonths.includes(ymOf(r.expenseDate))), [allRows, scopeMonths]);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const valFmt = (v: number) => (metric === "amount" ? shekel(v, false, currency) : fmt0(v));

  // 6-month trend (always full window for context)
  const trendMonths = lastMonths(monthKey, 6);
  const trend = trendMonths.map((ym) => {
    const mr = allRows.filter((r) => ymOf(r.expenseDate) === ym);
    return { label: monthShort(ym), value: metric === "amount" ? Math.round(mr.reduce((s, r) => s + r.amount, 0)) : mr.length, ym };
  });
  const monthBars = trend.map((t) => ({ label: t.label, value: t.value, highlight: t.ym === monthKey }));

  // dimension breakdown
  const colorFor = (dimension: Dimension, label: string, idx: number) => {
    if (dimension === "category") return categoryMeta(label).color;
    if (dimension === "user") return memberColor(label);
    return CAT_PALETTE[idx % CAT_PALETTE.length];
  };
  const dimLabelFor = (label: string) =>
    dim === "source" ? sourceMeta(label).label : label;

  const grouped = aggregate(rows, dim);
  const explorerData = grouped.slice(0, 8).map((g, i) => ({
    label: dimLabelFor(g.label),
    value: metric === "amount" ? g.amount : g.count,
    amount: g.amount,
    count: g.count,
    color: colorFor(dim, g.label, i),
    dot: true,
  }));
  const explorerTotal = explorerData.reduce((s, d) => s + d.value, 0) || 1;

  // by member
  const byMember = aggregate(rows, "user");
  const memberTotal = byMember.reduce((s, m) => s + m.amount, 0) || 1;

  // top merchants
  const topMerch = aggregate(rows, "merchant")
    .slice(0, 6)
    .map((m) => ({ label: m.label, value: m.amount, count: m.count, color: "var(--accent-400)" }));

  // category donut
  const byCat = aggregate(rows, "category");
  const donutData = byCat.slice(0, 7).map((c) => ({ label: c.label, amount: c.amount, color: categoryMeta(c.label).color }));

  const dimLabel: Record<Dimension, string> = {
    category: "קטגוריה",
    user: "בן משפחה",
    merchant: "בית עסק",
    paymentMethod: "אמצעי תשלום",
    source: "מקור",
    month: "חודש",
    weekday: "יום בשבוע",
  };

  if (loading) return <p style={{ fontSize: 13, color: "var(--fg-3)" }}>טוען נתונים…</p>;
  if (error) return <p style={{ fontSize: 13, color: "var(--fg-danger)" }}>{error}</p>;
  if (!data?.family) {
    return (
      <Card padding={32} style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--fg-3)" }}>עדיין אין משפחה / נתונים להצגה.</p>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Eyebrow>אנליטיקה</Eyebrow>
          <h1 style={{ fontSize: 28, marginTop: 7 }}>ניתוח הוצאות</h1>
          <p style={{ color: "var(--fg-3)", fontSize: 13.5, marginTop: 6 }}>
            {shekel(total, false, currency)} · {fmt0(rows.length)} עסקאות · {scopeMonths.length === 1 ? monthLabel(monthKey) : `${scopeMonths.length} חודשים`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Segmented
            value={metric}
            onChange={setMetric}
            options={[
              { value: "amount", label: "סכום", icon: "banknote" },
              { value: "count", label: "כמות", icon: "hash" },
            ]}
          />
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { value: "month", label: "החודש" },
              { value: "3m", label: "3 ח׳" },
              { value: "6m", label: "6 ח׳" },
            ]}
          />
        </div>
      </div>

      {/* trend + month comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <SectionCard title="מגמת הוצאות לאורך זמן" sub={`6 חודשים · ${metric === "amount" ? "₪" : "מספר עסקאות"}`} pad="16px 14px 8px">
          <AreaChart points={trend} height={220} id="an-trend" valueFmt={valFmt} />
        </SectionCard>
        <SectionCard title="השוואת חודשים" sub="סך הוצאות לכל חודש" pad="16px 14px 8px">
          <Bars data={monthBars} height={220} valueFmt={(v) => (metric === "amount" ? compact(v) : fmt0(v))} />
        </SectionCard>
      </div>

      {/* interactive explorer */}
      <SectionCard
        title="פילוח לפי מימד"
        sub={`${dimLabel[dim]} · ${valFmt(explorerTotal)}`}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Select
              value={dim}
              onChange={(v) => setDim(v as Dimension)}
              options={[
                { value: "category", label: "קטגוריה" },
                { value: "user", label: "בן משפחה" },
                { value: "merchant", label: "בית עסק" },
                { value: "paymentMethod", label: "אמצעי תשלום" },
                { value: "source", label: "מקור" },
                { value: "weekday", label: "יום בשבוע" },
              ]}
            />
            <Segmented
              value={chartType}
              onChange={setChartType}
              options={[
                { value: "bars", label: "", icon: "bar-chart-3" },
                { value: "donut", label: "", icon: "chart-pie" },
              ]}
            />
          </div>
        }
      >
        {chartType === "bars" ? (
          <HBars data={explorerData} showCount valueFmt={valFmt} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap", justifyContent: "center" }}>
            <Donut
              data={explorerData.map((d) => ({ label: d.label, amount: d.value, color: d.color }))}
              size={230}
              thickness={30}
              centerTop="סה״כ"
              centerMain={metric === "amount" ? compact(explorerTotal) : fmt0(explorerTotal)}
              centerSub={dimLabel[dim]}
              fmt={valFmt}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 28px", flex: 1, minWidth: 280 }}>
              {explorerData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg-1)", minWidth: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
                  </span>
                  <span className="num" style={{ color: "var(--fg-0)", fontWeight: 600 }}>{Math.round((d.value / explorerTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* by member + top merchants */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <SectionCard title="פילוח לפי בן משפחה" sub="מי הוציא כמה">
          {byMember.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--fg-3)" }}>אין נתונים</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
                {byMember.map((m, i) => (
                  <div key={i} title={`${m.label}: ${shekel(m.amount, false, currency)}`} style={{ width: `${(m.amount / memberTotal) * 100}%`, background: memberColor(m.label), transition: "width 600ms var(--ease-out-expo)" }} />
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {byMember.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={m.label} color={memberColor(m.label)} size={30} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                        <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>{m.label}</span>
                        <span className="num" style={{ color: "var(--fg-0)", fontWeight: 600 }}>{shekel(m.amount, false, currency)}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>{m.count} עסקאות · {Math.round((m.amount / memberTotal) * 100)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="בתי עסק מובילים" sub="לפי סכום מצטבר">
          {topMerch.length === 0 ? <p style={{ fontSize: 13, color: "var(--fg-3)" }}>אין נתונים</p> : <HBars data={topMerch} showCount valueFmt={(v) => shekel(v, false, currency)} />}
        </SectionCard>
      </div>

      {/* full category breakdown */}
      <SectionCard title="פילוח מלא לפי קטגוריה" sub={`${byCat.length} קטגוריות`}>
        {byCat.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--fg-3)" }}>אין נתונים</p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap", justifyContent: "center" }}>
            <Donut data={donutData} size={210} thickness={28} centerTop="סה״כ" centerMain={compact(total)} centerSub="₪" fmt={(v) => shekel(v, false, currency)} />
            <div style={{ flex: 1, minWidth: 320, display: "flex", flexDirection: "column", gap: 13 }}>
              {byCat.slice(0, 8).map((c, i) => {
                const meta = categoryMeta(c.label);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <CatIcon icon={meta.icon} color={meta.color} size={30} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                        <span style={{ color: "var(--fg-1)", fontWeight: 500 }}>{c.label}</span>
                        <span className="num" style={{ color: "var(--fg-0)", fontWeight: 600 }}>{shekel(c.amount, false, currency)}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: "var(--glass-3)", marginTop: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(c.amount / byCat[0].amount) * 100}%`, background: meta.color, borderRadius: 999, transition: "width 600ms var(--ease-out-expo)" }} />
                      </div>
                    </div>
                    <span className="num" style={{ color: "var(--fg-3)", fontSize: 12, width: 38, textAlign: "left" }}>{total ? Math.round((c.amount / total) * 100) : 0}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
