/** Currency symbols by ISO code (only what we need). */
const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: "₪",
  USD: "$",
  EUR: "€",
};

/** Format an amount with its currency symbol, e.g. 342 -> "342 ₪". */
export function formatCurrency(amount: number, currency = "ILS"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${formatNumber(amount)} ${symbol}`;
}

/** Format a number with thousands separators and up to 2 decimals. */
export function formatNumber(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat("he-IL", {
    maximumFractionDigits: 2,
  }).format(rounded);
}

/** Format a 0..1 ratio as a percentage string, e.g. 0.83 -> "83%". */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
