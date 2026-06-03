import { NextRequest, NextResponse } from "next/server";
import { getPrimaryFamily } from "@/server/services/family.service";
import { listExpenses } from "@/server/services/expense.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const family = await getPrimaryFamily();
  if (!family) {
    return NextResponse.json({ error: "no_family" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const expenses = await listExpenses({
    familyId: family.id,
    monthKey: searchParams.get("month") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
    take: Number(searchParams.get("take")) || undefined,
  });

  return NextResponse.json({ familyId: family.id, count: expenses.length, expenses });
}
