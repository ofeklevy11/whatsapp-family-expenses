"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "סקירה", icon: "📊" },
  { href: "/expenses", label: "הוצאות", icon: "🧾" },
  { href: "/budgets", label: "תקציבים", icon: "🎯" },
  { href: "/recurring", label: "הוצאות קבועות", icon: "🔁" },
  { href: "/family", label: "משפחה", icon: "👨‍👩‍👧" },
  { href: "/status", label: "סטטוס הבוט", icon: "📶" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-slate-200 bg-white p-4">
      <div className="mb-6 px-2">
        <p className="text-lg font-bold text-slate-800">💸 הוצאות משפחה</p>
        <p className="text-xs text-slate-400">WhatsApp Expense Agent</p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
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
    </aside>
  );
}
