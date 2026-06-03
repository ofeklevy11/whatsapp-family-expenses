/**
 * Tiny classnames helper (avoids an extra dependency).
 * Accepts strings / falsy values and joins the truthy ones.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Normalise a phone number to digits only (international format, no "+").
 * Examples:
 *   "+972 50-123-4567" -> "972501234567"
 *   "972501234567@s.whatsapp.net" -> "972501234567"
 */
export function normalizePhone(input: string): string {
  const withoutSuffix = input.split("@")[0] ?? input;
  // Some WhatsApp JIDs look like "972...:12@s.whatsapp.net" (device part) — drop it.
  const withoutDevice = withoutSuffix.split(":")[0] ?? withoutSuffix;
  return withoutDevice.replace(/[^0-9]/g, "");
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Round to 2 decimal places (money-friendly). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
