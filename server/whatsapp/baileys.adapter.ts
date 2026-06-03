import path from "node:path";
import { DisconnectReason, type WASocket } from "@whiskeysockets/baileys";
import type { Boom } from "@hapi/boom";
import type { Logger } from "pino";
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";
import { makeBaileysSocket, createBaileysLogger } from "./baileys.client";
import { parseBaileysMessage } from "./message.parser";
import {
  recordBotConnection,
  touchBotHeartbeat,
  BOT_HEARTBEAT_INTERVAL_MS,
  type BotConnectionState,
} from "@/server/services/bot-status.service";
import type {
  WhatsAppAdapter,
  IncomingMessageHandler,
} from "./whatsapp-adapter.interface";

export interface BaileysAdapterOptions {
  authDir: string;
}

/**
 * Baileys implementation of the WhatsAppAdapter contract.
 * Handles QR display, automatic reconnection and message dispatch,
 * while exposing only the platform-agnostic interface to callers.
 */
export class BaileysAdapter implements WhatsAppAdapter {
  private sock: WASocket | null = null;
  private handler: IncomingMessageHandler | null = null;
  private readonly logger: Logger;
  private readonly authDir: string;
  private starting = false;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private reconnectScheduled = false;
  private reconnectAttempts = 0;

  constructor(options: BaileysAdapterOptions) {
    this.authDir = options.authDir;
    this.logger = createBaileysLogger();
  }

  onMessage(handler: IncomingMessageHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    await this.connect();
  }

  async sendText(to: string, text: string): Promise<void> {
    if (!this.sock) {
      this.logger.warn("sendText called before socket was ready");
      return;
    }
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text });
  }

  async stop(): Promise<void> {
    try {
      await this.sock?.logout();
    } catch {
      // ignore — best-effort shutdown
    }
  }

  private async connect(): Promise<void> {
    if (this.starting) return;
    this.starting = true;
    this.reconnectScheduled = false;

    // Ensure no previous socket is left running (overlapping connections with
    // the same credentials cause WhatsApp to terminate them repeatedly).
    this.cleanupSocket();

    const { sock, saveCreds } = await makeBaileysSocket(this.authDir, this.logger);
    this.sock = sock;
    this.starting = false;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        printQrInstructions(qr);
        this.reportStatus("connecting");
      }

      if (connection === "connecting") {
        this.reportStatus("connecting");
      }

      if (connection === "open") {
        console.log("\n✅ WhatsApp connected. The agent is now listening.\n");
        this.reconnectAttempts = 0;
        this.reportStatus("open");
        this.startHeartbeat();
      }

      if (connection === "close") {
        this.stopHeartbeat();
        this.reportStatus("close", describeError(lastDisconnect?.error));
        this.handleDisconnect(lastDisconnect?.error);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      // Only react to freshly delivered messages, not history sync.
      if (type !== "notify") return;

      for (const msg of messages) {
        await this.dispatch(msg);
      }
    });
  }

  /** Parse and route a single message; never let one message crash the bot. */
  private async dispatch(msg: Parameters<typeof parseBaileysMessage>[1]): Promise<void> {
    if (!this.sock || !this.handler) return;
    try {
      const incoming = await parseBaileysMessage(this.sock, msg, this.logger);
      if (!incoming) return;
      await this.handler(incoming);
    } catch (error) {
      this.logger.error({ error }, "Error while handling incoming message");
    }
  }

  /** The connected account's phone number, e.g. "972501234567". */
  private currentPhone(): string | null {
    return this.sock?.user?.id?.split(":")[0]?.split("@")[0] ?? null;
  }

  /** Persist a connection state change to the DB (best-effort, never throws). */
  private reportStatus(connection: BotConnectionState, error?: string | null): void {
    void recordBotConnection({
      connection,
      phone: connection === "open" ? this.currentPhone() : undefined,
      error: error ?? null,
    }).catch((err) => this.logger.error({ err }, "Failed to record bot status"));
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      void touchBotHeartbeat().catch(() => {
        // non-fatal: a transient DB blip just means one stale heartbeat
      });
    }, BOT_HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  /**
   * Tear down any existing socket before opening a new one. Overlapping
   * connections that share the same credentials make WhatsApp terminate them
   * in a loop, so we drop listeners, stop the heartbeat and close the socket.
   */
  private cleanupSocket(): void {
    this.stopHeartbeat();
    if (!this.sock) return;
    try {
      this.sock.ev.removeAllListeners("connection.update");
      this.sock.ev.removeAllListeners("creds.update");
      this.sock.ev.removeAllListeners("messages.upsert");
      this.sock.end(undefined);
    } catch {
      // best-effort: we are discarding this socket anyway
    }
    this.sock = null;
  }

  private handleDisconnect(error: unknown): void {
    const statusCode = (error as Boom | undefined)?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;

    if (loggedOut) {
      console.log(
        "\n⚠️  WhatsApp session logged out.\n" +
          `Delete the "${this.authDir}" folder and run \`npm run bot\` again to scan a new QR code.\n`,
      );
      return;
    }

    // Guard against a burst of close events scheduling overlapping reconnects —
    // connect() clears this flag once it actually runs.
    if (this.reconnectScheduled) return;
    this.reconnectScheduled = true;

    const attempt = ++this.reconnectAttempts;
    // Exponential backoff capped at 30s: 2s, 4s, 8s, 16s, 30s, 30s…
    const delay = Math.min(2000 * 2 ** (attempt - 1), 30_000);
    console.log(
      `🔄 Connection closed, reconnecting in ${Math.round(delay / 1000)}s (attempt ${attempt})...`,
    );
    setTimeout(() => {
      void this.connect();
    }, delay);
  }
}

function describeError(error: unknown): string | null {
  if (!error) return null;
  const statusCode = (error as Boom | undefined)?.output?.statusCode;
  const message = error instanceof Error ? error.message : String(error);
  return statusCode ? `[${statusCode}] ${message}` : message;
}

function printQrInstructions(qr: string): void {
  console.log("\n📱 Scan this QR code to link the WhatsApp Expense Agent:");
  console.log("   WhatsApp → Settings → Linked Devices → Link a Device\n");
  qrcode.generate(qr, { small: true });

  // Also save a scannable PNG (handy when the terminal is not directly visible).
  const pngPath = path.join(process.cwd(), "whatsapp-qr.png");
  QRCode.toFile(pngPath, qr, { width: 360, margin: 2 })
    .then(() => console.log(`\n🖼️  QR image saved to: ${pngPath}\n`))
    .catch(() => {
      /* non-fatal: terminal QR is still available */
    });
}
