/**
 * Davidovici Expenses — presentational primitives (server-safe).
 * Ported from the Nocturne prototype. No hooks / handlers here, so these can be
 * rendered inside React Server Components. Interactive controls live in
 * ./controls.tsx ("use client").
 */
import Link from "next/link";
import { Icon } from "./icon";
import { initials } from "@/lib/category-meta";

type CSSProps = React.CSSProperties;

// ───────────────────────────── Card ─────────────────────────────

export function Card({
  children,
  padding = 20,
  className = "",
  style = {},
  glass = true,
}: {
  children: React.ReactNode;
  padding?: number | string;
  className?: string;
  style?: CSSProps;
  glass?: boolean;
}) {
  return (
    <div
      className={`noc-card ${className}`}
      style={{
        background: glass ? "var(--glass-2)" : "var(--solid-panel)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        backdropFilter: glass ? "var(--blur-md)" : "none",
        WebkitBackdropFilter: glass ? "var(--blur-md)" : "none",
        boxShadow: "var(--shadow-2)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ───────────────────────────── Eyebrow ─────────────────────────────

export function Eyebrow({ children, style = {} }: { children: React.ReactNode; style?: CSSProps }) {
  return (
    <div className="eyebrow" style={style}>
      {children}
    </div>
  );
}

// ───────────────────────────── Badge ─────────────────────────────

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string; bd: string; dot?: string }> = {
  neutral: { bg: "var(--glass-3)", fg: "var(--fg-1)", bd: "var(--border)" },
  success: { bg: "rgba(43,212,154,0.13)", fg: "var(--fg-success)", bd: "rgba(43,212,154,0.32)", dot: "var(--accent-400)" },
  warning: { bg: "rgba(245,181,68,0.13)", fg: "var(--fg-warning)", bd: "rgba(245,181,68,0.32)", dot: "#F5B544" },
  danger: { bg: "rgba(240,107,107,0.13)", fg: "var(--fg-danger)", bd: "rgba(240,107,107,0.32)", dot: "#F06B6B" },
  info: { bg: "rgba(139,124,246,0.15)", fg: "var(--fg-info)", bd: "rgba(139,124,246,0.32)" },
  accent: { bg: "rgba(43,212,154,0.15)", fg: "var(--fg-accent)", bd: "rgba(43,212,154,0.4)" },
};

export function Badge({
  tone = "neutral",
  dot,
  children,
  mono,
  ltr,
  style = {},
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
  mono?: boolean;
  ltr?: boolean;
  style?: CSSProps;
}) {
  const t = BADGE_TONES[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 22,
        padding: "0 9px",
        borderRadius: 999,
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: 11.5,
        fontWeight: 600,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
        ...(ltr ? { direction: "ltr" } : {}),
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: t.dot || t.fg,
            boxShadow: `0 0 6px ${t.dot || t.fg}`,
          }}
        />
      )}
      {children}
    </span>
  );
}

// ───────────────────────────── Avatar ─────────────────────────────

export function Avatar({
  name,
  color,
  size = 28,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
        display: "grid",
        placeItems: "center",
        color: "#0A0B0F",
        fontWeight: 700,
        fontSize: size * 0.42,
        flexShrink: 0,
        fontFamily: "var(--font-sans)",
      }}
    >
      {initials(name)}
    </div>
  );
}

// ───────────────────────────── CatIcon ─────────────────────────────

export function CatIcon({
  icon,
  color,
  size = 34,
  radius = 10,
}: {
  icon: string;
  color: string;
  size?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        background: `color-mix(in oklab, ${color} 16%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
        color,
      }}
    >
      <Icon name={icon} size={size * 0.5} />
    </div>
  );
}

// ───────────────────────────── SectionCard ─────────────────────────────

export function SectionCard({
  title,
  sub,
  right,
  children,
  pad = 22,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  pad?: number | string;
}) {
  return (
    <Card padding={0}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 22px",
          borderBottom: "1px solid var(--border-subtle)",
          gap: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)", lineHeight: 1.3 }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.3 }}>{sub}</div>}
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
      <div style={{ padding: pad }}>{children}</div>
    </Card>
  );
}

// ───────────────────────────── EmptyState ─────────────────────────────

export function EmptyState({
  icon = "inbox",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "var(--glass-2)",
          border: "1px solid var(--border)",
          display: "grid",
          placeItems: "center",
          color: "var(--fg-3)",
        }}
      >
        <Icon name={icon} size={24} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-1)" }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: "var(--fg-3)", maxWidth: 340 }}>{hint}</div>}
      {action}
    </div>
  );
}

// ───────────────────────────── button styling (shared) ─────────────────────────────

export type ButtonVariant = "primary" | "glass" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export function buttonStyle(variant: ButtonVariant, size: ButtonSize, active?: boolean): CSSProps {
  const variants: Record<ButtonVariant, CSSProps> = {
    primary: {
      background: "var(--accent-400)",
      color: "var(--fg-on-accent)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-glow)",
      fontWeight: 600,
    },
    glass: {
      background: "var(--glass-2)",
      color: "var(--fg-0)",
      border: "1px solid var(--border)",
      backdropFilter: "var(--blur-md)",
      WebkitBackdropFilter: "var(--blur-md)",
    },
    ghost: {
      background: active ? "var(--glass-3)" : "transparent",
      color: active ? "var(--fg-0)" : "var(--fg-2)",
      border: active ? "1px solid var(--border-strong)" : "1px solid transparent",
    },
    danger: { background: "transparent", color: "var(--fg-danger)", border: "1px solid transparent" },
  };
  const sizes: Record<ButtonSize, CSSProps> = {
    sm: { height: 30, padding: "0 12px", fontSize: 12.5, borderRadius: 9, gap: 6 },
    md: { height: 38, padding: "0 16px", fontSize: 13.5, borderRadius: 11, gap: 8 },
  };
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 120ms var(--ease-out-expo)",
    ...sizes[size],
    ...variants[variant],
  };
}

/** Server-safe navigation button (renders a Next <Link>). */
export function ButtonLink({
  href,
  variant = "glass",
  size = "md",
  icon,
  iconRight,
  children,
  style = {},
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  children?: React.ReactNode;
  style?: CSSProps;
}) {
  return (
    <Link href={href} className="noc-btn" style={{ ...buttonStyle(variant, size), textDecoration: "none", ...style }}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 14 : 16} />}
    </Link>
  );
}
