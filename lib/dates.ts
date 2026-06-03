import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  parse,
} from "date-fns";
import { he } from "date-fns/locale";

/** Returns the month key for a date in "YYYY-MM" format. */
export function getMonthKey(date: Date = new Date()): string {
  return format(date, "yyyy-MM");
}

/** Current month key, e.g. "2026-06". */
export function getCurrentMonthKey(): string {
  return getMonthKey(new Date());
}

/** The previous month key relative to the given month key. */
export function getPreviousMonthKey(monthKey: string): string {
  const date = parse(monthKey, "yyyy-MM", new Date());
  return getMonthKey(subMonths(date, 1));
}

/** Returns the [start, end] Date range covering the given "YYYY-MM" key. */
export function monthKeyToRange(monthKey: string): { start: Date; end: Date } {
  const date = parse(monthKey, "yyyy-MM", new Date());
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

/** Human-friendly Hebrew month name, e.g. "יוני 2026". */
export function formatMonthNameHe(monthKey: string): string {
  const date = parse(monthKey, "yyyy-MM", new Date());
  return format(date, "LLLL yyyy", { locale: he });
}

/** Short Hebrew date, e.g. "02/06/2026". */
export function formatDateHe(date: Date): string {
  return format(date, "dd/MM/yyyy");
}

/** ISO date (YYYY-MM-DD) for "today". */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Parse a possibly-partial date string coming from the AI extractor.
 * Falls back to `fallback` (default: now) when the string is empty/invalid.
 */
export function safeParseDate(value: string | null | undefined, fallback: Date = new Date()): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}
