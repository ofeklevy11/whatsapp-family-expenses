import type OpenAI from "openai";
import { todayISO } from "@/lib/dates";
import { resolvePeriod, explicitRange, type Period, type DateRange } from "@/lib/periods";
import {
  createExpenseFromText,
  deleteLastExpenseByUser,
  updateLastExpenseByUser,
} from "@/server/services/expense.service";
import { extractExpenseFromText } from "@/server/ai/extract-expense-from-text";
import { summarizeRange, searchExpenses } from "@/server/services/insights.service";
import {
  setMonthlyBudget,
  setCategoryBudget,
  getBudgetStatus,
  checkBudgetAlertsAfterExpense,
} from "@/server/services/budget.service";
import { getRecurringReport } from "@/server/services/recurring.service";
import { getCurrentMonthKey } from "@/lib/dates";

/** Per-request context shared by every tool. */
export interface ToolContext {
  familyId: string;
  userId: string;
  currency: string;
}

const PERIOD_VALUES: Period[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "last_7_days",
  "this_month",
  "last_month",
  "last_30_days",
  "this_year",
  "last_year",
  "all",
];

/** A reusable schema fragment for tools that take a time range. */
const RANGE_PROPS = {
  period: {
    type: "string",
    enum: PERIOD_VALUES,
    description:
      "טווח זמן בשם. השתמש בזה כברירת מחדל. למשל 'today' לסיכום יומי, 'this_week', 'last_month'.",
  },
  from: {
    type: "string",
    description: "תאריך התחלה YYYY-MM-DD (רק לטווח מותאם אישית, במקום period).",
  },
  to: {
    type: "string",
    description: "תאריך סיום YYYY-MM-DD (רק לטווח מותאם אישית).",
  },
} as const;

/** Resolve a range from tool args (explicit from/to wins over a named period). */
function rangeFromArgs(args: {
  period?: string;
  from?: string;
  to?: string;
}): DateRange {
  if (args.from || args.to) return explicitRange(args.from, args.to);
  const period = (PERIOD_VALUES as string[]).includes(args.period ?? "")
    ? (args.period as Period)
    : "this_month";
  return resolvePeriod(period);
}

