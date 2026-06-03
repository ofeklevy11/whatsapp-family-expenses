import { createLogger } from "@/lib/logger";
import { todayISO, getCurrentMonthKey } from "@/lib/dates";
import { detectIntent } from "@/server/commands/detect-intent";
import { extractExpenseFromText } from "@/server/ai/extract-expense-from-text";
import {
  createExpenseFromText,
  deleteLastExpenseByUser,
  updateLastExpenseByUser,
} from "@/server/services/expense.service";
import { getMonthlyReport } from "@/server/services/report.service";
import {
  setMonthlyBudget,
  setCategoryBudget,
  checkBudgetAlertsAfterExpense,
} from "@/server/services/budget.service";
import { getRecurringReport } from "@/server/services/recurring.service";
import { replies } from "@/server/whatsapp/reply-templates";
import type { HandlerContext } from "./handler.context";

const logger = createLogger("handler:text");

export async function handleTextMessage(ctx: HandlerContext): Promise<void> {
  const text = ctx.message.text ?? "";
  const command = detectIntent(text);
  const { user, reply } = ctx;
  const familyId = user.familyId;
  const currency = user.family.currency;

  logger.info(`intent=${command.intent} from=${user.phone}`);

  switch (command.intent) {
    case "HELP":
      await reply(replies.help());
      return;

    case "JOIN_FAMILY":
      // Already a member — invite codes are only for new users.
      await reply(replies.joinAlreadyMember(user.family.name));
      return;

    case "CREATE_EXPENSE": {
      const extracted = await extractExpenseFromText({
        text: command.text,
        currentDate: todayISO(),
      });

      if (extracted.amount === null) {
        await reply(replies.expenseNoAmount());
        return;
      }

      const expense = await createExpenseFromText({
        familyId,
        userId: user.id,
        text: command.text,
        extractedExpense: extracted,
      });

      await reply(
        extracted.needsReview
          ? replies.expenseNeedsReview(expense)
          : replies.expenseCreated(expense),
      );

      await sendBudgetAlerts(ctx, expense.id);
      return;
    }

    case "MONTHLY_REPORT": {
      const report = await getMonthlyReport(
        familyId,
        command.monthKey ?? getCurrentMonthKey(),
      );
      await reply(replies.monthlyReport(report));
      return;
    }

    case "SET_BUDGET": {
      if (command.scope === "overall") {
        await setMonthlyBudget(familyId, command.amount);
        await reply(replies.budgetOverallSet(command.amount, currency));
      } else {
        await setCategoryBudget(
          familyId,
          command.categoryName!,
          command.amount,
          getCurrentMonthKey(),
        );
        await reply(
          replies.budgetCategorySet(command.categoryName!, command.amount, currency),
        );
      }
      return;
    }

    case "DELETE_LAST_EXPENSE": {
      const deleted = await deleteLastExpenseByUser(user.id);
      await reply(deleted ? replies.deleteLastSuccess(deleted) : replies.deleteLastNone());
      return;
    }

    case "FIX_LAST_EXPENSE": {
      const updated = await updateLastExpenseByUser(user.id, command.updates);
      if (!updated) {
        await reply(replies.fixLastNone());
        return;
      }
      await reply(replies.fixLastSuccess(updated));
      await sendBudgetAlerts(ctx, updated.id);
      return;
    }

    case "RECURRING_REPORT": {
      const report = await getRecurringReport(familyId);
      await reply(replies.recurringReport(report, currency));
      return;
    }
  }
}

/** Run budget checks for an expense and forward any new alerts to the user. */
async function sendBudgetAlerts(ctx: HandlerContext, expenseId: string): Promise<void> {
  try {
    const alerts = await checkBudgetAlertsAfterExpense(expenseId);
    for (const message of alerts) {
      await ctx.reply(message);
    }
  } catch (error) {
    logger.error("budget alert check failed", error);
  }
}
