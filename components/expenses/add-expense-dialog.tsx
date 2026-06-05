"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { createManualExpenseAction } from "@/app/(dashboard)/expenses/actions";
import type { FilterOptions } from "@/lib/analytics";

/**
 * "Add expense" button + modal form. Submits the manual-expense server action,
 * which revalidates /expenses so the new row shows up immediately.
 */
export function AddExpenseDialog({
  options,
  currency,
}: {
  options: FilterOptions;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const inputCls =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        + הוצאה חדשה
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setOpen(false)}
        >
          <Card
            className="w-full max-w-lg p-0"
          >
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-800">
                  הוספת הוצאה ידנית
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form
                ref={formRef}
                action={createManualExpenseAction}
                onSubmit={() => setOpen(false)}
                className="grid grid-cols-2 gap-3 p-5"
              >
                <label className="col-span-1 space-y-1 text-sm">
                  <span className="text-slate-600">סכום *</span>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    placeholder="0.00"
                    className={inputCls}
                  />
                </label>

                <label className="col-span-1 space-y-1 text-sm">
                  <span className="text-slate-600">מטבע</span>
                  <select name="currency" defaultValue={currency} className={inputCls}>
                    <option value="ILS">₪ ILS</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </label>

                <label className="col-span-1 space-y-1 text-sm">
                  <span className="text-slate-600">תאריך</span>
                  <input
                    name="expenseDate"
                    type="date"
                    defaultValue={today}
                    className={inputCls}
                  />
                </label>

                <label className="col-span-1 space-y-1 text-sm">
                  <span className="text-slate-600">בן משפחה</span>
                  <select name="userId" defaultValue="" className={inputCls}>
                    <option value="">— ללא —</option>
                    {options.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="col-span-2 space-y-1 text-sm">
                  <span className="text-slate-600">בית עסק</span>
                  <input name="merchantName" type="text" className={inputCls} />
                </label>

                <label className="col-span-2 space-y-1 text-sm">
                  <span className="text-slate-600">קטגוריה</span>
                  <input
                    name="categoryName"
                    type="text"
                    list="category-options"
                    placeholder="בחרו או הקלידו קטגוריה חדשה"
                    className={inputCls}
                  />
                  <datalist id="category-options">
                    {options.categories.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </label>

                <label className="col-span-1 space-y-1 text-sm">
                  <span className="text-slate-600">אמצעי תשלום</span>
                  <input
                    name="paymentMethod"
                    type="text"
                    list="payment-options"
                    className={inputCls}
                  />
                  <datalist id="payment-options">
                    {options.paymentMethods.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </label>

                <label className="col-span-1 flex items-end gap-2 pb-2 text-sm text-slate-600">
                  <input name="isRecurring" type="checkbox" className="h-4 w-4" />
                  הוצאה קבועה
                </label>

                <label className="col-span-2 space-y-1 text-sm">
                  <span className="text-slate-600">תיאור</span>
                  <textarea name="description" rows={2} className={inputCls} />
                </label>

                <div className="col-span-2 mt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    שמירה
                  </button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
