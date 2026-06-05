import { NextRequest, NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { getSession } from "@/lib/auth/auth";
import { getPrimaryFamily } from "@/server/services/family.service";
import { storage } from "@/server/storage/local-storage.service";
import { extractCreditReport } from "@/server/ai/extract-credit-report";
import { createExpensesFromCreditReport } from "@/server/services/expense.service";
import { todayISO } from "@/lib/dates";
import { createLogger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const logger = createLogger("api:credit-reports");

const ACCEPTED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAX_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Upload one or more credit-card statements. Each file is stored, parsed into
 * its individual transactions, and synced into the family's expenses.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const family = await getPrimaryFamily();
  if (!family) {
    return NextResponse.json({ error: "no_family" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }

  const userIdRaw = String(form.get("userId") ?? "").trim();
  const userId = userIdRaw || null;

  const results: {
    fileName: string;
    created: number;
    status: "ok" | "empty" | "rejected";
    message?: string;
  }[] = [];

  for (const file of files) {
    if (!ACCEPTED.has(file.type)) {
      results.push({
        fileName: file.name,
        created: 0,
        status: "rejected",
        message: "סוג קובץ לא נתמך (PDF או תמונה בלבד).",
      });
      continue;
    }
    if (file.size > MAX_BYTES) {
      results.push({
        fileName: file.name,
        created: 0,
        status: "rejected",
        message: "הקובץ גדול מדי (עד 15MB).",
      });
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const saved = await storage.saveFile({
        buffer,
        fileName: file.name,
        mimeType: file.type,
        familyId: family.id,
      });

      const extracted = await extractCreditReport({
        filePath: saved.path,
        mimeType: file.type,
        currentDate: todayISO(),
      });

      if (extracted.empty) {
        results.push({
          fileName: file.name,
          created: 0,
          status: "empty",
          message: "לא זוהו עסקאות אוטומטית. נסו תמונה ברורה יותר או הוסיפו ידנית.",
        });
        continue;
      }

      const created = await createExpensesFromCreditReport({
        familyId: family.id,
        userId,
        fileUrl: saved.url,
        mimeType: file.type,
        transactions: extracted.transactions,
        confidence: extracted.confidence,
      });

      results.push({
        fileName: file.name,
        created: created.length,
        status: "ok",
      });
    } catch (error) {
      logger.error("failed to process credit report", error);
      results.push({
        fileName: file.name,
        created: 0,
        status: "rejected",
        message: "שגיאה בעיבוד הקובץ.",
      });
    }
  }

  const totalCreated = results.reduce((s, r) => s + r.created, 0);
  return NextResponse.json({ totalCreated, results });
}
