import OpenAI from "openai";
import { env, hasOpenAI } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { todayISO } from "@/lib/dates";
import { AGENT_TOOLS, executeTool, type ToolContext } from "./tools";

const logger = createLogger("ai:agent");

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Short rolling conversation memory per user, kept in-process. The bot runs as
 * a long-lived Node process, so this survives across messages within a session
 * and lets the agent handle follow-ups ("ומה לגבי אתמול?").
 */
const HISTORY = new Map<string, ChatMessage[]>();
const MAX_HISTORY = 12; // user/assistant turns retained (excludes system)
const MAX_TOOL_ITERATIONS = 5;

function systemPrompt(): string {
  return `אתה עוזר הוצאות משפחתי חכם וחברותי בוואטסאפ, מדבר עברית טבעית וזורמת.
התאריך היום: ${todayISO()}.

תפקידך:
- לנהל שיחה טבעית: המשתמש יכול לכתוב כל דבר — לרשום הוצאה, לשאול שאלה, לבקש סיכום, או סתם לפטפט.
- כשצריך נתונים אמיתיים (סכומים, סיכומים, רשימות, תקציב) — תמיד השתמש בכלים. לעולם אל תמציא מספרים.
- כשהמשתמש מדווח על הוצאה ("רמי לוי 342", "שילמתי 50 על קפה") — קרא ל-log_expense.
- "סיכום יומי" → summarize_expenses עם period='today'. "השבוע" → 'this_week'. "החודש" → 'this_month'. תאריכים מפורשים → from/to.
- ענה תמיד בעברית, בקצרה וברור, מתאים לוואטסאפ. אפשר אימוג'ים במידה. אל תשתמש בטבלאות Markdown.
- הצג סכומים עם ₪. כשיש פילוח לפי קטגוריות, הצג כרשימה קצרה עם הסכומים הבולטים.
- אם כלי מחזיר created=false עם no_amount_detected — הסבר בעדינות שלא זוהה סכום ובקש ניסוח כמו "סופר 250".
- אם אין נתונים לטווח שביקש — אמור זאת בכנות ואל תמציא.
- היה יזום: כשמתאים, הוסף תובנה קצרה (קטגוריה דומיננטית, חריגה מהרגיל), אבל בלי להעמיס.

מטרה: שהמשתמש ירגיש שהוא מדבר עם עוזר אישי חכם, לא עם תפריט פקודות.`;
}

function getHistory(userId: string): ChatMessage[] {
  return HISTORY.get(userId) ?? [];
}

function remember(userId: string, userText: string, assistantText: string): void {
  const next = [
    ...getHistory(userId),
    { role: "user", content: userText } as ChatMessage,
    { role: "assistant", content: assistantText } as ChatMessage,
  ];
  // Keep only the most recent turns.
  HISTORY.set(userId, next.slice(-MAX_HISTORY));
}

/**
 * Run the conversational agent for one user message. Returns the natural-language
 * reply. Throws only on unexpected failures (the caller falls back to commands).
 */
export async function runExpenseAgent(
  ctx: ToolContext,
  userText: string,
): Promise<string> {
  if (!hasOpenAI) throw new Error("OpenAI not configured");

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt() },
    ...getHistory(ctx.userId),
    { role: "user", content: userText },
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const completion = await client.chat.completions.create({
      model: env.OPENAI_TEXT_MODEL,
      temperature: 0.3,
      messages,
      tools: AGENT_TOOLS,
      tool_choice: "auto",
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    // No tool calls → this is the final natural-language reply.
    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      const reply = choice.content?.trim() || "לא הבנתי, אפשר לנסח שוב?";
      remember(ctx.userId, userText, reply);
      return reply;
    }

    // Otherwise, run the requested tools and feed results back.
    messages.push(choice);
    for (const call of choice.tool_calls) {
      if (call.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }

      logger.info(`tool ${call.function.name}(${call.function.arguments ?? ""})`);
      const result = await executeTool(call.function.name, args, ctx);

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Exhausted iterations — ask the model for a final summary without tools.
  const final = await client.chat.completions.create({
    model: env.OPENAI_TEXT_MODEL,
    temperature: 0.3,
    messages: [
      ...messages,
      {
        role: "user",
        content: "סכם בקצרה בעברית את התשובה למשתמש על סמך המידע שנאסף.",
      },
    ],
  });

  const reply =
    final.choices[0]?.message?.content?.trim() || "קרתה תקלה, אפשר לנסות שוב?";
  remember(ctx.userId, userText, reply);
  return reply;
}

/** Clear a user's conversation memory (e.g. on explicit "אפס שיחה"). */
export function clearAgentMemory(userId: string): void {
  HISTORY.delete(userId);
}
