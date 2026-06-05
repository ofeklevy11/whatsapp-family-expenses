import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/auth";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  // Already logged in → skip the login page.
  if (await getSession()) redirect("/dashboard");

  const { from, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold text-slate-800">💸 הוצאות משפחה</p>
          <p className="mt-1 text-sm text-slate-400">התחברות לדשבורד</p>
        </div>
        <LoginForm from={from ?? "/dashboard"} error={Boolean(error)} />
      </div>
    </div>
  );
}
