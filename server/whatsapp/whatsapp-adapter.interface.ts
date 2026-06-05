/**
 * Platform-agnostic messaging contracts.
 *
 * The business logic depends ONLY on these types — never on Baileys
 * directly. To migrate to the official WhatsApp Cloud API later, write a
 * new class implementing `WhatsAppAdapter` and emit `IncomingMessage`s;
 * nothing downstream needs to change.
 */

export type MediaType = "image" | "pdf" | "document";

export interface IncomingMedia {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
  type: MediaType;
}

export interface IncomingMessage {
  platform: "whatsapp";
  /** Sender phone, digits only, international format (e.g. "972501234567"). */
  senderPhone: string;
  /**
   * Sender LID (WhatsApp's privacy/business identifier), digits only, when the
   * message arrives under an `@lid` JID. Used as an alternate identity so the
   * same person is recognised whether they message by phone or by LID.
   */
  senderLid?: string;
  /** Opaque chat identifier used to reply (Baileys JID for now). */
  chatId: string;
  /** Sender display name if WhatsApp provided one ("pushName"). */
  senderName?: string;
  text?: string;
  media?: IncomingMedia;
  timestamp: Date;
  /** Raw underlying payload, for debugging only. */
  raw: unknown;
}

export type IncomingMessageHandler = (
  message: IncomingMessage,
) => Promise<void> | void;

export interface WhatsAppAdapter {
  /** Connect, show QR if needed, and begin streaming messages. */
  start(): Promise<void>;
  /** Register the handler that receives unified incoming messages. */
  onMessage(handler: IncomingMessageHandler): void;
  /** Send a plain text reply to a chat. */
  sendText(to: string, text: string): Promise<void>;
  /** Gracefully close the connection (optional). */
  stop?(): Promise<void>;
}
