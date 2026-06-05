"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "סקירה", icon: "📊" },
  { href: "/analytics", label: "גרפים", icon: "📈" },
  { href: "/expenses", label: "הוצאות", icon: "🧾" },
  { href: "/upload", label: "העלאת דוח אשראי", icon: "📤" },
  { href: "/budgets", label: "תקציבים", icon: "🎯" },
  { href: "/recurring", label: "הוצאות קבועות", icon: "🔁" },
  { href: "/family", label: "משפחה", icon: "👨‍👩‍👧" },
  { href: "/status", label: "סטטוס הבוט", icon: "📶" },
];

const ADMIN_NAV = [{ href: "/users", label: "משתמשי דשבורד", icon: "🔐" }];

export function Sidebar({
  username,
  isAdmin,
}: {
  username: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-slate-200 bg-white p-4">
      <div className="mb-6 px-2">
        <p className="text-lg font-bold text-slate-800">💸 הוצאות משפחה</p>
        <p className="text-xs text-slate-400">WhatsApp Expense Agent</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="mb-2 px-2">
          <p className="text-xs text-slate-400">מחובר/ת כ־</p>
          <p className="truncate text-sm font-medium text-slate-700">
            {username || "—"}
            {isAdmin && (
              <span className="mr-1 rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-dark">
                ADMIN
              </span>
            )}
          </p>
        </div>
        <form action="/api/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
          >
            <span>🚪</span>
            <span>התנתקות</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
