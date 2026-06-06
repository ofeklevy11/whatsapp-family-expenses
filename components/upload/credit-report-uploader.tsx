"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ds/icon";
import { Card, Badge, EmptyState } from "@/components/ds/primitives";
import { Button, Select } from "@/components/ds/controls";
import { ButtonLink } from "@/components/ds/primitives";

interface UploadResult {
  fileName: string;
  created: number;
  status: "ok" | "empty" | "rejected";
  message?: string;
}

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
const ACCEPTED_TYPES = new Set(["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]);
const PROVIDERS = ["ויזה כאל", "מקס (Max)", "ישראכרט", "אמריקן אקספרס", "לאומי קארד"];

const STEPS = [
  { icon: "file-up", t: "העלאת הקובץ", d: "Excel או PDF מאתר חברת האשראי" },
  { icon: "sparkles", t: "זיהוי חכם", d: "ה־AI קורא תאריך, בית עסק וסכום" },
  { icon: "copy-check", t: "ניקוי כפילויות", d: "עסקאות שכבר קיימות לא ייכפלו" },
  { icon: "check-check", t: "אישור והוספה", d: "סקירה מהירה והוספה להוצאות" },
];

function fileIcon(type: string) {
  return type.includes("pdf") ? "file-text" : "image";
}
function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CreditReportUploader({ members }: { members: { id: string; name: string }[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [userId, setUserId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((f) => ACCEPTED_TYPES.has(f.type));
    if (valid.length === 0) {
      setError("רק קבצי PDF או תמונה נתמכים.");
      return;
    }
    setError(null);
    setResults(null);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...valid.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }, []);

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const upload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setResults(null);
    try {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      if (userId) form.append("userId", userId);
      const res = await fetch("/api/credit-reports", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "upload_failed");
      }
      const data = (await res.json()) as { totalCreated: number; results: UploadResult[] };
      setResults(data.results);
      setFiles([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message === "unauthorized" ? "צריך להתחבר מחדש." : "ההעלאה נכשלה. נסו שוב.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-up">
      {error && (
        <div style={{ background: "rgba(240,107,107,0.13)", border: "1px solid rgba(240,107,107,0.32)", color: "var(--fg-danger)", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        {/* dropzone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
          style={{
            border: `1.5px dashed ${drag ? "var(--accent-400)" : "var(--border-strong)"}`,
            background: drag ? "color-mix(in oklab, var(--accent-400) 8%, var(--glass-1))" : "var(--glass-1)",
            borderRadius: 18,
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            textAlign: "center",
            transition: "all 160ms var(--ease-out-expo)",
            minHeight: 280,
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "color-mix(in oklab, var(--accent-400) 16%, transparent)", border: "1px solid color-mix(in oklab, var(--accent-400) 30%, transparent)", display: "grid", placeItems: "center", color: "var(--accent-400)" }}>
            <Icon name="upload-cloud" size={30} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--fg-0)" }}>גררו קובץ לכאן או בחרו</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 6 }}>PDF או תמונה · עד 15MB · אפשר כמה קבצים</div>
          </div>
          <Button variant="primary" icon="folder-open" onClick={() => inputRef.current?.click()}>
            בחירת קובץ
          </Button>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
            {PROVIDERS.map((p) => (
              <Badge key={p} tone="neutral">{p}</Badge>
            ))}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* how it works */}
        <Card padding={0}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border-subtle)", fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>איך זה עובד</div>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--glass-3)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--accent-400)", flexShrink: 0 }}>
                  <Icon name={s.icon} size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-0)" }}>{i + 1}. {s.t}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* selected files */}
      {files.length > 0 && (
        <Card padding={0}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border-subtle)", fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>קבצים שנבחרו ({files.length})</div>
          <div>
            {files.map((f, i) => (
              <div key={`${f.name}:${f.size}`} className="noc-row" style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--glass-3)", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--fg-2)", flexShrink: 0 }}>
                  <Icon name={fileIcon(f.type)} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="num" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-0)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{prettySize(f.size)}</div>
                </div>
                <button type="button" onClick={() => removeFile(i)} disabled={uploading} className="noc-btn" title="הסר" style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", border: "1px solid transparent", color: "var(--fg-3)", display: "grid", placeItems: "center", cursor: "pointer" }}>
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 22px", borderTop: "1px solid var(--border-subtle)", background: "var(--glass-1)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-2)" }}>
              שייך לבן משפחה:
              <Select value={userId} onChange={setUserId} options={[{ value: "", label: "— ללא —" }].concat(members.map((m) => ({ value: m.id, label: m.name })))} />
            </label>
            <Button variant="primary" icon={uploading ? "loader" : "check"} onClick={upload} disabled={uploading}>
              {uploading ? "מסנכרן…" : `סנכרון ${files.length} ${files.length === 1 ? "קובץ" : "קבצים"}`}
            </Button>
          </div>
        </Card>
      )}

      {/* results */}
      {results && (
        <Card padding={0}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)" }}>הסתיים — נוספו {results.reduce((s, r) => s + r.created, 0)} עסקאות</div>
            <ButtonLink href="/expenses" variant="ghost" size="sm" iconRight="arrow-left">
              להוצאות
            </ButtonLink>
          </div>
          {results.length === 0 ? (
            <EmptyState icon="inbox" title="לא זוהו עסקאות" />
          ) : (
            results.map((r, i) => (
              <div key={i} className="noc-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 22px", borderBottom: i < results.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <Badge tone={r.status === "ok" ? "success" : r.status === "empty" ? "warning" : "danger"} dot>
                  {r.status === "ok" ? `${r.created} עסקאות` : r.status === "empty" ? "ריק" : "נדחה"}
                </Badge>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.fileName}</span>
                {r.message && <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>{r.message}</span>}
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}
