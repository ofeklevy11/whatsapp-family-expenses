import { getSession } from "@/lib/auth/auth";
import { listDashboardUsers } from "@/server/services/dashboard-user.service";
import { formatDateHe } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyRow } from "@/components/ui/empty-state";
import { CreateUserForm } from "@/components/users/create-user-form";
import { deleteUserAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();

  if (session?.role !== "admin") {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-600">
          רק האדמין יכול לנהל משתמשי דשבורד. התחבר עם חשבון האדמין כדי לגשת לעמוד זה.
        </p>
      </Card>
    );
  }

  const users = await listDashboardUsers();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">משתמשי דשבורד</h1>
        <p className="text-sm text-slate-500">
          ניהול הכניסות לדשבורד. האדמין מוגדר בקובץ ההגדרות (.env) ואינו מופיע כאן.
        </p>
      </header>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>משתמשים קיימים</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">שם משתמש</th>
                <th className="px-4 py-3 font-medium">נוצר בתאריך</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <EmptyRow message="עדיין לא נוצרו משתמשי דשבורד." cols={3} />
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{u.username}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateHe(u.createdAt)}</td>
                    <td className="px-4 py-3 text-left">
                      <form action={deleteUserAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          מחק
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
          <CardTitle>הוספת משתמש דשבורד</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>
    </div>
  );
}
