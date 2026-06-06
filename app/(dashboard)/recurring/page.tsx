import type { RecurringFrequency } from "@prisma/client";
import { getPrimaryFamily } from "@/server/services/family.service";
import { getRecurringReport } from "@/server/services/recurring.service";
import { Card, Eyebrow, Badge, CatIcon, SectionCard, EmptyState } from "@/components/ds/primitives";
import { Donut, HBars } from "@/components/ds/charts";
import { NoFamilyState } from "@/components/ui/empty-state";
import { categoryMeta, shekel, compact } from "@/lib/category-meta";

export const dynamic = "force-dynamic";

const FREQ: Record<RecurringFrequency, string> = {
  WEEKLY: "שבועי",
  MONTHLY: "חודשי",
  YEARLY: "שנתי",
};

export default async function RecurringPage() {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const report = await getRecurringReport(family.id);
  const cur = family.currency;
  const items = report.items;
  const monthlyTotal = report.totalMonthly;

  // split by category (monthly equivalent)
  const catMap = new Map<string, number>();
  for (const it of items) {
    const name = it.categoryName ?? "אחר";
    catMap.set(name, (catMap.get(name) ?? 0) + it.monthlyEquivalent);
  }
  const byCat = [...catMap.entries()]
    .map(([label, amount]) => ({ label, amount, color: categoryMeta(label).color }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Eyebrow>הוצאות קבועות</Eyebrow>
          <h1 style={{ fontSize: 28, marginTop: 7 }}>מינויים והוראות קבע</h1>
          <p style={{ color: "var(--fg-3)", fontSize: 13.5, marginTop: 6 }}>זוהו אוטומטית לפי חיובים חוזרים מאותו עסק (3+ חיובים דומים)</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <Card padding={18} style={{ background: "linear-gradient(150deg, color-mix(in oklab, var(--accent-400) 20%, var(--glass-2)), var(--glass-2))", borderColor: "color-mix(in oklab, var(--accent-400) 28%, var(--border))" }}>
          <Eyebrow>סך חודשי</Eyebrow>
          <div className="num" style={{ fontSize: 30, fontWeight: 700, color: "var(--fg-0)", marginTop: 12 }}>{shekel(monthlyTotal, false, cur)}</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6 }}>{items.length} הוצאות קבועות</div>
        </Card>
        <Card padding={18}>
          <Eyebrow>תחזית שנתית</Eyebrow>
          <div className="num" style={{ fontSize: 30, fontWeight: 600, color: "var(--fg-0)", marginTop: 12 }}>{shekel(monthlyTotal * 12, false, cur)}</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6 }}>על בסיס הקבועות הנוכחיות</div>
        </Card>
        <Card padding={18}>
          <Eyebrow>החיוב הגדול ביותר</Eyebrow>
          <div className="num" style={{ fontSize: 30, fontWeight: 600, color: "var(--fg-0)", marginTop: 12 }}>{items[0] ? shekel(items[0].monthlyEquivalent, false, cur) : "—"}</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6 }}>{items[0] ? items[0].merchantName : "אין חיובים"}</div>
        </Card>
      </div>

      {items.length === 0 ? (
        <Card padding={0}>
          <EmptyState icon="repeat" title="עדיין לא זוהו הוצאות קבועות" hint="נדרשים לפחות 3 חיובים דומים מאותו בית עסק כדי לזהות הוצאה קבועה." />
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
          {/* list */}
          <Card padding={0}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border-subtle)", fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>כל ההוצאות הקבועות</div>
            {items.map((r, i) => {
              const meta = categoryMeta(r.categoryName);
              return (
                <div key={r.merchantName} className="noc-row" style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 22px", borderBottom: i < items.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                  <CatIcon icon={meta.icon} color={meta.color} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>{r.merchantName}</div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <span>{r.categoryName ?? "אחר"}</span>
                      <span style={{ color: "var(--fg-4)" }}>·</span>
                      <span>{FREQ[r.frequency]}</span>
                    </div>
                  </div>
                  <div className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-0)", width: 92, textAlign: "left" }}>{shekel(r.monthlyEquivalent, false, cur)}</div>
                  <Badge tone="success" dot>פעיל</Badge>
                </div>
              );
            })}
          </Card>

          {/* split */}
          <SectionCard title="פילוח קבועות" sub="לפי קטגוריה (חודשי)">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              <Donut data={byCat} size={180} thickness={24} centerTop="לחודש" centerMain={compact(monthlyTotal)} centerSub="₪" fmt={(v) => shekel(v, false, cur)} />
              <div style={{ width: "100%" }}>
                <HBars data={byCat.map((c) => ({ label: c.label, value: c.amount, color: c.color, dot: true }))} valueFmt={(v) => shekel(v, false, cur)} />
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
