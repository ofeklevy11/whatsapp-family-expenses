import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrimaryFamily } from "@/server/services/family.service";
import {
  getBudgetStatus,
  setMonthlyBudget,
  setCategoryBudget,
} from "@/server/services/budget.service";
import { getCurrentMonthKey } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const family = await getPrimaryFamily();
  if (!family) return NextResponse.json({ error: "no_family" }, { status: 404 });

  const month = req.nextUrl.searchParams.get("month") ?? getCurrentMonthKey();
  const status = await getBudgetStatus(family.id, month);
  return NextResponse.json(status);
}

const bodySchema = z.object({
  scope: z.enum(["overall", "category"]),
  amount: z.number().positive(),
  categoryName: z.string().optional(),
  month: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const family = await getPrimaryFamily();
  if (!family) return NextResponse.json({ error: "no_family" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const { scope, amount, categoryName, month } = parsed.data;
  if (scope === "overall") {
    await setMonthlyBudget(family.id, amount);
  } else {
    if (!categoryName) {
      return NextResponse.json({ error: "categoryName_required" }, { status: 400 });
    }
    await setCategoryBudget(family.id, categoryName, amount, month ?? getCurrentMonthKey());
  }

  const status = await getBudgetStatus(family.id, month ?? getCurrentMonthKey());
  return NextResponse.json(status);
}
