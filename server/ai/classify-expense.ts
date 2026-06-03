import {
  CATEGORY_KEYWORDS,
  DEFAULT_CATEGORIES,
  FALLBACK_CATEGORY,
} from "@/lib/categories";

/** Is the given name one of our allowed categories? */
export function isAllowedCategory(name: string | null | undefined): boolean {
  return !!name && (DEFAULT_CATEGORIES as readonly string[]).includes(name);
}

/** Coerce any category-ish value to an allowed category (fallback to "אחר"). */
export function normalizeCategory(name: string | null | undefined): string {
  return isAllowedCategory(name) ? (name as string) : FALLBACK_CATEGORY;
}

/**
 * Resolve a short token typed by the user ("סופר", "מסעדות", "עסק") to a
 * full category name ("סופר ומזון", "מסעדות וקפה", "עסק"). Returns null if
 * the token does not clearly map to a category (e.g. a merchant name).
 */
export function resolveCategoryName(token: string): string | null {
  const t = token.trim();
  if (!t) return null;

  for (const category of DEFAULT_CATEGORIES) {
    if (category === t) return category;
    const words = category.split(/\s+/);
    if (words.includes(t)) return category;
    if (t.length >= 3 && category.includes(t)) return category;
  }
  return null;
}

/**
 * Keyword-based classifier used by the regex fallback and to backfill a
 * category when the AI did not provide a confident one.
 */
export function classifyByKeywords(
  text: string,
  merchantName?: string | null,
): string {
  const haystack = `${merchantName ?? ""} ${text}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (haystack.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  return FALLBACK_CATEGORY;
}
