"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UploadResult {
  fileName: string;
  created: number;
  status: "ok" | "empty" | "rejected";
  message?: string;
}

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function fileIcon(type: string) {
  return type.includes("pdf") ? "📄" : "🖼️";
}

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CreditReportUploader({
  members,
}: {
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
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
    // De-dupe by name + size.
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...valid.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const upload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setResults(null);

    try {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      if (userId) form.append("userId", userId);

      const res = await fetch("/api/credit-reports", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "upload_failed");
      }

      const data = (await res.json()) as {
        totalCreated: number;
        results: UploadResult[];
      };
      setResults(data.results);
      setFiles([]);
      // Refresh server data so the new expenses appear elsewhere immediately.
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "unauthorized"
          ? "צריך להתחבר מחדש."
          : "ההעלאה נכשלה. נסו שוב.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <Card className="p-0">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
          }
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
            dragging
              ? "border-brand bg-brand/5"
              : "border-slate-300 hover:border-brand hover:bg-slate-50",
          )}
        >
          <div className="text-4xl">{dragging ? "📥" : "⬆️"}</div>
          <div>
            <p className="text-base font-semibold text-slate-800">
              גררו לכאן דוח אשראי או לחצו לבחירה
            </p>
            <p className="mt-1 text-sm text-slate-500">
              PDF או תמונה · עד 15MB · אפשר כמה קבצים יחד
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      {/* Selected files + attribution + action */}
      {files.length > 0 && (
        <Card className="space-y-4 p-4">
          <ul className="divide-y divide-slate-100">
            {files.map((f, i) => (
              <li
                key={`${f.name}:${f.size}`}
                className="flex items-center gap-3 py-2.5"
              >
                <span className="text-xl">{fileIcon(f.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {f.name}
                  </p>
                  <p className="text-xs text-slate-400">{prettySize(f.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  disabled={uploading}
                  className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
                >
                  הסר ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              שייך לבן משפחה:
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={uploading}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="">— ללא —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={upload}
              disabled={uploading}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {uploading
                ? "מסנכרן…"
                : `סנכרון ${files.length} ${files.length === 1 ? "קובץ" : "קבצים"}`}
            </button>
          </div>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-semibold text-slate-800">
            ✅ הסתיים — נוספו{" "}
            {results.reduce((s, r) => s + r.created, 0)} עסקאות.
          </p>
          <ul className="divide-y divide-slate-100">
            {results.map((r, i) => (
              <li key={i} className="flex items-center gap-3 py-2 text-sm">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    r.status === "ok"
                      ? "bg-emerald-50 text-emerald-700"
                      : r.status === "empty"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-600",
                  )}
                >
                  {r.status === "ok" ? `${r.created} עסקאות` : r.status === "empty" ? "ריק" : "נדחה"}
                </span>
                <span className="truncate text-slate-700">{r.fileName}</span>
                {r.message && (
                  <span className="text-xs text-slate-400">{r.message}</span>
                )}
              </li>
            ))}
          </ul>
          <a
            href="/expenses"
            className="inline-block pt-1 text-sm font-medium text-brand hover:underline"
          >
            מעבר להוצאות ←
          </a>
        </Card>
      )}
    </div>
  );
}
