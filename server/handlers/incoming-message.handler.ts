import { createLogger } from "@/lib/logger";
import {
  findUserByIdentity,
  ensureUserName,
  reconcileUserIdentity,
} from "@/server/services/user.service";
import { replies } from "@/server/whatsapp/reply-templates";
import type {
  WhatsAppAdapter,
  IncomingMessage,
  IncomingMessageHandler,
} from "@/server/whatsapp/whatsapp-adapter.interface";
import { handleTextMessage } from "./text-message.handler";
import { handleMediaMessage } from "./media-message.handler";

const logger = createLogger("handler:incoming");

/**
 * Build the single entry point that the WhatsApp adapter calls for every
 * incoming message. Identifies the sender, runs onboarding for unknown
 * numbers, then routes registered users to the text / media handlers.
 */
export function createIncomingMessageHandler(
  adapter: WhatsAppAdapter,
): IncomingMessageHandler {
  return async (message: IncomingMessage) => {
    const reply = (text: string) => adapter.sendText(message.chatId, text);

    try {
      const kind = message.media ? "media" : "text";
      logger.info(
        `⬅️  incoming ${kind} from phone=${message.senderPhone ?? "?"} lid=${message.senderLid ?? "?"} name="${message.senderName ?? ""}" text="${(message.text ?? "").slice(0, 60)}"`,
      );

      // Match on either identity — phone or LID — so privacy / business
      // contacts are recognised the same as a plain phone number.
      const user = await findUserByIdentity({
        phone: message.senderPhone,
        lid: message.senderLid,
      });

      // Access is a closed whitelist: only numbers added from the dashboard
      // exist as users. Anyone else is refused — there is no self-service join.
      if (!user) {
        logger.info(`⛔ access denied — sender not in whitelist`);
        await reply(replies.accessDenied());
        return;
      }

      logger.info(`✅ authorized as "${user.name ?? user.phone}" — processing ${kind}`);

      // Keep the display name fresh, and record/normalise the sender's
      // identity (store the LID, promote a LID-only row to the real number).
      await ensureUserName(user.id, message.senderName);
      await reconcileUserIdentity(user.id, {
        phone: message.senderPhone,
        lid: message.senderLid,
      });

      const ctx = { message, user, reply };

      if (message.media) {
        await handleMediaMessage(ctx);
      } else if (message.text) {
        await handleTextMessage(ctx);
      }
    } catch (error) {
      logger.error("Failed to handle incoming message", error);
      try {
        await reply(replies.genericError());
      } catch {
        // ignore secondary failures
      }
    }
  };
}
