"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ds/icon";
import { Badge } from "@/components/ds/primitives";
import { Select } from "@/components/ds/controls";
import { ThemeToggle } from "@/components/ds/theme";
import { labelForPath } from "./nav";
import { monthLabel } from "@/lib/category-meta";

/** Last `count` month keys ending at the current month, newest first. */
function recentMonths(count = 12): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function Topbar({ familyName }: { familyName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const months = recentMonths(12);
  const currentMonth = months[0];
  const month = params.get("month") || currentMonth;
  const routeLabel = labelForPath(pathname);

  const onMonth = (value: string) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (value === currentMonth) next.delete("month");
    else next.set("month", value);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9,
        height: 64,
        padding: "0 28px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "var(--topbar-bg)",
        borderBottom: "1px solid var(--border-subtle)",
        backdropFilter: "var(--blur-md)",
        WebkitBackdropFilter: "var(--blur-md)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-2)", minWidth: 0 }}>
        <span style={{ color: "var(--fg-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{familyName}</span>
        {routeLabel && (
          <>
            <Icon name="chevron-left" size={13} color="var(--fg-4)" />
            <span style={{ color: "var(--fg-0)", fontWeight: 600, whiteSpace: "nowrap" }}>{routeLabel}</span>
          </>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <Badge tone="accent" dot>
        AI פעיל
      </Badge>

      <Select value={month} onChange={onMonth} options={months.map((ym) => ({ value: ym, label: monthLabel(ym) }))} />

      <ThemeToggle />

      <button
        type="button"
        className="noc-btn"
        title="התראות"
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          background: "var(--glass-2)",
          border: "1px solid var(--border)",
          color: "var(--fg-1)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
        }}
      >
        <Icon name="bell" size={16} />
      </button>
    </header>
  );
}
