"use client";

import { Icon } from "@/components/ds/icon";
import { Button, IconButton, Input, Select, Field } from "@/components/ds/controls";
import { createManualExpenseAction } from "@/app/(dashboard)/expenses/actions";
import { todayISO } from "@/lib/dates";
import type { FilterOptions } from "@/lib/analytics";

/**
 * Nocturne-styled "new expense" modal. Submits the real manual-expense server
 * action (which revalidates /expenses), so a new row appears immediately.
 */
export function AddExpenseDialog({
  open,
  onClose,
  options,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  options: FilterOptions;
  currency: string;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(5,6,9,0.6)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        animation: "fadeIn 160ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: "100%",
          background: "var(--solid-panel)",
          border: "1px solid var(--border-strong)",
          borderRadius: 20,
          boxShadow: "var(--shadow-3)",
          overflow: "hidden",
          animation: "fadeUp 220ms var(--ease-out-expo)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "color-mix(in oklab, var(--accent-400) 20%, transparent)", color: "var(--accent-400)", display: "grid", placeItems: "center" }}>
              <Icon name="plus" size={17} />
            </div>
            <h3 style={{ fontSize: 17 }}>הוצאה חדשה</h3>
          </div>
          <IconButton icon="x" onClick={onClose} />
        </div>

        <form action={createManualExpenseAction} onSubmit={() => onClose()}>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="סכום (₪)">
                <Input type="number" name="amount" placeholder="0.00" icon="banknote" step="0.01" min="0" required />
              </Field>
              <Field label="תאריך">
                <Input type="date" name="expenseDate" defaultValue={todayISO()} />
              </Field>
            </div>
            <Field label="בית עסק">
              <Input name="merchantName" placeholder="לדוגמה: רמי לוי" icon="store" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="קטגוריה">
                <Select
                  name="categoryName"
                  defaultValue={options.categories[0]?.name ?? ""}
                  options={options.categories.map((c) => ({ value: c.name, label: c.name }))}
                  style={{ width: "100%" }}
                />
              </Field>
              <Field label="בן משפחה">
                <Select
                  name="userId"
                  defaultValue=""
                  options={[{ value: "", label: "— ללא —" }].concat(options.members.map((m) => ({ value: m.id, label: m.name })))}
                  style={{ width: "100%" }}
                />
              </Field>
            </div>
            <input type="hidden" name="currency" value={currency} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--border-subtle)", background: "var(--glass-1)" }}>
            <Button variant="primary" icon="check" type="submit">
              הוסף הוצאה
            </Button>
            <Button variant="ghost" onClick={onClose}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
