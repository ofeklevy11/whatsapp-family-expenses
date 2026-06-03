import { createLogger } from "@/lib/logger";
import { todayISO } from "@/lib/dates";
import { hasOpenAI } from "@/lib/env";
import { storage } from "@/server/storage/local-storage.service";
import { extractExpenseFromImage } from "@/server/ai/extract-expense-from-image";
import { createExpenseFromMedia } from "@/server/services/expense.service";
import { checkBudgetAlertsAfterExpense } from "@/server/services/budget.service";
import { replies } from "@/server/whatsapp/reply-templates";
import type { HandlerContext } from "./handler.context";

const logger = createLogger("handler:media");

export async function handleMediaMessage(ctx: HandlerContext): Promise<void> {
  const media = ctx.message.media;
  if (!media) return;

  const { user, reply } = ctx;
  const familyId = user.familyId;

  // 1. Persist the file (out of the public folder).
  const saved = await storage.saveFile({
    buffer: media.buffer,
    fileName: media.fileName ?? "receipt",
    mimeType: media.mimeType,
    familyId,
  });
  logger.info(`saved media ${saved.url}`);

  // 2. Attempt extraction (Vision if available, placeholder otherwise).
  const extracted = await extractExpenseFromImage({
    filePath: saved.path,
    mimeType: media.mimeType,
    currentDate: todayISO(),
  });

  // 3. If Vision actually ran and decided this is NOT a receipt, stop here.
  const visionRan = hasOpenAI && media.mimeType.startsWith("image/");
  if (visionRan && !extracted.validExpenseDocument) {
    await reply(replies.mediaNotReceipt());
    return;
  }

  // 4. Record the expense (NEEDS_REVIEW when details are uncertain).
  const expense = await createExpenseFromMedia({
    familyId,
    userId: user.id,
    fileUrl: saved.url,
    mimeType: media.mimeType,
    extractedExpense: extracted,
  });

  await reply(
    extracted.needsReview
      ? replies.expenseNeedsReview(expense)
      : replies.expenseCreated(expense),
  );

  try {
    const alerts = await checkBudgetAlertsAfterExpense(expense.id);
    for (const message of alerts) await reply(message);
  } catch (error) {
    logger.error("budget alert check failed", error);
  }
}
