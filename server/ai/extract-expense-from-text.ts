import OpenAI from "openai";
import { z } from "zod";
import { env, hasOpenAI } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { clamp } from "@/lib/utils";
import { classifyByKeywords, normalizeCategory } from "./classify-expense";
import {
  TEXT_EXTRACTION_SYSTEM_PROMPT,
  buildTextExtractionUserPrompt,
} from "./prompts";

const logger = createLogger("ai:text");

export const ExtractedExpenseSchema = z.object({
  amount: z.number().nullable(),
  currency: z.string().default("ILS"),
  merchantName: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  expenseDate: z.string().nullable(),
  isRecurring: z.boolean(),
  confidence: z.number(),
  needsReview: z.boolean(),
});

export type ExtractedExpense = z.infer<typeof ExtractedExpenseSchema>;

export interface ExtractExpenseInput {
  text: string;
  currentDate: string; // ISO date "YYYY-MM-DD"
}

/** Coerce an unknown value to a positive number or null. */
function coerceAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

/**
 * Apply shared business rules to any extraction result (AI or regex):
 * fill the date, normalise the category, flag for review when low-confidence.
 */
function finalize(
  partial: Partial<ExtractedExpense> & { confidence: number },
  input: ExtractExpenseInput,
): ExtractedExpense {
  const amount = partial.amount ?? null;
  const confidence = clamp(partial.confidence, 0, 1);
  const category = normalizeCategory(
    partial.category ??
      classifyByKeywords(input.text, partial.merchantName ?? undefined),
  );

  return {
    amount,
    currency: partial.currency ?? "ILS",
    merchantName: partial.merchantName ?? null,
    description: partial.description ?? null,
    category,
    subcategory: partial.subcategory ?? null,
    paymentMethod: partial.paymentMethod ?? null,
    expenseDate: partial.expenseDate ?? input.currentDate,
    isRecurring: partial.isRecurring ?? false,
    confidence,
    needsReview: Boolean(partial.needsReview) || amount === null || confidence < 0.5,
  };
}

/** Public entry point: extract a structured expense from free Hebrew text. */
export async function extractExpenseFromText(
  input: ExtractExpenseInput,
): Promise<ExtractedExpense> {
  if (hasOpenAI) {
    try {
      return await extractWithOpenAI(input);
    } catch (error) {
      logger.warn("OpenAI text extraction failed, using regex fallback", error);
    }
  }
  return regexExtract(input);
}

async function extractWithOpenAI(
  input: ExtractExpenseInput,
): Promise<ExtractedExpense> {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: env.OPENAI_TEXT_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: TEXT_EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildTextExtractionUserPrompt(input.text, input.currentDate),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty completion from OpenAI");

  const raw = JSON.parse(content) as Record<string, unknown>;

  const candidate = {
    amount: coerceAmount(raw.amount),
    currency: coerceString(raw.currency) ?? "ILS",
    merchantName: coerceString(raw.merchantName),
    description: coerceString(raw.description),
    category: coerceString(raw.category),
    subcategory: coerceString(raw.subcategory),
    paymentMethod: coerceString(raw.paymentMethod),
    expenseDate: coerceString(raw.expenseDate),
    isRecurring: Boolean(raw.isRecurring),
    confidence:
      typeof raw.confidence === "number" ? raw.confidence : 0.6,
    needsReview: Boolean(raw.needsReview),
  };

  return finalize(ExtractedExpenseSchema.partial().parse(candidate) as ExtractedExpense, input);
}

const STOPWORDS = new Set([
  "שילמתי", "שילמנו", "קניתי", "קנינו", "הוצאתי", "על", "עבור", "של",
  "היום", "אתמול", "ב", "את", "ה",
  // recurring / payment noise that shouldn't become part of the merchant name
  "חודשי", "חודש", "מנוי", "כל", "מדי", "אשראי", "מזומן", "ביט", "שח",
]);

const PAYMENT_HINTS: Array<[RegExp, string]> = [
  [/אשראי|כרטיס/, "אשראי"],
  [/מזומן/, "מזומן"],
  [/ביט|bit/i, "ביט"],
  [/פייבוקס|paybox/i, "פייבוקס"],
  [/העברה|בנקאי/, "העברה בנקאית"],
];

/** Local, offline extractor used when no OpenAI key is configured. */
function regexExtract(input: ExtractExpenseInput): ExtractedExpense {
  const { text } = input;

  const amounts = [...text.matchAll(/\d+(?:[.,]\d+)?/g)]
    .map((m) => Number(m[0].replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);
  const amount = amounts.length ? Math.max(...amounts) : null;

  const merchantWords = text
    .split(/\s+/)
    .filter((w) => !/\d/.test(w) && !STOPWORDS.has(w) && !/^[₪]$/.test(w));
  const merchantName = merchantWords.slice(0, 3).join(" ").trim() || null;

  let paymentMethod: string | null = null;
  for (const [re, label] of PAYMENT_HINTS) {
    if (re.test(text)) {
      paymentMethod = label;
      break;
    }
  }

  const isRecurring = /חודשי|מנוי|כל חודש|מדי חודש/.test(text);

  return finalize(
    {
      amount,
      currency: "ILS",
      merchantName,
      description: null,
      category: classifyByKeywords(text, merchantName),
      subcategory: null,
      paymentMethod,
      expenseDate: input.currentDate,
      isRecurring,
      confidence: amount === null ? 0.2 : 0.45,
      needsReview: amount === null,
    },
    input,
  );
}
