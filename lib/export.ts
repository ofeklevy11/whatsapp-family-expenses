/**
 * Client-side export of the (already filtered) expense rows to Excel / PDF.
 *
 * Both paths render an RTL HTML table so Hebrew shapes correctly without any
 * extra dependency or font embedding:
 *  - Excel: a `application/vnd.ms-excel` blob that Excel opens as a real sheet.
 *  - PDF:   a styled print window; the browser's "Save as PDF" handles bidi.
 */
import { format, parseISO } from "date-fns";
import type { ExpenseRow } from "./analytics";
import { SOURCE_LABELS, STATUS_LABELS } from "./analytics";
import { formatNumber } from "./format";

export interface ExportMeta {
  /** Currency symbol/code for the amount column header. */
  currency: string;
  /** Human-readable description of the active date range, e.g. "יוני 2026". */
  rangeLabel: string;
}

const HEADERS = [
  "תאריך",
  "בן משפחה",
  "בית עסק",
  "תיאור",
  "קטגוריה",
  "אמצעי תשלום",
  "סכום",
  "מקור",
  "סטטוס",
];

function cells(r: ExpenseRow): string[] {
  return [
    format(parseISO(r.expenseDate), "dd/MM/yyyy"),
    r.userName,
    r.merchantName ?? "",
    r.description ?? "",
    r.categoryName,
    r.paymentMethod ?? "",
    formatNumber(r.amount),
    SOURCE_LABELS[r.sourceType] ?? r.sourceType,
    STATUS_LABELS[r.status] ?? r.status,
  ];
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildTable(rows: ExpenseRow[]): string {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const head = HEADERS.map((h) => `<th>${h}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${cells(r)
          .map((c) => `<td>${escapeHtml(c)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const totalRow = `<tr class="total"><td colspan="6">סה״כ</td><td>${formatNumber(
    total,
  )}</td><td colspan="2"></td></tr>`;
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}${totalRow}</tbody></table>`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fileStamp() {
  return format(new Date(), "yyyy-MM-dd");
}

/** Download the rows as an Excel-openable file (HTML-table .xls, RTL, Hebrew). */
export function downloadExcel(rows: ExpenseRow[], meta: ExportMeta) {
  const html = `<html dir="rtl"><head><meta charset="UTF-8" />
    <style>
      table { border-collapse: collapse; }
      th, td { border: 0.5pt solid #999; padding: 4px 8px; text-align: right; }
      th { background: #f1f5f9; }
      .total td { font-weight: bold; background: #f8fafc; }
    </style></head>
    <body>
      <h3>הוצאות — ${escapeHtml(meta.rangeLabel)} (${rows.length})</h3>
      ${buildTable(rows)}
    </body></html>`;
  // Leading BOM so Excel detects UTF-8 and renders Hebrew correctly.
  const blob = new Blob(["﻿", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  triggerDownload(blob, `expenses-${fileStamp()}.xls`);
}

/** Open a print-ready window so the user can save the rows as a PDF. */
export function downloadPdf(rows: ExpenseRow[], meta: ExportMeta) {
  const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8" />
    <title>הוצאות ${escapeHtml(meta.rangeLabel)}</title>
    <style>
      * { font-family: "Segoe UI", Arial, sans-serif; }
      body { margin: 24px; color: #1e293b; }
      h2 { margin: 0 0 4px; }
      .sub { color: #64748b; font-size: 13px; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; }
      th { background: #f1f5f9; }
      tr:nth-child(even) td { background: #f8fafc; }
      .total td { font-weight: bold; background: #eef2ff; }
      @media print { @page { size: landscape; margin: 12mm; } }
    </style></head>
    <body>
      <h2>דוח הוצאות</h2>
      <div class="sub">${escapeHtml(meta.rangeLabel)} · ${rows.length} הוצאות</div>
      ${buildTable(rows)}
      <script>window.onload = function () { window.print(); };<\/script>
    </body></html>`;
  const url = URL.createObjectURL(
    new Blob([html], { type: "text/html;charset=utf-8" }),
  );
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    alert("חלון ההדפסה נחסם. אפשרו חלונות קופצים כדי להוריד PDF.");
    return;
  }
  // Give the new window time to load before reclaiming the blob URL.
  win.addEventListener("beforeunload", () => URL.revokeObjectURL(url));
}

/** Short Hebrew description of the active date range, for export headers. */
export function rangeLabelFor(
  preset: string,
  from: string | null,
  to: string | null,
  month: string | null,
): string {
  switch (preset) {
    case "thisMonth":
      return "החודש";
    case "lastMonth":
      return "חודש שעבר";
    case "last7":
      return "7 ימים אחרונים";
    case "last30":
      return "30 יום אחרונים";
    case "last90":
      return "90 יום אחרונים";
    case "thisYear":
      return "השנה";
    case "all":
      return "כל התקופה";
    case "month":
      return month ?? "חודש";
    case "custom":
      return `${from ?? "…"} – ${to ?? "…"}`;
    default:
      return "";
  }
}
