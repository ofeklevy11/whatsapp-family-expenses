import { getPrimaryFamily } from "@/server/services/family.service";
import { getOverviewData } from "@/server/services/overview.service";
import { getCurrentMonthKey } from "@/lib/dates";
import { shekel, fmt0, monthLabel, monthShort, dateHe } from "@/lib/category-meta";
import { Card, Eyebrow, Badge, Avatar, CatIcon, ButtonLink, type BadgeTone } from "@/components/ds/primitives";
import { Icon } from "@/components/ds/icon";
import { Donut, AreaChart, HBars, Sparkline } from "@/components/ds/charts";
import { ExportButtons } from "@/components/expenses/export-buttons";
import { NoFamilyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

function KpiCard({
  label,
  value,
  sub,
  delta,
  deltaTone,
  spark,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: string | null;
  deltaTone?: BadgeTone;
  spark?: number[];
  icon: string;
  accent?: boolean;
}) {
  return (
    <Card
      padding={18}
      style={
        accent
          ? {
              background:
                "linear-gradient(150deg, color-mix(in oklab, var(--accent-400) 22%, var(--glass-2)), var(--glass-2))",
              borderColor: "color-mix(in oklab, var(--accent-400) 30%, var(--border))",
            }
          : {}
      }
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: accent ? "color-mix(in oklab, var(--accent-400) 22%, transparent)" : "var(--glass-3)",
              border: "1px solid var(--border)",
              display: "grid",
              placeItems: "center",
              color: accent ? "var(--accent-400)" : "var(--fg-2)",
            }}
          >
            <Icon name={icon} size={16} />
          </div>
          <Eyebrow>{label}</Eyebrow>
        </div>
        {delta != null && (
          <Badge tone={deltaTone ?? "neutral"} ltr>
            {delta}
          </Badge>
        )}
      </div>
      <div className="num" style={{ fontSize: 30, color: "var(--fg-0)", fontWeight: 600, marginTop: 14, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{sub}</div>
        {spark && spark.length > 1 && <Sparkline data={spark} width={96} height={30} id={label} />}
      </div>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const sp = await searchParams;
  const monthKey = sp.month && MONTH_RE.test(sp.month) ? sp.month : getCurrentMonthKey();

  const d = await getOverviewData(family.id, monthKey);
  const cur = d.currency;

  // donut: top 6 categories + "אחר"
  const donutData = d.byCategory.slice(0, 6).map((c) => ({ label: c.label, amount: c.amount, color: c.color }));
  if (d.byCategory.length > 6) {
    const rest = d.byCategory.slice(6).reduce((s, c) => s + c.amount, 0);
    donutData.push({ label: "אחר", amount: rest, color: "var(--glass-4)" });
  }

  const rangeLabel = monthLabel(monthKey);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }} className="fade-up">
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <Eyebrow>סקירה כללית</Eyebrow>
          <h1 style={{ fontSize: 28, lineHeight: 1.1 }}>שלום, {family.name}</h1>
          <p style={{ color: "var(--fg-3)", fontSize: 13.5 }}>סיכום הפעילות הפיננסית · {rangeLabel}</p>
        </div>
        <ExportButtons rows={d.monthRows} rangeLabel={rangeLabel} currency={cur} />
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard
          accent
          label="סה״כ החודש"
          value={shekel(d.total, false, cur)}
          icon="wallet"
          delta={d.deltaPct != null ? (d.deltaPct >= 0 ? `+${d.deltaPct}%` : `${d.deltaPct}%`) : null}
          deltaTone={d.deltaPct != null ? (d.deltaPct > 0 ? "danger" : "success") : "neutral"}
          sub={d.prevTotal ? `${shekel(d.prevTotal, false, cur)} בחודש הקודם` : "—"}
          spark={d.trend.map((t) => t.value)}
        />
        <KpiCard label="מספר הוצאות" value={fmt0(d.count)} icon="receipt" sub={`${d.merchants} בתי עסק שונים`} />
        <KpiCard label="ממוצע לעסקה" value={shekel(d.average, false, cur)} icon="divide" sub={`הגדולה: ${shekel(d.largest, false, cur)}`} />
        <KpiCard label="הוצאות קבועות" value={shekel(d.recurring.monthlyTotal, false, cur)} icon="repeat" sub={`${d.recurring.count} פעילות · לחודש`} />
      </div>

      {/* trend + donut */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
        <Card padding={0}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>מגמת הוצאות</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>6 חודשים אחרונים · ₪</div>
            </div>
            <ButtonLink href="/analytics" variant="ghost" size="sm" iconRight="arrow-left">
              לאנליטיקה
            </ButtonLink>
          </div>
          <div style={{ padding: "16px 14px 8px" }}>
            <AreaChart points={d.trend} height={210} id="ov-trend" valueFmt={(v) => shekel(v, false, cur)} />
          </div>
        </Card>

        <Card padding={0}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>פילוח לפי קטגוריה</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{d.byCategory.length} קטגוריות פעילות</div>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            {donutData.length ? (
              <>
                <Donut
                  data={donutData}
                  size={188}
                  thickness={24}
                  centerTop="סה״כ"
                  centerMain={shekel(d.total, false, cur)}
                  centerSub={monthShort(monthKey)}
                  fmt={(v) => shekel(v, false, cur)}
                />
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9 }}>
                  {donutData.slice(0, 5).map((dd, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg-1)", minWidth: 0 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: dd.color, flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dd.label}</span>
                      </span>
                      <span className="num" style={{ color: "var(--fg-2)" }}>{d.total ? Math.round((dd.amount / d.total) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: "32px 0", color: "var(--fg-3)", fontSize: 13 }}>אין נתונים לחודש זה</div>
            )}
          </div>
        </Card>
      </div>

      {/* top merchants + recent */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        <Card padding={0}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>בתי עסק מובילים</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>לפי סכום · {rangeLabel}</div>
          </div>
          <div style={{ padding: 22 }}>
            {d.topMerchants.length ? (
              <HBars
                data={d.topMerchants.map((m) => ({ label: m.label, value: m.amount, count: m.count, color: "var(--accent-400)" }))}
                showCount
                valueFmt={(v) => shekel(v, false, cur)}
              />
            ) : (
              <div style={{ padding: "28px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>אין נתונים</div>
            )}
          </div>
        </Card>

        <Card padding={0}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>הוצאות אחרונות</div>
            <ButtonLink href="/expenses" variant="ghost" size="sm" iconRight="arrow-left">
              הכל
            </ButtonLink>
          </div>
          <div>
            {d.recent.length === 0 && (
              <div style={{ padding: "28px 22px", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>אין הוצאות עדיין</div>
            )}
            {d.recent.map((e, i) => (
              <div
                key={e.id}
                className="noc-row"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderBottom: i < d.recent.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
              >
                <CatIcon icon={e.categoryIcon} color={e.categoryColor} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-0)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.merchant}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{e.categoryName} · {dateHe(e.date)}</div>
                </div>
                <Avatar name={e.userName} color={e.userColor} size={24} />
                <div className="num" style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>{shekel(e.amount, true, cur)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI insights */}
      <Card padding={0}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Icon name="sparkles" size={16} color="var(--accent-400)" />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>תובנות AI</div>
          <Badge tone="accent" style={{ marginInlineStart: "auto" }}>אוטומטי</Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, d.insights.length)}, 1fr)` }}>
          {d.insights.map((ins, i) => (
            <div key={i} style={{ display: "flex", gap: 11, padding: "16px 22px", borderInlineEnd: i < d.insights.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--glass-3)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--accent-400)", flexShrink: 0 }}>
                <Icon name={ins.icon} size={15} />
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>{ins.text}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
