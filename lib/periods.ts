/**
 * Resolve a named time period (or an explicit from/to pair) to a concrete
 * [start, end] date range. Used by the AI agent so the model can ask for
 * "today" / "this week" / a custom range without doing date math itself.
 *
 * Weeks start on Sunday (Israeli convention).
 */
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
} from "date-fns";

export type Period =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "last_7_days"
  | "this_month"
  | "last_month"
  | "last_30_days"
  | "this_year"
  | "last_year"
  | "all";

export const PERIOD_LABELS_HE: Record<Period, string> = {
  today: "היום",
  yesterday: "אתמול",
  this_week: "השבוע",
  last_week: "שבוע שעבר",
  last_7_days: "7 הימים האחרונים",
  this_month: "החודש",
  last_month: "חודש שעבר",
  last_30_days: "30 הימים האחרונים",
  this_year: "השנה",
  last_year: "שנה שעברה",
  all: "כל התקופה",
};

const WEEK = { weekStartsOn: 0 } as const;

export interface DateRange {
  start: Date | null;
  end: Date | null;
  label: string;
}

/** Resolve a named period to a range, relative to `now` (default: today). */
export function resolvePeriod(period: Period, now: Date = new Date()): DateRange {
  const label = PERIOD_LABELS_HE[period];
  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now), label };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y), label };
    }
    case "this_week":
      return { start: startOfWeek(now, WEEK), end: endOfWeek(now, WEEK), label };
    case "last_week": {
      const w = subWeeks(now, 1);
      return { start: startOfWeek(w, WEEK), end: endOfWeek(w, WEEK), label };
    }
    case "last_7_days":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now), label };
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now), label };
    case "last_month": {
      const m = subMonths(now, 1);
      return { start: startOfMonth(m), end: endOfMonth(m), label };
    }
    case "last_30_days":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now), label };
    case "this_year":
      return { start: startOfYear(now), end: endOfYear(now), label };
    case "last_year": {
      const yr = subYears(now, 1);
      return { start: startOfYear(yr), end: endOfYear(yr), label };
    }
    case "all":
      return { start: null, end: null, label };
  }
}

/**
 * Build a range from explicit ISO dates (YYYY-MM-DD). Either bound may be
 * omitted. Returns null bounds for missing/invalid values.
 */
export function explicitRange(
  from: string | null | undefined,
  to: string | null | undefined,
): DateRange {
  const start = parseISODate(from);
  const end = parseISODate(to);
  return {
    start: start ? startOfDay(start) : null,
    end: end ? endOfDay(end) : null,
    label: `${from ?? "…"} – ${to ?? "…"}`,
  };
}

function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
