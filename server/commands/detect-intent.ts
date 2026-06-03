import { resolveCategoryName } from "@/server/ai/classify-expense";
import type { FixUpdates, ParsedCommand } from "./command.types";

/** Return the last positive number found in the text, or null. */
function lastNumber(text: string): number | null {
  const matches = [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) =>
    Number(m[0].replace(",", ".")),
  );
  const valid = matches.filter((n) => Number.isFinite(n) && n > 0);
  return valid.length ? valid[valid.length - 1] : null;
}

const GREETINGS = [
  "שלום", "היי", "הי", "אהלן", "בוקר טוב", "ערב טוב",
  "מה נשמע", "מה קורה", "הלו", "hello", "hi", "start", "התחל",
];

/**
 * Map a free-text WhatsApp message to a structured command.
 * Unrecognised text defaults to a create-expense attempt.
 */
export function detectIntent(rawText: string): ParsedCommand {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (!text) return { intent: "HELP" };

  // 1. Join family — "הצטרפות ABC123"
  const join = text.match(/(?:הצטרפות|הצטרף|join)\s+([A-Za-z0-9\-]+)/i);
  if (join) {
    return { intent: "JOIN_FAMILY", code: join[1].toUpperCase() };
  }

  // 2. Help / greetings
  if (
    /^(עזרה|פקודות|help|\?)/.test(text) ||
    /מה אפשר|מה אתה (יודע|עושה)|איך זה עובד/.test(text) ||
    GREETINGS.some((g) => lower === g || lower.startsWith(g + " "))
  ) {
    return { intent: "HELP" };
  }

  // 3. Set budget — "קבע תקציב חודשי 12000" / "תקציב מסעדות 900"
  if (/תקציב/.test(text)) {
    const budget = parseBudget(text);
    if (budget) return budget;
  }

  // 4. Delete last — "מחק אחרונה"
  if (/(מחק|תמחק|הסר|בטל).*(אחרונ|הוצאה האחרונה)/.test(text)) {
    return { intent: "DELETE_LAST_EXPENSE" };
  }

  // 5. Fix last — "תקן אחרונה ..."
  if (/(תקן|עדכן|שנה).*(אחרונ)/.test(text)) {
    return { intent: "FIX_LAST_EXPENSE", updates: parseFixUpdates(text) };
  }

  // 6. Recurring report
  if (/הוצאות קבועות|הוצאות חוזרות|^מנויים$|המנויים שלי/.test(text)) {
    return { intent: "RECURRING_REPORT" };
  }

  // 7. Monthly report
  if (
    /(סיכום|דוח|דו"ח|דו״ח).*(חודש)/.test(text) ||
    /^(סיכום|דוח|דו"ח|דו״ח)$/.test(text) ||
    /כמה הוצאנו|כמה הוצאתי|סיכום החודש|סיכום חודש/.test(text)
  ) {
    return { intent: "MONTHLY_REPORT" };
  }

  // 8. Default: treat as a free-text expense.
  return { intent: "CREATE_EXPENSE", text };
}

function parseBudget(text: string): ParsedCommand | null {
  const amount = lastNumber(text);
  if (amount === null) return null;

  let rest = text
    .replace(/קבע|קבעי|הגדר/g, "")
    .replace(/תקציב/g, "")
    .replace(/\d+(?:[.,]\d+)?/g, "")
    .replace(/[₪]/g, "")
    .trim();

  // "חודשי" / "כללי" / "כולל" without a category → overall budget.
  const overallHint = /חודשי|כללי|כולל|כל החודש/;
  if (overallHint.test(rest)) {
    rest = rest.replace(overallHint, "").trim();
    if (!rest) return { intent: "SET_BUDGET", scope: "overall", amount };
  }

  if (!rest) {
    return { intent: "SET_BUDGET", scope: "overall", amount };
  }

  const categoryName = resolveCategoryName(rest) ?? rest;
  return { intent: "SET_BUDGET", scope: "category", categoryName, amount };
}

function parseFixUpdates(text: string): FixUpdates {
  const updates: FixUpdates = {};

  // Amount: prefer a number right after "סכום", else any number.
  const sumMatch = text.match(/סכום\s*(\d+(?:[.,]\d+)?)/);
  if (sumMatch) {
    updates.amount = Number(sumMatch[1].replace(",", "."));
  } else {
    const n = lastNumber(text);
    if (n !== null) updates.amount = n;
  }

  // Tokenise, dropping command words and numbers.
  const tokens = text
    .replace(/תקן|עדכן|שנה|אחרונה|אחרון|לקטגוריה|קטגוריה|סכום/g, " ")
    .replace(/\d+(?:[.,]\d+)?/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const merchantTokens: string[] = [];
  for (const token of tokens) {
    const category = resolveCategoryName(token);
    if (category && !updates.categoryName) {
      updates.categoryName = category;
    } else {
      merchantTokens.push(token);
    }
  }

  if (merchantTokens.length) {
    updates.merchantName = merchantTokens.join(" ");
  }

  return updates;
}
