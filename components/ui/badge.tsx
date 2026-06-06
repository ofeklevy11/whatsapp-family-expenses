import { ExpenseStatus, ExpenseSource, UserRole } from "@prisma/client";

type Tone = { bg: string; fg: string; bd: string };

const TONES = {
  success: { bg: "rgba(43,212,154,0.13)", fg: "var(--fg-success)", bd: "rgba(43,212,154,0.32)" },
  warning: { bg: "rgba(245,181,68,0.13)", fg: "var(--fg-warning)", bd: "rgba(245,181,68,0.32)" },
  danger: { bg: "rgba(240,107,107,0.13)", fg: "var(--fg-danger)", bd: "rgba(240,107,107,0.32)" },
  neutral: { bg: "var(--glass-3)", fg: "var(--fg-2)", bd: "var(--border)" },
  accent: { bg: "rgba(43,212,154,0.15)", fg: "var(--fg-accent)", bd: "rgba(43,212,154,0.4)" },
} satisfies Record<string, Tone>;

function chip(tone: Tone, text: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "2px 9px",
        fontSize: 11.5,
        fontWeight: 600,
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

const STATUS: Record<ExpenseStatus, { text: string; tone: Tone }> = {
  CONFIRMED: { text: "מאושר", tone: TONES.success },
  NEEDS_REVIEW: { text: "לבדיקה", tone: TONES.warning },
  DELETED: { text: "נמחק", tone: TONES.neutral },
};

const SOURCE_LABELS: Record<ExpenseSource, string> = {
  TEXT: "טקסט",
  IMAGE: "תמונה",
  PDF: "PDF",
  SCREENSHOT: "צילום מסך",
  MANUAL: "ידני",
};

const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "בעלים",
  MEMBER: "חבר",
  VIEWER: "צופה",
};

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  const s = STATUS[status];
  return chip(s.tone, s.text);
}

export function SourceBadge({ source }: { source: ExpenseSource }) {
  return chip(TONES.neutral, SOURCE_LABELS[source]);
}

export function RoleBadge({ role }: { role: UserRole }) {
  return chip(role === "OWNER" ? TONES.accent : TONES.neutral, ROLE_LABELS[role]);
}
