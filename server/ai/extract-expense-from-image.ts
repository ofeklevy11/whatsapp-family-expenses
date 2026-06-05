import { promises as fs } from "node:fs";
import OpenAI from "openai";
import { z } from "zod";
import { env, hasOpenAI } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { clamp } from "@/lib/utils";
import { redactSensitive } from "@/lib/redact";
import { normalizeCategory } from "./classify-expense";
import {
  IMAGE_EXTRACTION_SYSTEM_PROMPT,
  buildImageExtractionUserPrompt,
} from "./prompts";

const logger = createLogger("ai:image");

export const ExtractedExpenseFromImageSchema = z.object({
  validExpenseDocument: z.boolean(),
  amount: z.number().nullable(),
  currency: z.string().default("ILS"),
  merchantName: z.string().nullable(),
  documentDate: z.string().nullable(),
  category: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  rawText: z.string().nullable(),
  confidence: z.number(),
  needsReview: z.boolean(),
});

export type ExtractedExpenseFromImage = z.infer<
  typeof ExtractedExpenseFromImageSchema
>;

export interface ExtractImageInput {
  filePath: string;
  mimeType: string;
  currentDate: string;
}

/** Result returned when Vision is unavailable or cannot process the file. */
function placeholder(currentDate: string): ExtractedExpenseFromImage {
  return {
    validExpenseDocument: false,
    amount: null,
    currency: "ILS",
    merchantName: null,
    documentDate: currentDate,
    category: null,
    paymentMethod: null,
    invoiceNumber: null,
    rawText: null,
    confidence: 0,
    needsReview: true,
  };
}

/**
 * Extract a structured expense from a receipt / invoice / billing screenshot.
 *
 * - With an OpenAI key and an image mimetype, runs Vision extraction.
 * - Otherwise returns a placeholder flagged needsReview, so the file is
 *   still saved and the user is asked to confirm the details manually.
 */
export async function extractExpenseFromImage(
  input: ExtractImageInput,
): Promise<ExtractedExpenseFromImage> {
  const isImage = input.mimeType.startsWith("image/");

  if (!hasOpenAI || !isImage) {
    return placeholder(input.currentDate);
  }

  try {
    return await extractWithVision(input);
  } catch (error) {
    logger.warn("OpenAI vision extraction failed, returning placeholder", error);
    return placeholder(input.currentDate);
  }
}

async function extractWithVision(
  input: ExtractImageInput,
): Promise<ExtractedExpenseFromImage> {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const buffer = await fs.readFile(input.filePath);
  const base64 = buffer.toString("base64");

  const completion = await client.chat.completions.create({
    model: env.OPENAI_VISION_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: IMAGE_EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: buildImageExtractionUserPrompt(input.currentDate) },
          {
            type: "image_url",
            // "high" sends the image at full resolution (tiled) — materially
            // better OCR on crumpled / low-light / rotated receipts.
            image_url: { url: `data:${input.mimeType};base64,${base64}`, detail: "high" },
          },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty vision completion");

  const raw = JSON.parse(content) as Record<string, unknown>;

  const amount =
    typeof raw.amount === "number"
      ? raw.amount
      : typeof raw.amount === "string"
        ? Number((raw.amount as string).replace(",", "."))
        : null;

  const confidence = clamp(
    typeof raw.confidence === "number" ? raw.confidence : 0.5,
    0,
    1,
  );

  const result: ExtractedExpenseFromImage = {
    validExpenseDocument: raw.validExpenseDocument !== false,
    amount: Number.isFinite(amount) ? amount : null,
    currency: typeof raw.currency === "string" ? raw.currency : "ILS",
    merchantName: asStringOrNull(raw.merchantName),
    documentDate: asStringOrNull(raw.documentDate) ?? input.currentDate,
    category: normalizeCategory(asStringOrNull(raw.category)),
    paymentMethod: asStringOrNull(raw.paymentMethod),
    invoiceNumber: asStringOrNull(raw.invoiceNumber),
    // Redact any card-like numbers before this text is ever persisted.
    rawText: redactSensitive(asStringOrNull(raw.rawText)),
    confidence,
    needsReview:
      Boolean(raw.needsReview) || amount === null || confidence < 0.5,
  };

  return ExtractedExpenseFromImageSchema.parse(result);
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
