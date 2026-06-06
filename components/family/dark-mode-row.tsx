"use client";

import { Toggle } from "@/components/ds/controls";
import { useTheme } from "@/components/ds/theme";

/** Account-settings row mirroring the topbar theme toggle. */
export function DarkModeRow() {
  const [theme, setTheme] = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--glass-1)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-0)" }}>מצב תצוגה כהה</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>כהה נוח יותר לעבודה ממושכת בלילה</div>
      </div>
      <Toggle on={theme === "dark"} onChange={(on) => setTheme(on ? "dark" : "light")} />
    </div>
  );
}
