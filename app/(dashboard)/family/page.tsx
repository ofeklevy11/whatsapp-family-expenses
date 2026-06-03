import { getPrimaryFamily } from "@/server/services/family.service";
import { listFamilyMembers } from "@/server/services/user.service";
import { formatDateHe } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/ui/badge";
import { NoFamilyState, EmptyRow } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const members = await listFamilyMembers(family.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">המשפחה</h1>
        <p className="text-sm text-slate-500">פרטי המשפחה, קוד הזמנה ובני המשפחה.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-slate-500">שם המשפחה</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{family.name}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">קוד הזמנה</p>
          <p className="mt-1 font-mono text-xl font-bold tracking-widest text-brand-dark" dir="ltr">
            {family.inviteCode}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            לשיתוף: שלחו לבן משפחה &quot;הצטרפות {family.inviteCode}&quot; בוואטסאפ לבוט.
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>בני המשפחה</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">שם</th>
                <th className="px-4 py-3 font-medium">טלפון</th>
                <th className="px-4 py-3 font-medium">תפקיד</th>
                <th className="px-4 py-3 font-medium">הצטרף בתאריך</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <EmptyRow message="אין עדיין בני משפחה." cols={4} />
              ) : (
                members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-slate-800">{m.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600" dir="ltr">{m.phone}</td>
                    <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                    <td className="px-4 py-3 text-slate-500">{formatDateHe(m.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
