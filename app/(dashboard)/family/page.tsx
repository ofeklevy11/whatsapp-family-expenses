import { getPrimaryFamily } from "@/server/services/family.service";
import { listFamilyMembers } from "@/server/services/user.service";
import { prisma } from "@/lib/db/prisma";
import { Eyebrow, Badge, Avatar, CatIcon, SectionCard } from "@/components/ds/primitives";
import { Icon } from "@/components/ds/icon";
import { NoFamilyState } from "@/components/ui/empty-state";
import { AddMemberForm } from "@/components/family/add-member-form";
import { AddCategoryForm } from "@/components/family/add-category-form";
import { DarkModeRow } from "@/components/family/dark-mode-row";
import { categoryMeta, memberColor } from "@/lib/category-meta";
import { removeMemberAction, deleteCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

const CURRENCY_LABEL: Record<string, string> = { ILS: "₪ שקל (ILS)", USD: "$ דולר (USD)", EUR: "€ אירו (EUR)" };

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--glass-1)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
      <span style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{label}</span>
      <span className={mono ? "num" : undefined} style={{ fontSize: 13, color: "var(--fg-1)" }}>{value}</span>
    </div>
  );
}

export default async function FamilyPage() {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const [members, categories] = await Promise.all([
    listFamilyMembers(family.id),
    prisma.category.findMany({ where: { familyId: family.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-up">
      <div>
        <Eyebrow>הגדרות</Eyebrow>
        <h1 style={{ fontSize: 28, marginTop: 7 }}>הגדרות חשבון ומשפחה</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* account */}
        <SectionCard title="החשבון שלי">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InfoRow label="שם המשפחה" value={family.name} />
            <InfoRow label="מטבע" value={CURRENCY_LABEL[family.currency] ?? family.currency} />
            <InfoRow label="קוד הזמנה" value={family.inviteCode} mono />
            <DarkModeRow />
          </div>
        </SectionCard>

        {/* family */}
        <SectionCard title="בני משפחה" sub="הזמינו בני משפחה לרשום הוצאות דרך הוואטסאפ">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AddMemberForm />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {members.length === 0 && <p style={{ fontSize: 13, color: "var(--fg-3)" }}>אין עדיין בני משפחה.</p>}
              {members.map((m) => {
                const name = m.name ?? m.phone;
                return (
                  <div key={m.id} className="noc-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--glass-1)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
                    <Avatar name={name} color={memberColor(m.id)} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-0)", display: "flex", alignItems: "center", gap: 8 }}>
                        {name}
                        {m.role === "OWNER" && <Badge tone="accent">בעלים</Badge>}
                      </div>
                      <div className="num" style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }} dir="ltr">{m.phone}</div>
                    </div>
                    <Badge tone="success" dot>פעיל</Badge>
                    <form action={removeMemberAction}>
                      <input type="hidden" name="userId" value={m.id} />
                      <button type="submit" className="noc-btn" title="הסר גישה" style={{ width: 32, height: 32, borderRadius: 9, background: "var(--glass-2)", border: "1px solid var(--border)", color: "var(--fg-danger)", display: "grid", placeItems: "center", cursor: "pointer" }}>
                        <Icon name="trash-2" size={14} />
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* categories */}
      <SectionCard title="קטגוריות" sub={`${categories.length} קטגוריות פעילות · משמשות גם לסיווג האוטומטי של ה־AI`}>
        <div style={{ marginBottom: 18 }}>
          <AddCategoryForm />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {categories.map((c) => {
            const meta = categoryMeta(c.name);
            return (
              <div key={c.id} className="noc-row" style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", background: "var(--glass-1)", borderRadius: 11, border: "1px solid var(--border-subtle)" }}>
                <CatIcon icon={meta.icon} color={meta.color} size={30} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>{c.name}</span>
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="noc-btn" title="מחק" style={{ width: 28, height: 28, borderRadius: 8, background: "transparent", border: "1px solid transparent", color: "var(--fg-4)", display: "grid", placeItems: "center", cursor: "pointer" }}>
                    <Icon name="trash-2" size={13} />
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
