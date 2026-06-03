import {
  downloadMediaMessage,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import type { Logger } from "pino";
import { normalizePhone } from "@/lib/utils";
import type {
  IncomingMessage,
  IncomingMedia,
  MediaType,
} from "./whatsapp-adapter.interface";

/** Extract the best-effort text body from a Baileys message. */
function extractText(msg: WAMessage): string | undefined {
  const m = msg.message;
  if (!m) return undefined;

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    undefined
  )?.trim();
}

/** Map a document mimetype to our coarse media type. */
function documentMediaType(mimetype?: string | null): MediaType {
  return mimetype === "application/pdf" ? "pdf" : "document";
}

/**
 * Convert a raw Baileys message into our unified `IncomingMessage`.
 * Returns `null` for messages we deliberately ignore:
 *   - messages we sent ourselves (fromMe)
 *   - group messages (@g.us) and status broadcasts
 *   - protocol / empty messages with no usable content
 */
export async function parseBaileysMessage(
  sock: WASocket,
  msg: WAMessage,
  logger: Logger,
): Promise<IncomingMessage | null> {
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid) return null;

  // Ignore our own messages.
  if (msg.key.fromMe) return null;

  // Private chats only — ignore groups, broadcasts and status updates.
  if (
    remoteJid.endsWith("@g.us") ||
    remoteJid === "status@broadcast" ||
    remoteJid.endsWith("@broadcast")
  ) {
    return null;
  }

  if (!msg.message) return null;

  const senderPhone = normalizePhone(remoteJid);
  const senderName = msg.pushName ?? undefined;
  const timestamp =
    typeof msg.messageTimestamp === "number"
      ? new Date(msg.messageTimestamp * 1000)
      : new Date();

  const text = extractText(msg);
  const media = await tryDownloadMedia(sock, msg, logger);

  // Nothing usable in this message.
  if (!text && !media) return null;

  return {
    platform: "whatsapp",
    senderPhone,
    chatId: remoteJid,
    senderName,
    text,
    media,
    timestamp,
    raw: msg,
  };
}

/** Detect and download image / document media, if present. */
async function tryDownloadMedia(
  sock: WASocket,
  msg: WAMessage,
  logger: Logger,
): Promise<IncomingMedia | undefined> {
  const m = msg.message;
  if (!m) return undefined;

  const imageMessage = m.imageMessage;
  const documentMessage =
    m.documentMessage ||
    m.documentWithCaptionMessage?.message?.documentMessage;

  if (!imageMessage && !documentMessage) return undefined;

  try {
    const buffer = (await downloadMediaMessage(
      msg,
      "buffer",
      {},
      { logger, reuploadRequest: sock.updateMediaMessage },
    )) as Buffer;

    if (imageMessage) {
      return {
        buffer,
        mimeType: imageMessage.mimetype ?? "image/jpeg",
        type: "image",
      };
    }

    return {
      buffer,
      mimeType: documentMessage?.mimetype ?? "application/octet-stream",
      fileName: documentMessage?.fileName ?? undefined,
      type: documentMediaType(documentMessage?.mimetype),
    };
  } catch (error) {
    logger.error({ error }, "Failed to download media message");
    return undefined;
  }
}
