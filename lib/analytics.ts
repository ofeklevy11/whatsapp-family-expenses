/**
 * Shared analytics types + pure (client-safe) filtering and aggregation helpers.
 * No prisma / server imports here — this runs in the browser for instant filtering.
 */
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  subMonths,
  subDays,
  parseISO,
  parse,
  format,
} from "date-fns";
import { he } from "date-fns/locale";

// ─────────────────────────── Types ───────────────────────────

export interface ExpenseRow {
  id: string;
  amount: number;
  currency: string;
  merchantName: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string;
  userId: string | null;
  userName: string;
  paymentMethod: string | null;
  sourceType: string;
  status: string;
  isRecurring: boolean;
  expenseDate: string; // ISO
}

export interface FilterOptions {
  categories: { id: string; name: string }[];
  members: { id: string; name: string }[];
  paymentMethods: string[];
  sources: string[];
}

export type DatePreset =
  | "thisMonth"
  | "lastMonth"
  | "last7"
  | "last30"
  | "last90"
  | "thisYear"
  | "all"
  | "month"
  | "custom";

/** Where the free-text search applies: everything, or just the merchant name. */
export type SearchField = "all" | "merchant";

export interface FilterState {
  preset: DatePreset;
  from: string | null; // YYYY-MM-DD (custom range)
  to: string | null;
  month: string | null; // YYYY-MM (specific-month preset)
  categoryIds: string[];
  userIds: string[];
  paymentMethods: string[];
  sources: string[];
  statuses: string[];
  amountMin: number | null;
  amountMax: number | null;
  search: string;
  searchField: SearchField;
  recurring: "all" | "yes" | "no";
}

export const DEFAULT_FILTERS: FilterState = {
  preset: "thisMonth",
  from: null,
  to: null,
  month: null,
  categoryIds: [],
  userIds: [],
  paymentMethods: [],
  sources: [],
  statuses: [],
  amountMin: null,
  amountMax: null,
  search: "",
  searchField: "all",
  recurring: "all",
};

export type Dimension =
  | "category"
  | "user"
  | "merchant"
  | "paymentMethod"
  | "source"
  | "month"
  | "weekday";

export type Metric = "amount" | "count";

export type ChartType = "bar" | "hbar" | "pie" | "donut" | "line" | "area";

export interface Bucket {
  label: string;
  amount: number;
  count: number;
}

// ─────────────────────────── Labels ───────────────────────────

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "thisMonth", label: "החודש" },
  { value: "lastMonth", label: "חודש שעבר" },
  { value: "last7", label: "7 ימים" },
  { value: "last30", label: "30 יום" },
  { value: "last90", label: "90 יום" },
  { value: "thisYear", label: "השנה" },
  { value: "all", label: "הכל" },
  { value: "month", label: "חודש ספציפי" },
  { value: "custom", label: "טווח מותאם" },
];

export const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "category", label: "קטגוריה" },
  { value: "user", label: "בן משפחה" },
  { value: "merchant", label: "בית עסק" },
  { value: "paymentMethod", label: "אמצעי תשלום" },
  { value: "source", label: "מקור" },
  { value: "month", label: "חודש (לאורך זמן)" },
  { value: "weekday", label: "יום בשבוע" },
];

export const SOURCE_LABELS: Record<string, string> = {
  TEXT: "טקסט",
  IMAGE: "תמונה",
  PDF: "PDF",
  SCREENSHOT: "צילום מסך",
  MANUAL: "ידני",
};

export const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "מאושר",
  NEEDS_REVIEW: "לבדיקה",
  DELETED: "נמחק",
};

const WEEKDAYS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

// ─────────────────────────── Date range ───────────────────────────

