import { getPrimaryFamily } from "@/server/services/family.service";
import { listFamilyMembers } from "@/server/services/user.service";
import { formatDateHe } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoFamilyState, EmptyRow } from "@/components/ui/empty-state";
import { AddMemberForm } from "@/components/family/add-member-form";
import { removeMemberAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const family = await getPrimaryFamily();
  if (!family) return <NoFamilyState />;

  const members = await listFamilyMembers(family.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">המשפחה</h1>
        <p className="text-sm text-slate-500">
          פרטי המשפחה וניהול בני המשפחה שיש להם גישה לבוט.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-slate-500">שם המשפחה</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{family.name}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">גישה</p>
          <p className="mt-1 text-base font-semibold text-slate-800">רשימה סגורה 🔒</p>
          <p className="mt-2 text-xs text-slate-400">
            רק מספרים שמופיעים ברשימה למטה יכולים לשלוח לבוט. כל מספר אחר נדחה.
            כדי להוסיף אדם — הזינו את המספר שלו בטופס בתחתית העמוד.
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
                <th className="px-4 py-3 font-medium">הצטרף בתאריך</th>
                <th className="px-4 py-3 font-medium" />
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
                    <td className="px-4 py-3 text-slate-500">{formatDateHe(m.createdAt)}</td>
                    <td className="px-4 py-3 text-left">
                      <form action={removeMemberAction}>
                        <input type="hidden" name="userId" value={m.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          הסר גישה
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>הוספת בן משפחה</CardTitle>
        </CardHeader>
        <CardContent>
          <AddMemberForm />
        </CardContent>
      </Card>
    </div>
  );
}
