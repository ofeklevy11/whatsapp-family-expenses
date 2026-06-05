import { getPrimaryFamily } from "@/server/services/family.service";
import { listFamilyMembers } from "@/server/services/user.service";
import { NoFamilyState } from "@/components/ui/empty-state";
import { CreditReportUploader } from "@/components/upload/credit-report-uploader";
import { hasOpenAI } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const members = await listFamilyMembers(family.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">העלאת דוח אשראי</h1>
        <p className="text-sm text-slate-500">
          גררו דוח אשראי (PDF או תמונה) — המערכת מזהה את כל העסקאות ומסנכרנת אותן
          להוצאות אוטומטית.
        </p>
      </header>

      {!hasOpenAI && (
        <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          ⚠️ זיהוי אוטומטי דורש מפתח OpenAI מוגדר. ללא מפתח, הקבצים יישמרו אך לא
          ייקראו אוטומטית.
        </p>
      )}

      <CreditReportUploader
        members={members.map((m) => ({ id: m.id, name: m.name ?? m.phone }))}
      />
    </div>
  );
}
