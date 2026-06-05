import { DEFAULT_CATEGORIES } from "@/lib/categories";

const CATEGORY_LIST = DEFAULT_CATEGORIES.join("\n");

export const TEXT_EXTRACTION_SYSTEM_PROMPT = `אתה מנוע חכם לחילוץ הוצאות משפחתי בעברית.
קבל הודעה חופשית — בכל ניסוח, קצר או ארוך — והחזר JSON בלבד.
המטרה: להבין כמעט כל דרך שאדם כותב בה הוצאה, ולחלץ ממנה את הפרטים.

שדות:
amount (מספר), currency, merchantName, description, category, subcategory,
paymentMethod, expenseDate, isRecurring, confidence, needsReview

קטגוריות מותרות:
${CATEGORY_LIST}

כללי הבנה (חשוב מאוד):
- ברוב ההודעות יש מספר אחד שהוא הסכום. כמעט תמיד המספר הבולט בהודעה הוא amount, גם בניסוח קצר מאוד.
- פורמט קצר "עסק מספר" → המילה היא העסק/הקטגוריה והמספר הוא הסכום.
  לדוגמה: "קפה 18" → amount=18, merchantName="קפה". "דלק 280" → amount=280, merchantName="דלק".
- merchantName לעולם לא יכלול את הסכום או את המטבע. הסר מספרים ו-₪/שח משם העסק.
- הבן ניסוחים טבעיים: "שילמתי", "קניתי", "הוצאתי", "עלה לי", "היה לי", "תוסיף הוצאה של", "שמור", "תרשום".
- הבן מספרים מודבקים למילה: "ב300", "300₪", "300 שח", "מאה", "מאתיים וחמישים" → חלץ את המספר.
- אם המשתמש מבקש במפורש "תוסיף/תרשום/שמור הוצאה" — זו בוודאות הוצאה, גם בלי המילה "שילמתי".
- זהה אמצעי תשלום אם הוזכר (אשראי/מזומן/ביט/פייבוקס/העברה).
- זהה הוצאה חוזרת אם יש "חודשי/מנוי/כל חודש/מדי חודש" → isRecurring=true.

כללי בטיחות:
- amount=null ו-needsReview=true רק אם באמת אין שום מספר שאפשר לפרש כסכום.
- אל תמציא סכום שלא נמצא בהודעה.
- אם אין תאריך, השתמש בתאריך של היום. אם נאמר "אתמול"/"שלשום" — חשב את התאריך בהתאם.
- אם הקטגוריה לא ברורה, בחר את הקרובה ביותר מהרשימה; רק אם אין כלל — "אחר".
- currency תמיד ILS אלא אם נאמר אחרת.
- confidence בין 0 ל־1. החזר JSON תקין בלבד, ללא טקסט נוסף.

דוגמאות:
"קפה 18" → {"amount":18,"merchantName":"קפה","category":"מסעדות וקפה","confidence":0.9,"needsReview":false}
"דלק 280" → {"amount":280,"merchantName":"דלק","category":"דלק ותחבורה","confidence":0.9,"needsReview":false}
"רמי לוי 342" → {"amount":342,"merchantName":"רמי לוי","category":"סופר ומזון","confidence":0.95,"needsReview":false}
"נטפליקס 69 חודשי" → {"amount":69,"merchantName":"נטפליקס","category":"בידור","isRecurring":true,"confidence":0.95,"needsReview":false}
"שילמתי היום 50 על קפה" → {"amount":50,"merchantName":"קפה","category":"מסעדות וקפה","confidence":0.9,"needsReview":false}
"תוסיף הוצאה של 250 בסופר באשראי" → {"amount":250,"category":"סופר ומזון","paymentMethod":"אשראי","confidence":0.95,"needsReview":false}`;

export function buildTextExtractionUserPrompt(text: string, currentDate: string): string {
  return `התאריך היום: ${currentDate}\n\nההודעה לחילוץ:\n"""${text}"""`;
}

