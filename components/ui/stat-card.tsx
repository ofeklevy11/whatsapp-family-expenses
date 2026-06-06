import { Card } from "./card";

export function StatCard({
  title,
  value,
  hint,
  tone = "default",
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  const color = {
    default: "var(--fg-0)",
    good: "var(--fg-success)",
    warn: "var(--fg-warning)",
    danger: "var(--fg-danger)",
  }[tone];

  return (
    <Card>
      <div style={{ padding: 18 }}>
        <p className="eyebrow">{title}</p>
        <p className="num" style={{ marginTop: 12, fontSize: 28, fontWeight: 600, color }}>
          {value}
        </p>
        {hint ? <p style={{ marginTop: 6, fontSize: 11.5, color: "var(--fg-3)" }}>{hint}</p> : null}
      </div>
    </Card>
  );
}
