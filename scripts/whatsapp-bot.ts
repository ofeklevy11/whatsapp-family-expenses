/**
 * Standalone WhatsApp bot process.
 *
 * Baileys needs a long-lived process, so this runs OUTSIDE Next.js
 * (never as an API route / serverless function):  `npm run bot`.
 */
import "dotenv/config";
import path from "node:path";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { BaileysAdapter } from "@/server/whatsapp/baileys.adapter";
import { createIncomingMessageHandler } from "@/server/handlers/incoming-message.handler";

const logger = createLogger("bot");

async function main() {
  const authDir = path.isAbsolute(env.WHATSAPP_AUTH_DIR)
    ? env.WHATSAPP_AUTH_DIR
    : path.join(process.cwd(), env.WHATSAPP_AUTH_DIR);

  logger.info("Starting WhatsApp Expense Agent...");
  logger.info(`Auth session directory: ${authDir}`);

  const adapter = new BaileysAdapter({ authDir });
  adapter.onMessage(createIncomingMessageHandler(adapter));
  await adapter.start();
}

main().catch((error) => {
  logger.error("Fatal error while starting the bot", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down.");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", reason);
});
