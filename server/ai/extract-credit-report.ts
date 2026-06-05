import { promises as fs } from "node:fs";
import OpenAI from "openai";
import { z } from "zod";
import { env, hasOpenAI } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { clamp } from "@/lib/utils";
import { normalizeCategory } from "./classify-expense";
import {
  CREDIT_REPORT_SYSTEM_PROMPT,
  buildCreditReportTextUserPrompt,
  buildCreditReportImageUserPrompt,
} from "./prompts";

const logger = createLogger("ai:credit-report");

export const CreditReportTransactionSchema = z.object({
  date: z.string().nullable(),
  merchantName: z.string().nullable(),
  amount: z.number(),
  currency: z.string().default("ILS"),
  category: z.string().nullable(),
  paymentMethod: z.string().nullable(),
});

export type CreditReportTransaction = z.infer<
  typeof CreditReportTransactionSchema
>;

export interface CreditReportResult {
  transactions: CreditReportTransaction[];
  confidence: number;
  /** True when no AI ran or the document yielded nothing usable. */
  empty: boolean;
}

export interface ExtractCreditReportInput {
  filePath: string;
  mimeType: string;
  currentDate: string;
}

/**
 * Extract every transaction line from a credit-card statement / report.
 *
 *  - PDF  → text is extracted with pdf-parse, then parsed by the text model.
 *  - image → parsed directly by the vision model.
 *
 * Returns an empty result (rather than throwing) when AI is unavailable or the
 * file can't be parsed, so the caller can surface a friendly message and the
 * uploaded file is still kept.
 */
export async function extractCreditReport(
  input: ExtractCreditReportInput,
): Promise<CreditReportResult> {
  if (!hasOpenAI) return emptyResult();

  try {
    const isPdf = input.mimeType.includes("pdf");
    const raw = isPdf
      ? await extractFromPdf(input)
      : await extractFromImage(input);
    return normalize(raw);
  } catch (error) {
    logger.warn("credit report extraction failed", error);
    return emptyResult();
  }
}

function emptyResult(): CreditReportResult {
  return { transactions: [], confidence: 0, empty: true };
}

function client(): OpenAI {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

async function extractFromPdf(
  input: ExtractCreditReportInput,
): Promise<Record<string, unknown>> {
  // Import the implementation directly to avoid pdf-parse's debug harness.
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
    b: Buffer,
  ) => Promise<{ text: string }>;
  const buffer = await fs.readFile(input.filePath);
  const { text } = await pdfParse(buffer);

  if (!text || text.trim().length < 10) {
    throw new Error("PDF produced no extractable text");
  }

  const completion = await client().chat.completions.create({
    model: env.OPENAI_TEXT_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CREDIT_REPORT_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildCreditReportTextUserPrompt(text, input.currentDate),
      },
    ],
  });

  return parseContent(completion.choices[0]?.message?.content);
}

async function extractFromImage(
  input: ExtractCreditReportInput,
): Promise<Record<string, unknown>> {
  const buffer = await fs.readFile(input.filePath);
  const base64 = buffer.toString("base64");

  const completion = await client().chat.completions.create({
    model: env.OPENAI_VISION_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CREDIT_REPORT_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildCreditReportImageUserPrompt(input.currentDate),
          },
          {
            type: "image_url",
            image_url: { url: `data:${input.mimeType};base64,${base64}` },
          },
        ],
      },
    ],
  });

  return parseContent(completion.choices[0]?.message?.content);
}

function parseContent(content: string | null | undefined): Record<string, unknown> {
  if (!content) throw new Error("Empty completion");
  return JSON.parse(content) as Record<string, unknown>;
}

function normalize(raw: Record<string, unknown>): CreditReportResult {
  const list = Array.isArray(raw.transactions) ? raw.transactions : [];

  const transactions: CreditReportTransaction[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;

    const amount =
      typeof row.amount === "number"
        ? Math.abs(row.amount)
        : typeof row.amount === "string"
          ? Math.abs(Number((row.amount as string).replace(/[^0-9.-]/g, "")))
          : NaN;
    if (!Number.isFinite(amount) || amount <= 0) continue;

    transactions.push(
      CreditReportTransactionSchema.parse({
        date: asStringOrNull(row.date),
        merchantName: asStringOrNull(row.merchantName),
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        currency: typeof row.currency === "string" ? row.currency : "ILS",
        category: normalizeCategory(asStringOrNull(row.category)),
        paymentMethod: asStringOrNull(row.paymentMethod) ?? "אשראי",
      }),
    );
  }

  const confidence = clamp(
    typeof raw.confidence === "number" ? raw.confidence : 0.6,
    0,
    1,
  );

  return { transactions, confidence, empty: transactions.length === 0 };
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
