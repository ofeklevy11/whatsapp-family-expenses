/**
 * Visual metadata for the Nocturne-style dashboard:
 *  - maps each (Hebrew) category name to a Lucide icon + a categorical viz color
 *  - assigns a stable color to each family member
 *  - small money/number formatting helpers used across the charts
 *
 * Colors reference the CSS custom properties defined in globals.css so they
 * adapt to the active light/dark theme.
 */

export interface CatMeta {
  icon: string;
  color: string;
}

/** The shared categorical palette (CSS vars), used for fallbacks + members. */
export const CAT_PALETTE = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
  "var(--cat-6)",
  "var(--cat-7)",
  "var(--cat-8)",
  "var(--cat-9)",
  "var(--cat-10)",
];

/** Default category → icon + color (matches the design's category set). */
const CATEGORY_META: Record<string, CatMeta> = {
  "סופר ומזון": { icon: "shopping-cart", color: "var(--cat-1)" },
  "מסעדות וקפה": { icon: "utensils-crossed", color: "var(--cat-4)" },
  "דלק ותחבורה": { icon: "fuel", color: "var(--cat-6)" },
  "רכב": { icon: "car-front", color: "var(--cat-9)" },
  "בית וחשבונות": { icon: "receipt", color: "var(--cat-2)" },
  "שכירות ומשכנתא": { icon: "key-round", color: "var(--cat-5)" },
  "תקשורת ואינטרנט": { icon: "wifi", color: "var(--cat-8)" },
  "בריאות ותרופות": { icon: "heart-pulse", color: "var(--cat-7)" },
  "ילדים וחינוך": { icon: "graduation-cap", color: "var(--cat-3)" },
  "ביגוד": { icon: "shirt", color: "var(--cat-10)" },
  "בילויים": { icon: "ticket", color: "var(--cat-5)" },
  "מנויים": { icon: "repeat", color: "var(--cat-8)" },
  "ביטוחים": { icon: "shield-check", color: "var(--cat-6)" },
  "עסק": { icon: "briefcase", color: "var(--cat-9)" },
  "אחר": { icon: "more-horizontal", color: "var(--cat-2)" },
};

/** Stable string hash → index into a palette (deterministic per name). */
function hashIndex(value: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

/** Icon + color for any category name (falls back to a deterministic tag). */
export function categoryMeta(name: string | null | undefined): CatMeta {
  const key = (name ?? "אחר").trim();
  if (CATEGORY_META[key]) return CATEGORY_META[key];
  return { icon: "tag", color: CAT_PALETTE[hashIndex(key, CAT_PALETTE.length)] };
}

/** A stable color for a family member, by id (or name). */
export function memberColor(idOrName: string): string {
  return CAT_PALETTE[hashIndex(idOrName, CAT_PALETTE.length)];
}

/** First (Hebrew) letter(s) for an avatar. */
export function initials(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "?";
  return n.slice(0, 1);
}

/** Source id → { label, icon } matching the prototype's source chips. */
export const SOURCE_META: Record<string, { label: string; icon: string }> = {
  TEXT: { label: "WhatsApp", icon: "message-circle" },
  IMAGE: { label: "תמונה", icon: "image" },
  PDF: { label: "PDF", icon: "file-text" },
  SCREENSHOT: { label: "צילום מסך", icon: "image" },
  MANUAL: { label: "ידני", icon: "pencil" },
};

export function sourceMeta(id: string): { label: string; icon: string } {
  return SOURCE_META[id] ?? { label: id, icon: "circle" };
}

// ─────────────────────────── number helpers ───────────────────────────

const nf = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });

export function fmt(n: number): string {
  return nf.format(Math.round((n + Number.EPSILON) * 100) / 100);
}
export function fmt0(n: number): string {
  return nf0.format(Math.round(n));
}

/** "1,234 ₪" — pass dec=false for no decimals (the dashboard default). */
export function shekel(n: number, dec = true, currency = "ILS"): string {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₪";
  return `${dec ? fmt(n) : fmt0(n)} ${symbol}`;
}

/** Compact amount, e.g. 12345 -> "12.3K". */
export function compact(n: number): string {
  if (Math.abs(n) >= 1000) return (Math.round(n / 100) / 10).toLocaleString("he-IL") + "K";
  return fmt0(n);
}

const MONTH_LONG = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const MONTH_SHORT = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];

/** "2026-06" -> "יוני 2026" */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_LONG[m - 1]} ${y}`;
}
/** "2026-06" -> "יונ" */
export function monthShort(ym: string): string {
  const m = Number(ym.split("-")[1]);
  return MONTH_SHORT[m - 1];
}
/** "2026-06-02" -> "02.06.2026" */
export function dateHe(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
