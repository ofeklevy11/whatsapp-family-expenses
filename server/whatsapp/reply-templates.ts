import { formatCurrency } from "@/lib/format";
import { formatDateHe } from "@/lib/dates";
import type { ExpenseWithRelations } from "@/server/services/expense.service";
import type { MonthlyReport } from "@/server/services/report.service";
import type { RecurringReport } from "@/server/services/recurring.service";

const UNKNOWN = "לא זוהה";

function line(label: string, value: string): string {
  return `${label}: ${value}`;
}

export const replies = {
  accessDenied(): string {
    return [
      "שלום 👋",
      "המספר הזה אינו מורשה לשימוש בסוכן ההוצאות המשפחתי.",
      "",
      "הגישה מנוהלת על ידי מנהל המשפחה. אם לדעתך מגיעה לך גישה,",
      "פנה למנהל כדי שיוסיף את המספר שלך מתוך הדשבורד.",
    ].join("\n");
  },

  help(): string {
    return [
      "אני סוכן ההוצאות המשפחתי 🤖",
      "",
      "מה אפשר לעשות:",
      "",
      "• לרשום הוצאה — פשוט כתוב, למשל:",
      "   רמי לוי 342",
      "   דלק 280",
      "   נטפליקס 69 חודשי",
      "",
      '• סיכום חודשי — "סיכום חודש"',
      '• תקציב — "קבע תקציב חודשי 12000" / "תקציב סופר 3500"',
      '• הוצאות קבועות — "הוצאות קבועות"',
      '• מחיקה — "מחק אחרונה"',
      '• תיקון — "תקן אחרונה לקטגוריה עסק" / "תקן אחרונה סכום 420"',
      "",
      "אפשר גם לשלוח תמונה של קבלה או חשבונית 📸",
    ].join("\n");
  },

  joinAlreadyMember(familyName: string): string {
    return `אתה כבר חבר במשפחת ${familyName} 🙂\nאפשר פשוט לשלוח לי הוצאות.`;
  },

  expenseCreated(expense: ExpenseWithRelations): string {
    return [
      "נקלטה הוצאה ✅",
      "",
      line("עסק", expense.merchantName ?? UNKNOWN),
      line("סכום", formatCurrency(expense.amount, expense.currency)),
      line("קטגוריה", expense.category?.name ?? "אחר"),
      line("תאריך", formatDateHe(expense.expenseDate)),
      "",
      "לתיקון:",
      "תקן אחרונה לקטגוריה X",
      "",
      "למחיקה:",
      "מחק אחרונה",
    ].join("\n");
  },

  expenseNeedsReview(expense: ExpenseWithRelations): string {
    const amount =
      expense.amount > 0 ? formatCurrency(expense.amount, expense.currency) : UNKNOWN;
    return [
      "קיבלתי את ההוצאה, אבל צריך בדיקה ⚠️",
      "",
      line("סכום", amount),
      line("עסק", expense.merchantName ?? UNKNOWN),
      line("קטגוריה משוערת", expense.category?.name ?? "אחר"),
      "",
      "אפשר לתקן עם:",
      "תקן אחרונה סכום 120",
      "תקן אחרונה לקטגוריה סופר ומזון",
    ].join("\n");
  },

  expenseNoAmount(): string {
    return [
      "לא הצלחתי לזהות סכום בהודעה.",
      "",
      "נסה לשלוח למשל:",
      "סופר 250",
      "דלק 300",
      "קפה 18",
    ].join("\n");
  },

  deleteLastSuccess(expense: ExpenseWithRelations): string {
    return [
      "ההוצאה האחרונה נמחקה 🗑️",
      "",
      line("עסק", expense.merchantName ?? UNKNOWN),
      line("סכום", formatCurrency(expense.amount, expense.currency)),
    ].join("\n");
  },

  deleteLastNone(): string {
    return "לא מצאתי הוצאה אחרונה למחיקה.";
  },

  fixLastSuccess(expense: ExpenseWithRelations): string {
    return [
      "ההוצאה עודכנה ✏️",
      "",
      line("עסק", expense.merchantName ?? UNKNOWN),
      line("סכום", formatCurrency(expense.amount, expense.currency)),
      line("קטגוריה", expense.category?.name ?? "אחר"),
      line("תאריך", formatDateHe(expense.expenseDate)),
    ].join("\n");
  },

  fixLastNone(): string {
    return "לא מצאתי הוצאה אחרונה לתיקון.";
  },

  budgetOverallSet(amount: number, currency: string): string {
    return `נקבע תקציב חודשי כללי: ${formatCurrency(amount, currency)} ✅`;
  },

  budgetCategorySet(categoryName: string, amount: number, currency: string): string {
    return `נקבע תקציב לקטגוריה "${categoryName}": ${formatCurrency(amount, currency)} ✅`;
  },

  monthlyReport(report: MonthlyReport): string {
    const lines: string[] = [
      `סיכום ${report.monthName}`,
      "",
      line("סה״כ הוצאות", formatCurrency(report.totalAmount, report.currency)),
      line("מספר הוצאות", String(report.totalExpensesCount)),
    ];

    if (report.byCategory.length) {
      lines.push("", "לפי קטגוריות:");
      for (const c of report.byCategory.slice(0, 6)) {
        lines.push(`${c.label}: ${formatCurrency(c.amount, report.currency)}`);
      }
    }

    const top = report.topExpenses[0];
    if (top) {
      lines.push(
        "",
        "הוצאה הכי גבוהה:",
        `${top.merchant} — ${formatCurrency(top.amount, report.currency)}`,
      );
    }

    if (report.insights.length) {
      lines.push("", "תובנות:");
      for (const insight of report.insights) lines.push(`• ${insight}`);
    }

    return lines.join("\n");
  },

  recurringReport(report: RecurringReport, currency: string): string {
    if (report.items.length === 0) {
      return "עוד לא זיהיתי הוצאות קבועות. צריך לפחות 3 חיובים דומים מאותו עסק.";
    }

    const lines: string[] = ["הוצאות קבועות מזוהות:", ""];
    for (const item of report.items) {
      lines.push(
        `${item.merchantName} — כ־${formatCurrency(item.monthlyEquivalent, currency)} בחודש`,
      );
    }
    lines.push("", line("סה״כ קבועים", formatCurrency(report.totalMonthly, currency)));
    return lines.join("\n");
  },

  mediaNotReceipt(): string {
    return [
      "קיבלתי את הקובץ 📎",
      "אבל לא נראה שזו קבלה/חשבונית, אז לא רשמתי הוצאה.",
      "",
      "אם זו בכל זאת הוצאה, אפשר לכתוב לי אותה ידנית, למשל:",
      "סופר 250",
    ].join("\n");
  },

  genericError(): string {
    return "אופס, משהו השתבש בעיבוד ההודעה 😕 נסה שוב בעוד רגע.";
  },
};
