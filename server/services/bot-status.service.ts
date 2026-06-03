import { prisma } from "@/lib/db/prisma";

/** Fixed primary key for the single BotStatus row. */
const SINGLETON_ID = "singleton";

/**
 * The bot bumps its heartbeat every BOT_HEARTBEAT_INTERVAL_MS while connected.
 * If no heartbeat arrives within HEARTBEAT_STALE_MS, we treat it as offline —
 * this catches a crashed/killed process that never got to write "close".
 */
export const BOT_HEARTBEAT_INTERVAL_MS = 20_000;
export const HEARTBEAT_STALE_MS = 60_000;

export type BotConnectionState = "open" | "connecting" | "close";

export interface BotStatusView {
  /** Connected AND heartbeat is fresh. The single source of truth for the UI. */
  online: boolean;
  connection: BotConnectionState;
  phone: string | null;
  lastSeenAt: string | null;
  connectedAt: string | null;
  lastError: string | null;
  /** Milliseconds since the last heartbeat (null when never seen). */
  staleMs: number | null;
}

/** Record a connection state transition (open / connecting / close). */
export async function recordBotConnection(params: {
  connection: BotConnectionState;
  phone?: string | null;
  error?: string | null;
}): Promise<void> {
  const now = new Date();
  const isOpen = params.connection === "open";

  await prisma.botStatus.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      connection: params.connection,
      phone: params.phone ?? null,
      lastSeenAt: now,
      connectedAt: isOpen ? now : null,
      lastError: params.error ?? null,
    },
    update: {
      connection: params.connection,
      ...(params.phone !== undefined ? { phone: params.phone } : {}),
      lastSeenAt: now,
      ...(isOpen ? { connectedAt: now } : {}),
      lastError: params.error ?? null,
    },
  });
}

/** Lightweight heartbeat: only bumps lastSeenAt while still connected. */
export async function touchBotHeartbeat(): Promise<void> {
  await prisma.botStatus.updateMany({
    where: { id: SINGLETON_ID, connection: "open" },
    data: { lastSeenAt: new Date() },
  });
}

/** Read the current status with `online` computed from connection + freshness. */
export async function getBotStatus(): Promise<BotStatusView> {
  const row = await prisma.botStatus.findUnique({ where: { id: SINGLETON_ID } });

  if (!row) {
    return {
      online: false,
      connection: "close",
      phone: null,
      lastSeenAt: null,
      connectedAt: null,
      lastError: null,
      staleMs: null,
    };
  }

  const staleMs = Date.now() - row.lastSeenAt.getTime();
  const online = row.connection === "open" && staleMs <= HEARTBEAT_STALE_MS;

  return {
    online,
    connection: row.connection as BotConnectionState,
    phone: row.phone,
    lastSeenAt: row.lastSeenAt.toISOString(),
    connectedAt: row.connectedAt?.toISOString() ?? null,
    lastError: row.lastError,
    staleMs,
  };
}
