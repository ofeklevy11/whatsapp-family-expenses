"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createUserAction, type CreateUserState } from "@/app/(dashboard)/users/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "יוצר…" : "צור משתמש"}
    </button>
  );
}

const initialState: CreateUserState = {};

export function CreateUserForm() {
  const [state, formAction] = useActionState(createUserAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-slate-500">שם משתמש</span>
          <input
            type="text"
            name="username"
            autoComplete="off"
            placeholder="לדוגמה: yael"
            className="rounded-lg border border-slate-200 px-3 py-1.5"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-slate-500">סיסמה</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="לפחות 6 תווים"
            className="rounded-lg border border-slate-200 px-3 py-1.5"
          />
        </label>
        <SubmitButton />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
