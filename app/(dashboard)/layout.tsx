import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { getSession } from "@/lib/auth/auth";
import { getPrimaryFamily } from "@/server/services/family.service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, family, bot] = await Promise.all([
    getSession(),
    getPrimaryFamily(),
    prisma.botStatus.findUnique({ where: { id: "singleton" } }).catch(() => null),
  ]);

  const familyName = family?.name ?? "המשפחה";

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "248px 1fr" }}>
      <Sidebar
        username={session?.sub ?? ""}
        isAdmin={session?.role === "admin"}
        familyName={familyName}
        botPhone={bot?.phone ?? ""}
      />

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar familyName={familyName} />
        <main className="dx-app" style={{ padding: "28px 28px 56px", maxWidth: 1360, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
