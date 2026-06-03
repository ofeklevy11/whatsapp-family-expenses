import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  type WASocket,
  type AuthenticationState,
} from "@whiskeysockets/baileys";
import pino, { type Logger } from "pino";

/** A pino logger for Baileys internals (kept quiet by default). */
export function createBaileysLogger(): Logger {
  return pino({
    level: process.env.BAILEYS_LOG_LEVEL ?? "warn",
  });
}

export interface BaileysSocketBundle {
  sock: WASocket;
  saveCreds: () => Promise<void>;
  state: AuthenticationState;
}

/**
 * Build a connected (connecting) Baileys socket with multi-file auth
 * persistence. QR handling, reconnection and message routing are wired
 * up by the BaileysAdapter, not here.
 */
export async function makeBaileysSocket(
  authDir: string,
  logger: Logger,
): Promise<BaileysSocketBundle> {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false, // we render the QR ourselves
    browser: Browsers.appropriate("WhatsApp Expense Agent"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    // More forgiving timeouts — avoids the "init queries Timed Out (408)"
    // reconnect loop seen with some (esp. Business) accounts.
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 0, // 0 = no artificial timeout on internal queries
    keepAliveIntervalMs: 25_000,
    retryRequestDelayMs: 1_000,
  });

  return { sock, saveCreds, state };
}