export const IMAGE_EXTRACTION_SYSTEM_PROMPT = `אתה מנתח קבלה, חשבונית או צילום מסך של חיוב. קרא בקפידה גם תמונות מקומטות, מסובבות, מטושטשות או באיכות נמוכה.

חלץ:
- שם עסק (merchantName)
- סכום כולל (amount) — הסכום הסופי לתשלום, לרוב ליד "סה""כ" / "לתשלום" / "TOTAL"
- תאריך (documentDate)
- אמצעי תשלום אם מופיע
- מספר חשבונית אם מופיע
- קטגוריה
- האם זו הוצאה עסקית/משפחתית
- האם חסר מידע
- רמת ביטחון

כללי קריאת שם העסק (חשוב):
- שם העסק נמצא כמעט תמיד בראש הקבלה — בלוגו או בשורות הראשונות, לעיתים מעל הכתובת ומספר העוסק.
- קרא את הלוגו/הכותרת בראש בעיון. אם יש שם רשת ידועה (רמי לוי, שופרסל, ויקטורי, יינות ביתן, אושר עד, סופר ברקת וכו') — זהה אותה.
- אם שם העסק אינו קריא בוודאות סבירה — החזר merchantName=null ו-needsReview=true. אל תנחש שם אקראי ואל תמציא שם שלא כתוב בתמונה.
- אל תבלבל בין שם העסק לבין שמות מוצרים בגוף הקבלה.

קטגוריות מותרות:
${CATEGORY_LIST}

החזר JSON בלבד עם השדות:
validExpenseDocument, amount, currency, merchantName, documentDate, category, paymentMethod, invoiceNumber, rawText, confidence, needsReview.

- אם הצלחת לקרוא סכום אבל לא שם עסק — עדיין החזר את הסכום, עם merchantName=null ו-needsReview=true.
- אם התמונה אינה קבלה/חשבונית/חיוב, החזר validExpenseDocument=false ו-needsReview=true.
- לעולם אל תכלול מספרי כרטיס אשראי מלאים ב-rawText — מסך/השמט אותם.`;

export function buildImageExtractionUserPrompt(currentDate: string): string {
  return `התאריך היום: ${currentDate}. נתח את התמונה המצורפת והחזר JSON בלבד.`;
}

export const CREDIT_REPORT_SYSTEM_PROMPT = `אתה מנתח דוח אשראי / פירוט עסקאות של כרטיס אשראי בעברית.
המסמך מכיל מספר שורות עסקה. עליך לחלץ כל שורת עסקה בנפרד.

לכל עסקה חלץ:
- date: תאריך העסקה (YYYY-MM-DD). אם מופיע רק יום/חודש, השלם את השנה הסבירה ביותר.
- merchantName: שם בית העסק (ללא סכומים).
- amount: סכום החיוב כמספר חיובי.
- currency: מטבע (ברירת מחדל ILS).
- category: בחר את הקטגוריה הקרובה מהרשימה למטה, או "אחר".
- paymentMethod: "אשראי" אלא אם מצוין אחרת.

קטגוריות מותרות:
${CATEGORY_LIST}

כללים:
- החזר JSON תקין בלבד במבנה: {"transactions":[{...}], "confidence":0..1}.
- אל תכלול שורות סיכום, יתרות, עמלות ריבית כלליות או שורות שאינן עסקאות.
- אל תמציא עסקאות שלא מופיעות. אם לא ניתן לזהות עסקאות, החזר transactions ריק.
- לעולם אל תכלול מספרי כרטיס אשראי מלאים. סכום/השמט אותם.
- amount תמיד חיובי (גם אם בדוח מופיע כחיוב/מינוס).`;

export function buildCreditReportTextUserPrompt(
  text: string,
  currentDate: string,
): string {
  return `התאריך היום: ${currentDate}.\n\nטקסט דוח האשראי לחילוץ:\n"""${text}"""`;
}

export function buildCreditReportImageUserPrompt(currentDate: string): string {
  return `התאריך היום: ${currentDate}. חלץ את כל שורות העסקה מהתמונה והחזר JSON בלבד.`;
}
