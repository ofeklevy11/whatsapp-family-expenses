"use client";

import { useState } from "react";

/**
 * Plain HTML form that posts to the /api/login Route Handler. We deliberately
 * avoid a Server Action here so login keeps working after a hot reload (a stale
 * Server Action id returns a 404 — see app/api/login/route.ts).
 */
export function LoginForm({
  from,
  error,
}: {
  from: string;
  error?: boolean;
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action="/api/login"
      method="post"
      onSubmit={() => setPending(true)}
      className="space-y-4"
    >
      <input type="hidden" name="from" value={from} />

      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">שם משתמש</span>
        <input
          type="text"
          name="username"
          autoComplete="username"
          autoFocus
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">סיסמה</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </label>

      {error && (
        <p className="text-sm text-red-600">שם משתמש או סיסמה שגויים.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "מתחבר…" : "התחברות"}
      </button>
    </form>
  );
}
