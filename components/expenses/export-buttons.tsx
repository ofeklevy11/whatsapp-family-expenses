"use client";

import { Button } from "@/components/ds/controls";
import { downloadExcel, downloadPdf } from "@/lib/export";
import type { ExpenseRow } from "@/lib/analytics";

/** PDF / Excel export of a (filtered) row set — used on Overview and Expenses. */
export function ExportButtons({
  rows,
  rangeLabel,
  currency,
}: {
  rows: ExpenseRow[];
  rangeLabel: string;
  currency: string;
}) {
  const meta = { currency, rangeLabel };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Button variant="glass" icon="file-text" onClick={() => downloadPdf(rows, meta)} disabled={!rows.length}>
        PDF
      </Button>
      <Button variant="glass" icon="sheet" onClick={() => downloadExcel(rows, meta)} disabled={!rows.length}>
        Excel
      </Button>
    </div>
  );
}
