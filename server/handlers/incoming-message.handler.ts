import { createLogger } from "@/lib/logger";
import { detectIntent } from "@/server/commands/detect-intent";
import { findUserByPhone, ensureUserName } from "@/server/services/user.service";
import { joinFamily } from "@/server/services/family.service";
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
      const user = await findUserByPhone(message.senderPhone);

      if (!user) {
        await handleUnregistered(message, reply);
        return;
      }

      // Keep the display name fresh from WhatsApp's pushName.
      await ensureUserName(user.id, message.senderName);

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

/** Onboarding flow for numbers that aren't members of any family yet. */
async function handleUnregistered(
  message: IncomingMessage,
  reply: (text: string) => Promise<void>,
): Promise<void> {
  const command = detectIntent(message.text ?? "");

  if (command.intent === "JOIN_FAMILY") {
    const result = await joinFamily({
      phone: message.senderPhone,
      code: command.code,
      name: message.senderName,
    });

    if (!result.ok) {
      await reply(replies.joinCodeNotFound(command.code));
      return;
    }

    await reply(
      result.alreadyMember
        ? replies.joinAlreadyMember(result.family.name)
        : replies.joinSuccess(result.family.name),
    );
    return;
  }

  // Anything else from an unknown number → show the welcome / join prompt.
  await reply(replies.welcomeUnknownUser());
}
