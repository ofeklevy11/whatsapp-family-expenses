/**
 * Minimal, dependency-light logger used across the app and bot.
 * (Baileys uses its own pino logger, configured in baileys.client.ts.)
 */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, scope: string, message: string, meta?: unknown) {
  const time = new Date().toISOString();
  const prefix = `[${time}] [${level.toUpperCase()}] [${scope}]`;
  const fn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (meta !== undefined) {
    fn(prefix, message, meta);
  } else {
    fn(prefix, message);
  }
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, meta?: unknown) => {
      if (process.env.NODE_ENV !== "production") emit("debug", scope, msg, meta);
    },
    info: (msg: string, meta?: unknown) => emit("info", scope, msg, meta),
    warn: (msg: string, meta?: unknown) => emit("warn", scope, msg, meta),
    error: (msg: string, meta?: unknown) => emit("error", scope, msg, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