export function presetToRange(
  preset: DatePreset,
  from: string | null,
  to: string | null,
  month: string | null = null,
): { start: Date | null; end: Date | null } {
  const now = new Date();
  switch (preset) {
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "lastMonth": {
      const prev = subMonths(now, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    case "last7":
      return { start: subDays(now, 7), end: now };
    case "last30":
      return { start: subDays(now, 30), end: now };
    case "last90":
      return { start: subDays(now, 90), end: now };
    case "thisYear":
      return { start: startOfYear(now), end: now };
    case "all":
      return { start: null, end: null };
    case "month": {
      if (!month) return { start: null, end: null };
      const d = parse(month, "yyyy-MM", now);
      return { start: startOfMonth(d), end: endOfMonth(d) };
    }
    case "custom":
      return {
        start: from ? parseISO(from) : null,
        end: to ? endOfDay(parseISO(to)) : null,
      };
  }
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

// ─────────────────────────── Filtering ───────────────────────────

export function applyFilters(rows: ExpenseRow[], f: FilterState): ExpenseRow[] {
  const { start, end } = presetToRange(f.preset, f.from, f.to, f.month);
  const search = f.search.trim().toLowerCase();

  return rows.filter((r) => {
    const date = parseISO(r.expenseDate);
    if (start && date < start) return false;
    if (end && date > end) return false;

    if (f.categoryIds.length && !f.categoryIds.includes(r.categoryId ?? "__none__"))
      return false;
    if (f.userIds.length && !f.userIds.includes(r.userId ?? "__none__"))
      return false;
    if (
      f.paymentMethods.length &&
      !f.paymentMethods.includes(r.paymentMethod ?? "__none__")
    )
      return false;
    if (f.sources.length && !f.sources.includes(r.sourceType)) return false;
    if (f.statuses.length && !f.statuses.includes(r.status)) return false;

    if (f.amountMin !== null && r.amount < f.amountMin) return false;
    if (f.amountMax !== null && r.amount > f.amountMax) return false;

    if (f.recurring === "yes" && !r.isRecurring) return false;
    if (f.recurring === "no" && r.isRecurring) return false;

    if (search) {
      const haystack =
        f.searchField === "merchant"
          ? (r.merchantName ?? "").toLowerCase()
          : `${r.merchantName ?? ""} ${r.description ?? ""} ${r.categoryName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

/** Count how many filters are active (for the "clear" badge). */
export function activeFilterCount(f: FilterState): number {
  let n = 0;
  if (f.preset !== DEFAULT_FILTERS.preset) n++;
  if (f.categoryIds.length) n++;
  if (f.userIds.length) n++;
  if (f.paymentMethods.length) n++;
  if (f.sources.length) n++;
  if (f.statuses.length) n++;
  if (f.amountMin !== null || f.amountMax !== null) n++;
  if (f.search.trim()) n++;
  if (f.recurring !== "all") n++;
  return n;
}

// ─────────────────────────── Aggregation ───────────────────────────

function keyForDimension(r: ExpenseRow, dim: Dimension): { key: string; label: string; sort: number | string } {
  switch (dim) {
    case "category":
      return { key: r.categoryName, label: r.categoryName, sort: r.categoryName };
    case "user":
      return { key: r.userName, label: r.userName, sort: r.userName };
    case "merchant": {
      const m = r.merchantName ?? "ללא שם";
      return { key: m, label: m, sort: m };
    }
    case "paymentMethod": {
      const p = r.paymentMethod ?? "לא צוין";
      return { key: p, label: p, sort: p };
    }
    case "source": {
      const label = SOURCE_LABELS[r.sourceType] ?? r.sourceType;
      return { key: r.sourceType, label, sort: label };
    }
    case "month": {
      const d = parseISO(r.expenseDate);
      const sortKey = format(d, "yyyy-MM");
      return { key: sortKey, label: format(d, "LLL yy", { locale: he }), sort: sortKey };
    }
    case "weekday": {
      const idx = parseISO(r.expenseDate).getDay();
      return { key: String(idx), label: WEEKDAYS_HE[idx], sort: idx };
    }
  }
}

export function aggregate(rows: ExpenseRow[], dim: Dimension): Bucket[] {
  const map = new Map<string, { label: string; amount: number; count: number; sort: number | string }>();
  for (const r of rows) {
    const { key, label, sort } = keyForDimension(r, dim);
    const entry = map.get(key) ?? { label, amount: 0, count: 0, sort };
    entry.amount += r.amount;
    entry.count += 1;
    map.set(key, entry);
  }

  const buckets = [...map.values()].map((v) => ({
    label: v.label,
    amount: Math.round((v.amount + Number.EPSILON) * 100) / 100,
    count: v.count,
    sort: v.sort,
  }));

  // Time-ordered dimensions sort chronologically; everything else by amount desc.
  if (dim === "month" || dim === "weekday") {
    buckets.sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
  } else {
    buckets.sort((a, b) => b.amount - a.amount);
  }

  return buckets.map(({ label, amount, count }) => ({ label, amount, count }));
}

// ─────────────────────────── Summary KPIs ───────────────────────────

export interface Summary {
  total: number;
  count: number;
  average: number;
  largest: number;
  distinctMerchants: number;
}

export function summarize(rows: ExpenseRow[]): Summary {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const merchants = new Set(rows.map((r) => r.merchantName).filter(Boolean));
  const largest = rows.reduce((m, r) => Math.max(m, r.amount), 0);
  return {
    total: Math.round((total + Number.EPSILON) * 100) / 100,
    count: rows.length,
    average: rows.length ? Math.round((total / rows.length) * 100) / 100 : 0,
    largest,
    distinctMerchants: merchants.size,
  };
}
