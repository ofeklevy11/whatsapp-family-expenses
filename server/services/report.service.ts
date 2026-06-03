import { ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  monthKeyToRange,
  getPreviousMonthKey,
  formatMonthNameHe,
} from "@/lib/dates";
import { formatCurrency, formatPercent } from "@/lib/format";
import { round2 } from "@/lib/utils";

export interface AmountBucket {
  label: string;
  amount: number;
  count: number;
}

export interface TopExpense {
  merchant: string;
  amount: number;
  date: Date;
  category: string;
}

export interface MonthlyReport {
  monthKey: string;
  monthName: string;
  currency: string;
  totalAmount: number;
  totalExpensesCount: number;
  byCategory: AmountBucket[];
  byUser: AmountBucket[];
  topMerchants: AmountBucket[];
  topExpenses: TopExpense[];
  comparisonToPreviousMonth: {
    previousTotal: number;
    diff: number;
    percentChange: number | null;
  };
  insights: string[];
}

async function sumForMonth(familyId: string, monthKey: string): Promise<number> {
  const { start, end } = monthKeyToRange(monthKey);
  const agg = await prisma.expense.aggregate({
    where: {
      familyId,
      status: { not: ExpenseStatus.DELETED },
      expenseDate: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });
  return round2(agg._sum.amount ?? 0);
}

export async function getMonthlyReport(
  familyId: string,
  monthKey: string,
): Promise<MonthlyReport> {
  const { start, end } = monthKeyToRange(monthKey);
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  const currency = family?.currency ?? "ILS";

  const expenses = await prisma.expense.findMany({
    where: {
      familyId,
      status: { not: ExpenseStatus.DELETED },
      expenseDate: { gte: start, lte: end },
    },
    include: { category: true, user: true },
    orderBy: { amount: "desc" },
  });

  const totalAmount = round2(
    expenses.reduce((sum, e) => sum + e.amount, 0),
  );

  const byCategory = aggregate(
    expenses,
    (e) => e.category?.name ?? "אחר",
  );
  const byUser = aggregate(
    expenses,
    (e) => e.user?.name ?? e.user?.phone ?? "לא ידוע",
  );
  const topMerchants = aggregate(
    expenses.filter((e) => e.merchantName),
    (e) => e.merchantName!,
  ).slice(0, 5);

  const topExpenses: TopExpense[] = expenses.slice(0, 5).map((e) => ({
    merchant: e.merchantName ?? "ללא שם",
    amount: e.amount,
    date: e.expenseDate,
    category: e.category?.name ?? "אחר",
  }));

  const previousTotal = await sumForMonth(
    familyId,
    getPreviousMonthKey(monthKey),
  );
  const diff = round2(totalAmount - previousTotal);
  const percentChange =
    previousTotal > 0 ? round2((diff / previousTotal) * 100) : null;

  const report: MonthlyReport = {
    monthKey,
    monthName: formatMonthNameHe(monthKey),
    currency,
    totalAmount,
    totalExpensesCount: expenses.length,
    byCategory,
    byUser,
    topMerchants,
    topExpenses,
    comparisonToPreviousMonth: { previousTotal, diff, percentChange },
    insights: [],
  };

  report.insights = buildInsights(report);
  return report;
}

function aggregate<T extends { amount: number }>(
  items: T[],
  keyFn: (item: T) => string,
): AmountBucket[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const item of items) {
    const key = keyFn(item);
    const entry = map.get(key) ?? { amount: 0, count: 0 };
    entry.amount += item.amount;
    entry.count += 1;
    map.set(key, entry);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, amount: round2(v.amount), count: v.count }))
    .sort((a, b) => b.amount - a.amount);
}

function buildInsights(report: MonthlyReport): string[] {
  const insights: string[] = [];
  const { currency } = report;

  if (report.totalExpensesCount === 0) {
    return ["עוד לא נרשמו הוצאות החודש."];
  }

  const top = report.byCategory[0];
  if (top && report.totalAmount > 0) {
    const share = top.amount / report.totalAmount;
    if (share >= 0.35) {
      insights.push(
        `הקטגוריה "${top.label}" היא הגדולה ביותר — ${formatPercent(share)} מההוצאות (${formatCurrency(top.amount, currency)}).`,
      );
    }
  }

  const { previousTotal, percentChange } = report.comparisonToPreviousMonth;
  if (previousTotal > 0 && percentChange !== null) {
    if (percentChange > 5) {
      insights.push(
        `ההוצאות עלו ב-${formatPercent(percentChange / 100)} לעומת החודש הקודם.`,
      );
    } else if (percentChange < -5) {
      insights.push(
        `יפה! ההוצאות ירדו ב-${formatPercent(Math.abs(percentChange) / 100)} לעומת החודש הקודם.`,
      );
    }
  }

  const topMerchant = report.topMerchants[0];
  if (topMerchant && topMerchant.count >= 2) {
    insights.push(
      `הכי הרבה הוצאת ב"${topMerchant.label}" — ${topMerchant.count} פעמים החודש.`,
    );
  }

  if (insights.length === 0) {
    insights.push("ההוצאות החודש נראות מאוזנות. כל הכבוד!");
  }

  return insights;
}
