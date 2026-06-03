import { NextRequest, NextResponse } from "next/server";
import { getPrimaryFamily } from "@/server/services/family.service";
import { getMonthlyReport } from "@/server/services/report.service";
import { getCurrentMonthKey } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const family = await getPrimaryFamily();
  if (!family) {
    return NextResponse.json({ error: "no_family" }, { status: 404 });
  }

  const month = req.nextUrl.searchParams.get("month") ?? getCurrentMonthKey();
  const report = await getMonthlyReport(family.id, month);
  return NextResponse.json(report);
}
