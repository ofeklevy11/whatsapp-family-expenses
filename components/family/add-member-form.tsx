"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addMemberAction, type AddMemberState } from "@/app/(dashboard)/family/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "מוסיף…" : "הוסף בן משפחה"}
    </button>
  );
}

const initialState: AddMemberState = {};

export function AddMemberForm() {
  const [state, formAction] = useActionState(addMemberAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-slate-500">שם</span>
          <input
            type="text"
            name="name"
            placeholder="לדוגמה: יעל"
            className="rounded-lg border border-slate-200 px-3 py-1.5"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-slate-500">מספר טלפון</span>
          <input
            type="tel"
            name="phone"
            dir="ltr"
            placeholder="972501234567"
            className="rounded-lg border border-slate-200 px-3 py-1.5"
          />
        </label>
        <SubmitButton />
      </div>

      <p className="text-xs text-slate-400">
        הזינו את המספר עם קידומת המדינה ללא + (לדוגמה 972501234567). מרגע ההוספה,
        הבוט יקבל ויעבד הודעות מהמספר הזה.
      </p>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
