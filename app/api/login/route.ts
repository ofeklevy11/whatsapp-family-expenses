import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyCredentials } from "@/lib/auth/auth";
import {
  SESSION_COOKIE,
  signSession,
  sessionMaxAgeSeconds,
} from "@/lib/auth/session";

/**
 * Login endpoint.
 *
 * Implemented as a Route Handler (not a Server Action) so it never goes stale
 * after a hot reload — Server Actions are addressed by a build-specific id, and
 * submitting a form whose id no longer matches the server returns a 404
 * ("Failed to find Server Action"). A plain POST route has no such id.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const from = String(form.get("from") ?? "");

  const safeFrom =
    from.startsWith("/") && !from.startsWith("/login") ? from : "/dashboard";

  const role = await verifyCredentials(username, password);

  if (!role) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("error", "1");
    if (safeFrom !== "/dashboard") url.searchParams.set("from", safeFrom);
    // 303 so the browser follows with a GET.
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await signSession(username.trim(), role);
  const res = NextResponse.redirect(new URL(safeFrom, req.nextUrl.origin), {
    status: 303,
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds(),
  });
  return res;
}
