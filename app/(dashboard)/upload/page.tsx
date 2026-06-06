import { getPrimaryFamily } from "@/server/services/family.service";
import { listFamilyMembers } from "@/server/services/user.service";
import { NoFamilyState } from "@/components/ui/empty-state";
import { CreditReportUploader } from "@/components/upload/credit-report-uploader";
import { Eyebrow } from "@/components/ds/primitives";
import { Icon } from "@/components/ds/icon";
import { hasOpenAI } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const members = await listFamilyMembers(family.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="fade-up">
        <Eyebrow>ייבוא</Eyebrow>
        <h1 style={{ fontSize: 28, marginTop: 7 }}>ייבוא דפי אשראי</h1>
        <p style={{ color: "var(--fg-3)", fontSize: 13.5, marginTop: 6, maxWidth: 620 }}>
          העלו דוח אשראי (PDF או תמונה) — המערכת מזהה את כל העסקאות, מסווגת לקטגוריות, מנקה כפילויות ומוסיפה להוצאות אוטומטית.
        </p>
      </div>

      {!hasOpenAI && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(245,181,68,0.13)", border: "1px solid rgba(245,181,68,0.32)", color: "var(--fg-warning)", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>
          <Icon name="triangle-alert" size={15} />
          זיהוי אוטומטי דורש מפתח OpenAI מוגדר. ללא מפתח, הקבצים יישמרו אך לא ייקראו אוטומטית.
        </div>
      )}

      <CreditReportUploader members={members.map((m) => ({ id: m.id, name: m.name ?? m.phone }))} />
    </div>
  );
}
