import { ExpenseStatus, ExpenseSource, UserRole } from "@prisma/client";

const STATUS_LABELS: Record<ExpenseStatus, { text: string; className: string }> = {
  CONFIRMED: { text: "מאושר", className: "bg-emerald-100 text-emerald-700" },
  NEEDS_REVIEW: { text: "לבדיקה", className: "bg-amber-100 text-amber-700" },
  DELETED: { text: "נמחק", className: "bg-slate-100 text-slate-500" },
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
  const { text, className } = STATUS_LABELS[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {text}
    </span>
  );
}

export function SourceBadge({ source }: { source: ExpenseSource }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
      {SOURCE_LABELS[source]}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const className =
    role === "OWNER"
      ? "bg-brand/10 text-brand-dark"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
