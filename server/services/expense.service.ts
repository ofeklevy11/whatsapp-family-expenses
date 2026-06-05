import { ExpenseSource, ExpenseStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { redactSensitive } from "@/lib/redact";
import { safeParseDate, monthKeyToRange } from "@/lib/dates";
import type { ExtractedExpense } from "@/server/ai/extract-expense-from-text";
import type { ExtractedExpenseFromImage } from "@/server/ai/extract-expense-from-image";
import type { FixUpdates } from "@/server/commands/command.types";

const NOT_DELETED = { status: { not: ExpenseStatus.DELETED } };

const expenseWithRelations = {
  include: { category: true, user: true },
} satisfies Prisma.ExpenseDefaultArgs;

export type ExpenseWithRelations = Prisma.ExpenseGetPayload<
  typeof expenseWithRelations
>;

/** Find-or-create a category by name within a family. Returns its id or null. */
async function resolveCategoryId(
  familyId: string,
  name: string | null | undefined,
): Promise<string | null> {
  if (!name) return null;
  const category = await prisma.category.upsert({
    where: { familyId_name: { familyId, name } },
    update: {},
    create: { familyId, name },
  });
  return category.id;
}

export interface CreateExpenseFromTextInput {
  familyId: string;
  userId: string;
  text: string;
  extractedExpense: ExtractedExpense;
}

export async function createExpenseFromText(
  input: CreateExpenseFromTextInput,
): Promise<ExpenseWithRelations> {
  const e = input.extractedExpense;
  const categoryId = await resolveCategoryId(input.familyId, e.category);

  return prisma.expense.create({
    data: {
      familyId: input.familyId,
      userId: input.userId,
      amount: e.amount ?? 0,
      currency: e.currency,
      merchantName: e.merchantName,
      description: e.description,
      categoryId,
      paymentMethod: e.paymentMethod,
      expenseDate: safeParseDate(e.expenseDate),
      sourceType: ExpenseSource.TEXT,
      sourceText: redactSensitive(input.text),
      confidence: e.confidence,
      status: e.needsReview ? ExpenseStatus.NEEDS_REVIEW : ExpenseStatus.CONFIRMED,
      isRecurring: e.isRecurring,
    },
    ...expenseWithRelations,
  });
}

export interface CreateExpenseFromMediaInput {
  familyId: string;
  userId: string;
  fileUrl: string;
  mimeType: string;
  extractedExpense: ExtractedExpenseFromImage;
}

export async function createExpenseFromMedia(
  input: CreateExpenseFromMediaInput,
): Promise<ExpenseWithRelations> {
  const e = input.extractedExpense;
  const categoryId = await resolveCategoryId(input.familyId, e.category);
  const sourceType = input.mimeType.includes("pdf")
    ? ExpenseSource.PDF
    : ExpenseSource.IMAGE;

  return prisma.expense.create({
    data: {
      familyId: input.familyId,
      userId: input.userId,
      amount: e.amount ?? 0,
      currency: e.currency,
      merchantName: e.merchantName,
      categoryId,
      paymentMethod: e.paymentMethod,
      expenseDate: safeParseDate(e.documentDate),
      sourceType,
      rawOcrText: redactSensitive(e.rawText),
      originalFileUrl: input.fileUrl,
      confidence: e.confidence,
      status: e.needsReview ? ExpenseStatus.NEEDS_REVIEW : ExpenseStatus.CONFIRMED,
    },
    ...expenseWithRelations,
  });
}

/** The most recent non-deleted expense created by a user. */
export async function getLastExpenseByUser(
  userId: string,
): Promise<ExpenseWithRelations | null> {
  return prisma.expense.findFirst({
    where: { userId, ...NOT_DELETED },
    orderBy: { createdAt: "desc" },
    ...expenseWithRelations,
  });
}

export interface CreateManualExpenseInput {
  familyId: string;
  userId: string | null;
  amount: number;
  currency: string;
  merchantName: string | null;
  description: string | null;
  categoryName: string | null;
  paymentMethod: string | null;
  expenseDate: Date;
  isRecurring: boolean;
}

/** Create an expense entered by hand from the dashboard. */
export async function createManualExpense(
  input: CreateManualExpenseInput,
): Promise<ExpenseWithRelations> {
  const categoryId = await resolveCategoryId(input.familyId, input.categoryName);

  return prisma.expense.create({
    data: {
      familyId: input.familyId,
      userId: input.userId,
      amount: input.amount,
      currency: input.currency,
      merchantName: input.merchantName,
      description: input.description,
      categoryId,
      paymentMethod: input.paymentMethod,
      expenseDate: input.expenseDate,
      sourceType: ExpenseSource.MANUAL,
      status: ExpenseStatus.CONFIRMED,
      isRecurring: input.isRecurring,
    },
    ...expenseWithRelations,
  });
}

export interface CreateExpensesFromCreditReportInput {
  familyId: string;
  userId: string | null;
  fileUrl: string;
  mimeType: string;
  transactions: {
    date: string | null;
    merchantName: string | null;
    amount: number;
    currency: string;
    category: string | null;
    paymentMethod: string | null;
  }[];
  /** Per-statement confidence; low confidence flags every row for review. */
  confidence: number;
}

/**
 * Persist every transaction parsed from an uploaded credit-card statement.
 * Categories are found-or-created per row. Returns the created expenses.
 */
export async function createExpensesFromCreditReport(
  input: CreateExpensesFromCreditReportInput,
): Promise<ExpenseWithRelations[]> {
  const sourceType = input.mimeType.includes("pdf")
    ? ExpenseSource.PDF
    : ExpenseSource.IMAGE;
  const status =
    input.confidence < 0.6 ? ExpenseStatus.NEEDS_REVIEW : ExpenseStatus.CONFIRMED;

  const created: ExpenseWithRelations[] = [];
  for (const t of input.transactions) {
    const categoryId = await resolveCategoryId(input.familyId, t.category);
    const expense = await prisma.expense.create({
      data: {
        familyId: input.familyId,
        userId: input.userId,
        amount: t.amount,
        currency: t.currency,
        merchantName: t.merchantName,
        categoryId,
        paymentMethod: t.paymentMethod,
        expenseDate: safeParseDate(t.date),
        sourceType,
        originalFileUrl: input.fileUrl,
        confidence: input.confidence,
        status,
      },
      ...expenseWithRelations,
    });
    created.push(expense);
  }
  return created;
}

/** Soft-delete the user's last expense. Returns it, or null if none. */
export async function deleteLastExpenseByUser(
  userId: string,
): Promise<ExpenseWithRelations | null> {
  const last = await getLastExpenseByUser(userId);
  if (!last) return null;

  return prisma.expense.update({
    where: { id: last.id },
    data: { status: ExpenseStatus.DELETED },
    ...expenseWithRelations,
  });
}

/** Update the user's last expense with the given fixes. */
export async function updateLastExpenseByUser(
  userId: string,
  updates: FixUpdates,
): Promise<ExpenseWithRelations | null> {
  const last = await getLastExpenseByUser(userId);
  if (!last) return null;

  const data: Prisma.ExpenseUpdateInput = {};

  if (typeof updates.amount === "number") {
    data.amount = updates.amount;
    // A confirmed amount resolves a pending review.
    if (updates.amount > 0 && last.status === ExpenseStatus.NEEDS_REVIEW) {
      data.status = ExpenseStatus.CONFIRMED;
    }
  }
  if (updates.merchantName) {
    data.merchantName = updates.merchantName;
  }
  if (updates.categoryName) {
    const categoryId = await resolveCategoryId(last.familyId, updates.categoryName);
    if (categoryId) data.category = { connect: { id: categoryId } };
  }

  return prisma.expense.update({
    where: { id: last.id },
    data,
    ...expenseWithRelations,
  });
}

export interface ListExpensesFilters {
  familyId: string;
  monthKey?: string;
  categoryId?: string;
  userId?: string;
  take?: number;
}

/** Query expenses for the dashboard (excludes soft-deleted by default). */
export async function listExpenses(
  filters: ListExpensesFilters,
): Promise<ExpenseWithRelations[]> {
  const where: Prisma.ExpenseWhereInput = {
    familyId: filters.familyId,
    ...NOT_DELETED,
  };

  if (filters.monthKey) {
    const { start, end } = monthKeyToRange(filters.monthKey);
    where.expenseDate = { gte: start, lte: end };
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.userId) where.userId = filters.userId;

  return prisma.expense.findMany({
    where,
    orderBy: { expenseDate: "desc" },
    take: filters.take ?? 200,
    ...expenseWithRelations,
  });
}

/** Soft-delete an expense by id (used by the dashboard). */
export async function softDeleteExpense(id: string): Promise<void> {
  await prisma.expense.update({
    where: { id },
    data: { status: ExpenseStatus.DELETED },
  });
}
