"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const POLL_INTERVAL_MS = 5_000;

type Connection = "open" | "connecting" | "close";

interface BotStatus {
  online: boolean;
  connection: Connection;
  phone: string | null;
  lastSeenAt: string | null;
  connectedAt: string | null;
  lastError: string | null;
  staleMs: number | null;
}

const CONNECTION_LABELS: Record<Connection, string> = {
  open: "מחובר",
  connecting: "מתחבר…",
  close: "מנותק",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.round(diffMs / 1000));
  if (sec < 60) return `לפני ${sec} שניות`;
  const min = Math.round(sec / 60);
  if (min < 60) return `לפני ${min} דקות`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.round(hours / 24);
  return `לפני ${days} ימים`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("he-IL");
}

export default function StatusPage() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bot-status", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as BotStatus;
      setStatus(data);
      setError(false);
      setUpdatedAt(new Date().toLocaleTimeString("he-IL"));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
    timer.current = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const online = status?.online ?? false;
  const connection = status?.connection ?? "close";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">סטטוס הבוט</h1>
          <p className="text-sm text-slate-500">
            מתעדכן אוטומטית כל {POLL_INTERVAL_MS / 1000} שניות
            {updatedAt ? ` · עודכן ב-${updatedAt}` : ""}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          רענן עכשיו
        </button>
      </header>

      {/* Big live indicator */}
      <Card
        className={
          online
            ? "border-emerald-200 bg-emerald-50"
            : connection === "connecting"
              ? "border-amber-200 bg-amber-50"
              : "border-red-200 bg-red-50"
        }
      >
        <CardContent className="flex items-center gap-4 py-6">
          <span className="relative flex h-4 w-4">
            {online ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            ) : null}
            <span
              className={`relative inline-flex h-4 w-4 rounded-full ${
                online
                  ? "bg-emerald-500"
                  : connection === "connecting"
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
            />
          </span>
          <div>
            <p
              className={`text-2xl font-bold ${
                online
                  ? "text-emerald-700"
                  : connection === "connecting"
                    ? "text-amber-700"
                    : "text-red-700"
              }`}
            >
              {online ? "הבוט מחובר ופעיל" : CONNECTION_LABELS[connection]}
            </p>
            <p className="text-sm text-slate-500">
              {error
                ? "לא ניתן להגיע לשרת הסטטוס"
                : online
                  ? "מאזין להודעות WhatsApp בזמן אמת"
                  : "הבוט אינו מקבל הודעות כרגע"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>פרטי חיבור</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="מצב חיבור" value={CONNECTION_LABELS[connection]} />
            <Row label="מספר מקושר" value={status?.phone ?? "—"} />
            <Row label="פעימה אחרונה" value={formatRelative(status?.lastSeenAt ?? null)} />
            <Row label="מחובר מאז" value={formatTime(status?.connectedAt ?? null)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>אבחון</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row
              label="זמן מאז פעימה"
              value={
                status?.staleMs != null
                  ? `${Math.round(status.staleMs / 1000)} שניות`
                  : "—"
              }
            />
            <Row label="שגיאה אחרונה" value={status?.lastError ?? "אין"} />
            {!online ? (
              <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                אם הבוט מנותק זמן ממושך: ודא שהתהליך{" "}
                <code className="rounded bg-slate-200 px-1">npm run bot</code> רץ
                (מומלץ דרך PM2), ושהמכונה דולקת. אם הסשן נותק (logged out) — יש
                לסרוק קוד QR מחדש.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
