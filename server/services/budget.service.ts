import { AlertSeverity, ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getMonthKey, monthKeyToRange } from "@/lib/dates";
import { round2 } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/format";
import { createAlert, alertAlreadySent } from "./alert.service";

/** Set the family-wide monthly budget. */
export async function setMonthlyBudget(familyId: string, amount: number) {
  return prisma.family.update({
    where: { id: familyId },
    data: { monthlyBudget: amount },
  });
}

/** Find-or-create a category, then set its budget for a given month. */
export async function setCategoryBudget(
  familyId: string,
  categoryName: string,
  amount: number,
  monthKey: string = getMonthKey(),
) {
  const category = await prisma.category.upsert({
    where: { familyId_name: { familyId, name: categoryName } },
    update: {},
    create: { familyId, name: categoryName },
  });

  return prisma.budget.upsert({
    where: {
      familyId_categoryId_month: {
        familyId,
        categoryId: category.id,
        month: monthKey,
      },
    },
    update: { limitAmount: amount },
    create: {
      familyId,
      categoryId: category.id,
      month: monthKey,
      limitAmount: amount,
    },
  });
}

export interface CategoryBudgetStatus {
  categoryId: string;
  categoryName: string;
  limit: number;
  spent: number;
  remaining: number;
  ratio: number;
}

export interface BudgetStatus {
  monthKey: string;
  currency: string;
  overall: {
    limit: number | null;
    spent: number;
    remaining: number | null;
    ratio: number | null;
  };
  categories: CategoryBudgetStatus[];
}

/** Map of categoryId -> amount spent this month (null key = uncategorised). */
async function spentByCategory(
  familyId: string,
  monthKey: string,
): Promise<{ total: number; byCategory: Map<string, number> }> {
  const { start, end } = monthKeyToRange(monthKey);
  const grouped = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: {
      familyId,
      status: { not: ExpenseStatus.DELETED },
      expenseDate: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });

  const byCategory = new Map<string, number>();
  let total = 0;
  for (const row of grouped) {
    const amount = row._sum.amount ?? 0;
    total += amount;
    if (row.categoryId) byCategory.set(row.categoryId, amount);
  }
  return { total: round2(total), byCategory };
}

export async function getBudgetStatus(
  familyId: string,
  monthKey: string = getMonthKey(),
): Promise<BudgetStatus> {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  const currency = family?.currency ?? "ILS";
  const { total, byCategory } = await spentByCategory(familyId, monthKey);

  const categoryBudgets = await prisma.budget.findMany({
    where: { familyId, month: monthKey, categoryId: { not: null } },
    include: { category: true },
  });

  const categories: CategoryBudgetStatus[] = categoryBudgets.map((b) => {
    const spent = round2(byCategory.get(b.categoryId!) ?? 0);
    const remaining = round2(b.limitAmount - spent);
    return {
      categoryId: b.categoryId!,
      categoryName: b.category?.name ?? "אחר",
      limit: b.limitAmount,
      spent,
      remaining,
      ratio: b.limitAmount > 0 ? spent / b.limitAmount : 0,
    };
  });

  const overallLimit = family?.monthlyBudget ?? null;

  return {
    monthKey,
    currency,
    overall: {
      limit: overallLimit,
      spent: total,
      remaining: overallLimit !== null ? round2(overallLimit - total) : null,
      ratio: overallLimit && overallLimit > 0 ? total / overallLimit : null,
    },
    categories,
  };
}

/**
 * After a new expense, check whether any budget threshold (80% / 100%) was
 * crossed for the first time this month, persist an Alert, and return the
 * new alert messages so the caller can notify the user. Never duplicates.
 */
export async function checkBudgetAlertsAfterExpense(
  expenseId: string,
): Promise<string[]> {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { category: true },
  });
  if (!expense) return [];

  const familyId = expense.familyId;
  const monthKey = getMonthKey(expense.expenseDate);
  const status = await getBudgetStatus(familyId, monthKey);
  const messages: string[] = [];

  // ── Overall budget ──
  if (status.overall.limit !== null && status.overall.ratio !== null) {
    await maybeAlert({
      familyId,
      monthKey,
      ratio: status.overall.ratio,
      type: "BUDGET_OVERALL",
      build: (level) =>
        level === 100
          ? `🚨 חרגתם מהתקציב החודשי! נוצלו ${formatCurrency(status.overall.spent, status.currency)} מתוך ${formatCurrency(status.overall.limit!, status.currency)}.`
          : `⚠️ עברתם 80% מהתקציב החודשי. נוצלו ${formatCurrency(status.overall.spent, status.currency)} מתוך ${formatCurrency(status.overall.limit!, status.currency)}.`,
      onCreated: (msg) => messages.push(msg),
    });
  }

  // ── Category budget for this expense's category ──
  if (expense.categoryId) {
    const cat = status.categories.find((c) => c.categoryId === expense.categoryId);
    if (cat) {
      await maybeAlert({
        familyId,
        monthKey,
        categoryId: cat.categoryId,
        ratio: cat.ratio,
        type: "BUDGET_CATEGORY",
        build: (level) =>
          level === 100
            ? `🚨 חרגתם מתקציב "${cat.categoryName}"! ${formatCurrency(cat.spent, status.currency)} מתוך ${formatCurrency(cat.limit, status.currency)}.`
            : `⚠️ עברתם 80% מתקציב "${cat.categoryName}" (${formatPercent(cat.ratio)}).`,
        onCreated: (msg) => messages.push(msg),
      });
    }
  }

  return messages;
}

async function maybeAlert(params: {
  familyId: string;
  monthKey: string;
  categoryId?: string;
  ratio: number;
  type: string;
  build: (level: 80 | 100) => string;
  onCreated: (message: string) => void;
}): Promise<void> {
  const level: 80 | 100 | null =
    params.ratio >= 1 ? 100 : params.ratio >= 0.8 ? 80 : null;
  if (level === null) return;

  const type = `${params.type}_${level}`;
  if (await alertAlreadySent(params.familyId, type, params.monthKey, params.categoryId)) {
    return;
  }

  const message = params.build(level);
  await createAlert({
    familyId: params.familyId,
    type,
    message,
    severity: level === 100 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
    metadata: { monthKey: params.monthKey, categoryId: params.categoryId ?? null },
  });
  params.onCreated(message);
}
