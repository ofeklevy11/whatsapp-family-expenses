import { ExpenseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { monthKeyToRange, getPreviousMonthKey } from "@/lib/dates";
import { round2 } from "@/lib/utils";
import { getRecurringReport } from "./recurring.service";
import { categoryMeta, memberColor, monthShort } from "@/lib/category-meta";
import type { ExpenseRow } from "@/lib/analytics";

export interface OverviewBucket {
  label: string;
  amount: number;
  count: number;
  color: string;
}

export interface OverviewRecent {
  id: string;
  merchant: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  date: string; // ISO
  amount: number;
  userName: string;
  userColor: string;
  status: string;
}

export interface OverviewInsight {
  icon: string;
  text: string;
}

export interface OverviewData {
  currency: string;
  monthKey: string;
  total: number;
  count: number;
  average: number;
  largest: number;
  merchants: number;
  prevTotal: number;
  deltaPct: number | null;
  byCategory: OverviewBucket[];
  trend: { label: string; value: number; ym: string }[];
  topMerchants: OverviewBucket[];
  recent: OverviewRecent[];
  recurring: { count: number; monthlyTotal: number };
  insights: OverviewInsight[];
  monthRows: ExpenseRow[];
}

function lastSixMonths(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const out: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export async function getOverviewData(familyId: string, monthKey: string): Promise<OverviewData> {
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  const currency = family?.currency ?? "ILS";

  const { start, end } = monthKeyToRange(monthKey);
  const trendMonths = lastSixMonths(monthKey);
  const trendStart = monthKeyToRange(trendMonths[0]).start;

  // Pull the month's rows + the 6-month window in two queries.
  const [rows, windowRows, recurring] = await Promise.all([
    prisma.expense.findMany({
      where: { familyId, status: { not: ExpenseStatus.DELETED }, expenseDate: { gte: start, lte: end } },
      include: { category: true, user: true },
      orderBy: { expenseDate: "desc" },
    }),
    prisma.expense.findMany({
      where: { familyId, status: { not: ExpenseStatus.DELETED }, expenseDate: { gte: trendStart, lte: end } },
      select: { amount: true, expenseDate: true },
    }),
    getRecurringReport(familyId),
  ]);

  const total = round2(rows.reduce((s, e) => s + e.amount, 0));
  const count = rows.length;
  const average = count ? round2(total / count) : 0;
  const largest = rows.reduce((m, e) => Math.max(m, e.amount), 0);
  const merchants = new Set(rows.map((e) => e.merchantName).filter(Boolean)).size;

  // previous month total (for delta)
  const prevKey = getPreviousMonthKey(monthKey);
  const prevRange = monthKeyToRange(prevKey);
  const prevAgg = await prisma.expense.aggregate({
    where: { familyId, status: { not: ExpenseStatus.DELETED }, expenseDate: { gte: prevRange.start, lte: prevRange.end } },
    _sum: { amount: true },
  });
  const prevTotal = round2(prevAgg._sum.amount ?? 0);
  const deltaPct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  // by category
  const catMap = new Map<string, { amount: number; count: number }>();
  for (const e of rows) {
    const name = e.category?.name ?? "אחר";
    const cur = catMap.get(name) ?? { amount: 0, count: 0 };
    cur.amount += e.amount;
    cur.count += 1;
    catMap.set(name, cur);
  }
  const byCategory: OverviewBucket[] = [...catMap.entries()]
    .map(([label, v]) => ({ label, amount: round2(v.amount), count: v.count, color: categoryMeta(label).color }))
    .sort((a, b) => b.amount - a.amount);

  // trend
  const trend = trendMonths.map((ym) => {
    const r = monthKeyToRange(ym);
    const amount = windowRows
      .filter((w) => w.expenseDate >= r.start && w.expenseDate <= r.end)
      .reduce((s, w) => s + w.amount, 0);
    return { label: monthShort(ym), value: Math.round(amount), ym };
  });

  // top merchants
  const merchMap = new Map<string, { amount: number; count: number }>();
  for (const e of rows) {
    if (!e.merchantName) continue;
    const cur = merchMap.get(e.merchantName) ?? { amount: 0, count: 0 };
    cur.amount += e.amount;
    cur.count += 1;
    merchMap.set(e.merchantName, cur);
  }
  const topMerchants: OverviewBucket[] = [...merchMap.entries()]
    .map(([label, v]) => ({ label, amount: round2(v.amount), count: v.count, color: "var(--accent-400)" }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // recent
  const recent: OverviewRecent[] = rows.slice(0, 6).map((e) => {
    const meta = categoryMeta(e.category?.name);
    const userName = e.user?.name ?? e.user?.phone ?? "לא ידוע";
    return {
      id: e.id,
      merchant: e.merchantName ?? "ללא שם",
      categoryName: e.category?.name ?? "אחר",
      categoryIcon: meta.icon,
      categoryColor: meta.color,
      date: e.expenseDate.toISOString(),
      amount: e.amount,
      userName,
      userColor: memberColor(e.userId ?? userName),
      status: e.status,
    };
  });

  // insights
  const insights: OverviewInsight[] = [];
  const topCat = byCategory[0];
  if (topCat && total > 0) {
    insights.push({
      icon: "trending-up",
      text: `הקטגוריה המובילה החודש היא ${topCat.label} עם ${shekelPlain(topCat.amount, currency)} (${Math.round((topCat.amount / total) * 100)}% מההוצאות).`,
    });
  }
  if (deltaPct != null) {
    insights.push(
      deltaPct >= 0
        ? { icon: "arrow-up-right", text: `ההוצאות גדלו ב־${deltaPct}% לעומת החודש הקודם.` }
        : { icon: "arrow-down-right", text: `חיסכון נחמד — ירידה של ${Math.abs(deltaPct)}% לעומת החודש הקודם.` },
    );
  }
  insights.push({
    icon: "repeat",
    text: `${recurring.items.length} הוצאות קבועות פעילות — ${shekelPlain(recurring.totalMonthly, currency)} לחודש.`,
  });
  if (count === 0) {
    insights.length = 0;
    insights.push({ icon: "info", text: "עדיין לא נרשמו הוצאות בחודש זה. שלחו הוצאה בוואטסאפ או הוסיפו ידנית." });
  }

  return {
    currency,
    monthKey,
    total,
    count,
    average,
    largest,
    merchants,
    prevTotal,
    deltaPct,
    byCategory,
    trend,
    topMerchants,
    recent,
    recurring: { count: recurring.items.length, monthlyTotal: recurring.totalMonthly },
    insights,
    monthRows: rows.map((e) => ({
      id: e.id,
      amount: e.amount,
      currency: e.currency,
      merchantName: e.merchantName,
      description: e.description,
      categoryId: e.categoryId,
      categoryName: e.category?.name ?? "אחר",
      userId: e.userId,
      userName: e.user?.name ?? e.user?.phone ?? "לא ידוע",
      paymentMethod: e.paymentMethod,
      sourceType: e.sourceType,
      status: e.status,
      isRecurring: e.isRecurring,
      expenseDate: e.expenseDate.toISOString(),
    })),
  };
}

function shekelPlain(n: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₪";
  return `${new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(Math.round(n))} ${symbol}`;
}
