import { differenceInCalendarDays, addDays } from "date-fns";
import {
  ExpenseStatus,
  RecurringFrequency,
  type RecurringExpense,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { round2 } from "@/lib/utils";

interface MerchantGroup {
  merchantName: string;
  amounts: number[];
  dates: Date[];
  categories: string[];
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function mostCommon(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Decide a frequency from the average gap (in days) between occurrences. */
function frequencyForGap(avgGapDays: number): RecurringFrequency | null {
  if (avgGapDays >= 4 && avgGapDays <= 10) return RecurringFrequency.WEEKLY;
  if (avgGapDays >= 24 && avgGapDays <= 37) return RecurringFrequency.MONTHLY;
  if (avgGapDays >= 330 && avgGapDays <= 400) return RecurringFrequency.YEARLY;
  return null;
}

/**
 * Detect recurring expenses for a family and upsert them.
 * Rule: same merchant appears ≥3 times, with similar amounts (within 20%)
 * and roughly regular intervals (≈monthly by default).
 */
export async function detectRecurringExpenses(
  familyId: string,
): Promise<RecurringExpense[]> {
  const expenses = await prisma.expense.findMany({
    where: {
      familyId,
      status: { not: ExpenseStatus.DELETED },
      merchantName: { not: null },
      amount: { gt: 0 },
    },
    include: { category: true },
    orderBy: { expenseDate: "asc" },
  });

  const groups = new Map<string, MerchantGroup>();
  for (const e of expenses) {
    const key = e.merchantName!.trim().toLowerCase();
    const group =
      groups.get(key) ??
      { merchantName: e.merchantName!.trim(), amounts: [], dates: [], categories: [] };
    group.amounts.push(e.amount);
    group.dates.push(e.expenseDate);
    if (e.category?.name) group.categories.push(e.category.name);
    groups.set(key, group);
  }

  const results: RecurringExpense[] = [];

  for (const group of groups.values()) {
    if (group.amounts.length < 3) continue;

    const avgAmount = mean(group.amounts);
    if (avgAmount <= 0) continue;

    // Amounts must be reasonably consistent (within 20% of the average).
    const consistent = group.amounts.filter(
      (a) => Math.abs(a - avgAmount) / avgAmount <= 0.2,
    );
    if (consistent.length < 3) continue;

    // Regular intervals.
    const sortedDates = [...group.dates].sort((a, b) => a.getTime() - b.getTime());
    const gaps: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      gaps.push(differenceInCalendarDays(sortedDates[i], sortedDates[i - 1]));
    }
    const avgGap = mean(gaps);
    const frequency = frequencyForGap(avgGap);
    if (!frequency) continue;

    const lastDate = sortedDates[sortedDates.length - 1];
    const nextExpectedAt = addDays(lastDate, Math.round(avgGap));
    const estimatedAmount = round2(mean(consistent));
    const categoryName = mostCommon(group.categories);

    const recurring = await prisma.recurringExpense.upsert({
      where: {
        familyId_merchantName: { familyId, merchantName: group.merchantName },
      },
      update: { estimatedAmount, frequency, categoryName, nextExpectedAt, active: true },
      create: {
        familyId,
        merchantName: group.merchantName,
        estimatedAmount,
        frequency,
        categoryName,
        nextExpectedAt,
        active: true,
      },
    });

    // Tag the underlying expenses so the dashboard can reflect it.
    await prisma.expense.updateMany({
      where: { familyId, merchantName: group.merchantName },
      data: { isRecurring: true },
    });

    results.push(recurring);
  }

  return results;
}

/** Convert an estimated amount + frequency into a monthly equivalent. */
export function monthlyEquivalent(
  amount: number,
  frequency: RecurringFrequency,
): number {
  switch (frequency) {
    case RecurringFrequency.WEEKLY:
      return round2(amount * 4.345);
    case RecurringFrequency.YEARLY:
      return round2(amount / 12);
    case RecurringFrequency.MONTHLY:
    default:
      return round2(amount);
  }
}

export interface RecurringReportItem {
  merchantName: string;
  estimatedAmount: number;
  frequency: RecurringFrequency;
  monthlyEquivalent: number;
  categoryName: string | null;
}

export interface RecurringReport {
  items: RecurringReportItem[];
  totalMonthly: number;
}

/** Refresh detection, then return the active recurring expenses. */
export async function getRecurringReport(familyId: string): Promise<RecurringReport> {
  await detectRecurringExpenses(familyId);

  const recurring = await prisma.recurringExpense.findMany({
    where: { familyId, active: true },
    orderBy: { estimatedAmount: "desc" },
  });

  const items: RecurringReportItem[] = recurring.map((r) => ({
    merchantName: r.merchantName,
    estimatedAmount: r.estimatedAmount,
    frequency: r.frequency,
    monthlyEquivalent: monthlyEquivalent(r.estimatedAmount, r.frequency),
    categoryName: r.categoryName,
  }));

  const totalMonthly = round2(
    items.reduce((sum, i) => sum + i.monthlyEquivalent, 0),
  );

  return { items, totalMonthly };
}
