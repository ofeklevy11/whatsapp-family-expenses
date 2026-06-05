import { ExpenseStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { round2 } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "@/lib/periods";

export interface RangeBucket {
  label: string;
  amount: number;
  count: number;
}

export interface RangeSummary {
  rangeLabel: string;
  currency: string;
  total: number;
  count: number;
  average: number;
  largest: { merchant: string; amount: number } | null;
  byCategory: RangeBucket[];
  byMerchant: RangeBucket[];
  byUser: RangeBucket[];
  byDay: RangeBucket[];
}

function dateWhere(range: DateRange): Prisma.DateTimeFilter | undefined {
  const f: Prisma.DateTimeFilter = {};
  if (range.start) f.gte = range.start;
  if (range.end) f.lte = range.end;
  return range.start || range.end ? f : undefined;
}

type ExpenseRow = Prisma.ExpenseGetPayload<{
  include: { category: true; user: true };
}>;

function bucket(
  items: ExpenseRow[],
  keyFn: (e: ExpenseRow) => string | null,
  limit?: number,
): RangeBucket[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const e of items) {
    const key = keyFn(e);
    if (!key) continue;
    const entry = map.get(key) ?? { amount: 0, count: 0 };
    entry.amount += e.amount;
    entry.count += 1;
    map.set(key, entry);
  }
  const buckets = [...map.entries()]
    .map(([label, v]) => ({ label, amount: round2(v.amount), count: v.count }))
    .sort((a, b) => b.amount - a.amount);
  return limit ? buckets.slice(0, limit) : buckets;
}

/**
 * Summarise expenses inside an arbitrary date range, grouped every which way.
 * The AI agent feeds this to compose daily/weekly/custom summaries.
 */
export async function summarizeRange(
  familyId: string,
  range: DateRange,
): Promise<RangeSummary> {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  const currency = family?.currency ?? "ILS";

  const expenses = await prisma.expense.findMany({
    where: {
      familyId,
      status: { not: ExpenseStatus.DELETED },
      expenseDate: dateWhere(range),
    },
    include: { category: true, user: true },
    orderBy: { amount: "desc" },
  });

  const total = round2(expenses.reduce((s, e) => s + e.amount, 0));
  const count = expenses.length;
  const biggest = expenses[0];

  const byDay = bucket(expenses, (e) => format(e.expenseDate, "yyyy-MM-dd")).sort(
    (a, b) => (a.label < b.label ? -1 : 1),
  );

  return {
    rangeLabel: range.label,
    currency,
    total,
    count,
    average: count ? round2(total / count) : 0,
    largest: biggest
      ? { merchant: biggest.merchantName ?? "ללא שם", amount: biggest.amount }
      : null,
    byCategory: bucket(expenses, (e) => e.category?.name ?? "אחר"),
    byMerchant: bucket(expenses, (e) => e.merchantName, 8),
    byUser: bucket(expenses, (e) => e.user?.name ?? e.user?.phone ?? "לא ידוע"),
    byDay,
  };
}

export interface SearchResultRow {
  date: string;
  merchant: string;
  amount: number;
  category: string;
  user: string;
}

export interface SearchExpensesParams {
  familyId: string;
  range: DateRange;
  /** Free-text match against merchant name + description. */
  query?: string | null;
  /** Exact-ish category name match. */
  category?: string | null;
  limit?: number;
}

/** List individual expenses matching a range + optional text/category filter. */
export async function searchExpenses(
  params: SearchExpensesParams,
): Promise<{ rows: SearchResultRow[]; total: number; count: number }> {
  const where: Prisma.ExpenseWhereInput = {
    familyId: params.familyId,
    status: { not: ExpenseStatus.DELETED },
    expenseDate: dateWhere(params.range),
  };

  if (params.query) {
    where.OR = [
      { merchantName: { contains: params.query, mode: "insensitive" } },
      { description: { contains: params.query, mode: "insensitive" } },
    ];
  }
  if (params.category) {
    where.category = { name: { contains: params.category, mode: "insensitive" } };
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true, user: true },
    orderBy: { expenseDate: "desc" },
    take: params.limit ?? 25,
  });

  const total = round2(expenses.reduce((s, e) => s + e.amount, 0));
  const rows: SearchResultRow[] = expenses.map((e) => ({
    date: format(e.expenseDate, "yyyy-MM-dd"),
    merchant: e.merchantName ?? "ללא שם",
    amount: e.amount,
    category: e.category?.name ?? "אחר",
    user: e.user?.name ?? e.user?.phone ?? "לא ידוע",
  }));

  return { rows, total, count: expenses.length };
}
