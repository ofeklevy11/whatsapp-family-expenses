import { z } from "zod";

/**
 * Centralised, validated access to environment variables.
 * Server-only. Do NOT import this from client components.
 *
 * In the Next.js app, env vars are loaded automatically from `.env`.
 * In the standalone bot script we load them via `dotenv/config`
 * (see scripts/whatsapp-bot.ts) before this module is imported.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_TEXT_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_VISION_MODEL: z.string().default("gpt-4o-mini"),

  OWNER_PHONE: z.string().optional().default(""),

  DEFAULT_FAMILY_NAME: z.string().default("משפחת Levy"),
  DEFAULT_INVITE_CODE: z.string().default("ABC123"),
  DEFAULT_CURRENCY: z.string().default("ILS"),

  UPLOADS_DIR: z.string().default("uploads"),
  WHATSAPP_AUTH_DIR: z.string().default("auth"),

  // Dashboard login
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().optional().default(""),
  AUTH_SECRET: z.string().optional().default(""),
  SESSION_DAYS: z.coerce.number().int().positive().default(7),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`❌ Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;

/** True when an OpenAI key is configured (enables AI extraction). */
export const hasOpenAI = env.OPENAI_API_KEY.trim().length > 0;
