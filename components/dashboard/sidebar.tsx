"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ds/icon";
import { Eyebrow, ButtonLink } from "@/components/ds/primitives";
import { NAV, NAV_SECONDARY, ADMIN_NAV, type NavItem } from "./nav";

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "2px 6px" }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          background: "linear-gradient(150deg, var(--accent-300), var(--accent-500))",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 6px 16px -6px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.4)",
          flexShrink: 0,
        }}
      >
        <Icon name="sparkles" size={18} color="#06281C" />
      </div>
      <div style={{ lineHeight: 1.05 }}>
        <div style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "var(--fg-3)", fontWeight: 600 }}>DAVIDOVICI</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-0)", letterSpacing: "0.02em" }}>EXPENSES</div>
      </div>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className="noc-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        padding: "9px 11px",
        borderRadius: 10,
        background: active ? "var(--glass-3)" : "transparent",
        border: active ? "1px solid var(--border-strong)" : "1px solid transparent",
        color: active ? "var(--fg-0)" : "var(--fg-2)",
        fontFamily: "var(--font-sans)",
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        textDecoration: "none",
        position: "relative",
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            right: -11,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 18,
            borderRadius: 3,
            background: "var(--accent-400)",
            boxShadow: "0 0 8px var(--accent-400)",
          }}
        />
      )}
      <Icon name={item.icon} size={18} color={active ? "var(--accent-400)" : "currentColor"} style={{ opacity: active ? 1 : 0.85 }} />
      <span style={{ flex: 1 }}>{item.label}</span>
    </Link>
  );
}

export function Sidebar({
  username,
  isAdmin,
  familyName,
  botPhone,
}: {
  username: string;
  isAdmin: boolean;
  familyName: string;
  botPhone: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        background: "var(--glass-1)",
        borderLeft: "1px solid var(--border-subtle)",
        backdropFilter: "var(--blur-md)",
        WebkitBackdropFilter: "var(--blur-md)",
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        zIndex: 10,
        overflowY: "auto",
      }}
    >
      <Brand />

      <ButtonLink href="/expenses?add=1" variant="primary" icon="plus" style={{ width: "100%" }}>
        הוצאה חדשה
      </ButtonLink>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Eyebrow style={{ padding: "0 11px 6px" }}>ניווט</Eyebrow>
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Eyebrow style={{ padding: "0 11px 6px" }}>עוד</Eyebrow>
        {NAV_SECONDARY.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        {isAdmin && ADMIN_NAV.map((item) => <NavLink key={item.href} item={item} active={isActive(item.href)} />)}
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* mini bot status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "10px 12px",
            background: "var(--glass-2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--accent-400)", boxShadow: "0 0 8px var(--accent-400)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--fg-0)", fontWeight: 600 }}>בוט WhatsApp</div>
            <div style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} dir="ltr">
              {botPhone || "—"}
            </div>
          </div>
          <Icon name="message-circle" size={15} color="var(--fg-3)" />
        </div>

        {/* user */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            background: "var(--glass-2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              background: "linear-gradient(135deg, var(--cat-1), var(--cat-3))",
              display: "grid",
              placeItems: "center",
              color: "#0A0B0F",
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {(familyName || "··").slice(0, 2)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: "var(--fg-0)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {familyName || "—"}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {username || "—"}
              {isAdmin ? " · ADMIN" : ""}
            </div>
          </div>
          <form action="/api/logout" method="post">
            <button type="submit" className="noc-btn" title="התנתקות" style={{ width: 30, height: 30, borderRadius: 9, background: "transparent", border: "1px solid var(--border)", color: "var(--fg-3)", display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Icon name="log-out" size={14} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