export const AGENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "log_expense",
      description:
        "רישום הוצאה חדשה מתוך טקסט חופשי של המשתמש (למשל 'רמי לוי 342', 'דלק 280', 'נטפליקס 69 חודשי'). השתמש בזה רק כשהמשתמש מדווח על הוצאה שהוציא.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "טקסט ההוצאה כפי שנכתב, כולל הסכום ושם העסק.",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_expenses",
      description:
        "סיכום הוצאות לטווח זמן: סכום כולל, מספר הוצאות, פילוח לפי קטגוריה/עסק/בן משפחה/יום. מתאים לסיכום יומי, שבועי, חודשי או כל טווח.",
      parameters: {
        type: "object",
        properties: { ...RANGE_PROPS },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_expenses",
      description:
        "החזרת רשימת הוצאות בודדות לטווח זמן, עם אפשרות סינון לפי טקסט חופשי (שם עסק/תיאור) או קטגוריה. מתאים לשאלות כמו 'מה קניתי ברמי לוי?' או 'כמה הוצאתי על דלק החודש?'.",
      parameters: {
        type: "object",
        properties: {
          ...RANGE_PROPS,
          query: {
            type: "string",
            description: "חיפוש חופשי בשם העסק או בתיאור.",
          },
          category: { type: "string", description: "סינון לפי שם קטגוריה." },
          limit: { type: "number", description: "מקסימום שורות (ברירת מחדל 25)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_budget",
      description: "הגדרת תקציב חודשי כללי או תקציב לקטגוריה מסוימת.",
      parameters: {
        type: "object",
        properties: {
          scope: {
            type: "string",
            enum: ["overall", "category"],
            description: "'overall' לתקציב חודשי כללי, 'category' לקטגוריה.",
          },
          category: {
            type: "string",
            description: "שם הקטגוריה (חובה כש-scope הוא 'category').",
          },
          amount: { type: "number", description: "סכום התקציב בש״ח." },
        },
        required: ["scope", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_budget_status",
      description: "מצב התקציב החודשי: כמה נקבע, כמה נוצל וכמה נשאר (כללי ולפי קטגוריה).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_last_expense",
      description: "מחיקת ההוצאה האחרונה שהמשתמש רשם.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "fix_last_expense",
      description: "תיקון ההוצאה האחרונה של המשתמש — סכום, קטגוריה ו/או שם עסק.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          category: { type: "string" },
          merchant: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recurring",
      description: "רשימת ההוצאות הקבועות/מנויים שזוהו ושווי-ערך חודשי שלהם.",
      parameters: { type: "object", properties: {} },
    },
  },
];

type ToolArgs = Record<string, unknown>;

/**
 * Execute a tool call by name and return a JSON-serialisable result that is
 * fed back to the model. Errors are returned as `{ error }` so the model can
 * recover gracefully rather than the whole turn failing.
 */
export async function executeTool(
  name: string,
  args: ToolArgs,
  ctx: ToolContext,
): Promise<unknown> {
  try {
    switch (name) {
      case "log_expense":
        return await toolLogExpense(String(args.text ?? ""), ctx);

      case "summarize_expenses": {
        const range = rangeFromArgs(args as never);
        return await summarizeRange(ctx.familyId, range);
      }

      case "list_expenses": {
        const range = rangeFromArgs(args as never);
        return await searchExpenses({
          familyId: ctx.familyId,
          range,
          query: (args.query as string) ?? null,
          category: (args.category as string) ?? null,
          limit: typeof args.limit === "number" ? args.limit : undefined,
        });
      }

      case "set_budget":
        return await toolSetBudget(args, ctx);

      case "get_budget_status":
        return await getBudgetStatus(ctx.familyId, getCurrentMonthKey());

      case "delete_last_expense": {
        const deleted = await deleteLastExpenseByUser(ctx.userId);
        return deleted
          ? { deleted: true, merchant: deleted.merchantName, amount: deleted.amount }
          : { deleted: false, reason: "no_expense" };
      }

      case "fix_last_expense": {
        const updated = await updateLastExpenseByUser(ctx.userId, {
          amount: typeof args.amount === "number" ? args.amount : undefined,
          categoryName: (args.category as string) || undefined,
          merchantName: (args.merchant as string) || undefined,
        });
        return updated
          ? {
              updated: true,
              merchant: updated.merchantName,
              amount: updated.amount,
              category: updated.category?.name ?? null,
            }
          : { updated: false, reason: "no_expense" };
      }

      case "get_recurring":
        return await getRecurringReport(ctx.familyId);

      default:
        return { error: `unknown_tool:${name}` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "tool_failed" };
  }
}

async function toolLogExpense(text: string, ctx: ToolContext) {
  const extracted = await extractExpenseFromText({ text, currentDate: todayISO() });
  if (extracted.amount === null) {
    return { created: false, reason: "no_amount_detected" };
  }

  const expense = await createExpenseFromText({
    familyId: ctx.familyId,
    userId: ctx.userId,
    text,
    extractedExpense: extracted,
  });

  let budgetAlerts: string[] = [];
  try {
    budgetAlerts = await checkBudgetAlertsAfterExpense(expense.id);
  } catch {
    budgetAlerts = [];
  }

  return {
    created: true,
    needsReview: extracted.needsReview,
    amount: expense.amount,
    currency: expense.currency,
    merchant: expense.merchantName,
    category: expense.category?.name ?? null,
    isRecurring: expense.isRecurring,
    budgetAlerts,
  };
}

async function toolSetBudget(args: ToolArgs, ctx: ToolContext) {
  const amount = Number(args.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }

  if (args.scope === "category") {
    const category = String(args.category ?? "").trim();
    if (!category) return { ok: false, reason: "missing_category" };
    await setCategoryBudget(ctx.familyId, category, amount, getCurrentMonthKey());
    return { ok: true, scope: "category", category, amount };
  }

  await setMonthlyBudget(ctx.familyId, amount);
  return { ok: true, scope: "overall", amount };
}
