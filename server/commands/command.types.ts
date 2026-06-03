export type Intent =
  | "JOIN_FAMILY"
  | "CREATE_EXPENSE"
  | "MONTHLY_REPORT"
  | "SET_BUDGET"
  | "DELETE_LAST_EXPENSE"
  | "FIX_LAST_EXPENSE"
  | "RECURRING_REPORT"
  | "HELP";

export interface FixUpdates {
  amount?: number;
  categoryName?: string;
  merchantName?: string;
}

export type ParsedCommand =
  | { intent: "JOIN_FAMILY"; code: string }
  | { intent: "CREATE_EXPENSE"; text: string }
  | { intent: "MONTHLY_REPORT"; monthKey?: string }
  | {
      intent: "SET_BUDGET";
      scope: "overall" | "category";
      categoryName?: string;
      amount: number;
    }
  | { intent: "DELETE_LAST_EXPENSE" }
  | { intent: "FIX_LAST_EXPENSE"; updates: FixUpdates }
  | { intent: "RECURRING_REPORT" }
  | { intent: "HELP" };
