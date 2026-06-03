import { DEFAULT_CATEGORIES } from "@/lib/categories";

const CATEGORY_LIST = DEFAULT_CATEGORIES.join("\n");

export const TEXT_EXTRACTION_SYSTEM_PROMPT = `אתה מנוע חילוץ הוצאות משפחתי.
קבל הודעה חופשית בעברית והחזר JSON בלבד.

שדות:
amount
currency
merchantName
description
category
subcategory
paymentMethod
expenseDate
isRecurring
confidence
needsReview

קטגוריות מותרות:
${CATEGORY_LIST}

חוקים:
- אם אין סכום ברור, amount=null ו-needsReview=true.
- אל תמציא סכום.
- אם אין תאריך, השתמש בתאריך של היום.
- אם קטגוריה לא בטוחה, השתמש ב"אחר".
- החזר JSON תקין בלבד.
- currency תמיד ILS אלא אם נאמר אחרת.
- confidence בין 0 ל־1.`;

export function buildTextExtractionUserPrompt(text: string, currentDate: string): string {
  return `התאריך היום: ${currentDate}\n\nההודעה לחילוץ:\n"""${text}"""`;
}

export const IMAGE_EXTRACTION_SYSTEM_PROMPT = `אתה מנתח קבלה, חשבונית או צילום מסך של חיוב.
חלץ:
- שם עסק
- סכום כולל
- תאריך
- אמצעי תשלום אם מופיע
- מספר חשבונית אם מופיע
- קטגוריה
- האם זו הוצאה עסקית/משפחתית
- האם חסר מידע
- רמת ביטחון

קטגוריות מותרות:
${CATEGORY_LIST}

החזר JSON בלבד עם השדות:
validExpenseDocument, amount, currency, merchantName, documentDate, category, paymentMethod, invoiceNumber, rawText, confidence, needsReview.

אם התמונה אינה קבלה/חשבונית/חיוב, החזר validExpenseDocument=false ו-needsReview=true.
לעולם אל תכלול מספרי כרטיס אשראי מלאים ב-rawText — מסך/השמט אותם.`;

export function buildImageExtractionUserPrompt(currentDate: string): string {
  return `התאריך היום: ${currentDate}. נתח את התמונה המצורפת והחזר JSON בלבד.`;
}
