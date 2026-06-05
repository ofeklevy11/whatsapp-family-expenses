import { Sidebar } from "@/components/dashboard/sidebar";
import { getSession } from "@/lib/auth/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar username={session?.sub ?? ""} isAdmin={session?.role === "admin"} />
      <main className="flex-1 overflow-x-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
