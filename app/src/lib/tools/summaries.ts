import { supabaseServer } from "../supabase/server";
import { err, ok, ToolResponse } from "./types";
import { isNonEmptyString, isValidMonth } from "./validate";

type MonthSummary = {
  month: string;
  income_total_mxn_cents: number;
  expense_total_mxn_cents: number;
  variable_cap_mxn_cents: number;
  variable_spend_mxn_cents: number;
  variable_remaining_mxn_cents: number;
};

type CategorySummary = {
  month: string;
  categories: Array<{
    category: string;
    category_type: string;
    expense_total_mxn_cents: number;
  }>;
};

const DEFAULT_VARIABLE_CAP = 600000;

export async function get_month_summary(input: {
  user_id?: string;
  thread_id?: string;
  month?: string;
}): Promise<ToolResponse<MonthSummary>> {
  if (!input || !isNonEmptyString(input.user_id || "")) {
    return err("VALIDATION_ERROR", "user_id is required", { field: "user_id" });
  }
  if (!isNonEmptyString(input.thread_id || "")) {
    return err("VALIDATION_ERROR", "thread_id is required", { field: "thread_id" });
  }
  if (!isNonEmptyString(input.month || "") || !isValidMonth(input.month as string)) {
    return err("VALIDATION_ERROR", "month is invalid (expected YYYY-MM)", {
      field: "month",
    });
  }

  const month = input.month as string; // safe after validation
  const supabase = supabaseServer();
  const monthPrefix = `${month}-%`;

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("type, amount_mxn_cents, category_type")
    .eq("user_id", input.user_id)
    .eq("thread_id", input.thread_id)
    .like("date_iso", monthPrefix);

  if (txError) {
    return err("DB_ERROR", "Failed to fetch transactions");
  }

  let incomeTotal = 0;
  let expenseTotal = 0;
  let variableSpend = 0;

  for (const tx of transactions || []) {
    if (tx.type === "INCOME") incomeTotal += tx.amount_mxn_cents;
    if (tx.type === "EXPENSE") {
      expenseTotal += tx.amount_mxn_cents;
      if (tx.category_type === "VARIABLE") {
        variableSpend += tx.amount_mxn_cents;
      }
    }
  }

  const { data: budgetRows, error: budgetError } = await supabase
    .from("budgets")
    .select("variable_cap_mxn_cents")
    .eq("user_id", input.user_id)
    .eq("thread_id", input.thread_id)
    .eq("effective_month", month)
    .limit(1);

  if (budgetError) {
    return err("DB_ERROR", "Failed to fetch budget cap");
  }

  const variableCap = budgetRows?.[0]?.variable_cap_mxn_cents ?? DEFAULT_VARIABLE_CAP;
  const remaining = Math.max(0, variableCap - variableSpend);

  return ok({
    month,
    income_total_mxn_cents: incomeTotal,
    expense_total_mxn_cents: expenseTotal,
    variable_cap_mxn_cents: variableCap,
    variable_spend_mxn_cents: variableSpend,
    variable_remaining_mxn_cents: remaining,
  });
}

export async function get_category_summary(input: {
  user_id?: string;
  thread_id?: string;
  month?: string;
}): Promise<ToolResponse<CategorySummary>> {
  if (!input || !isNonEmptyString(input.user_id || "")) {
    return err("VALIDATION_ERROR", "user_id is required", { field: "user_id" });
  }
  if (!isNonEmptyString(input.thread_id || "")) {
    return err("VALIDATION_ERROR", "thread_id is required", { field: "thread_id" });
  }
  if (!isNonEmptyString(input.month || "") || !isValidMonth(input.month as string)) {
    return err("VALIDATION_ERROR", "month is invalid (expected YYYY-MM)", {
      field: "month",
    });
  }

  const month = input.month as string; // safe after validation
  const supabase = supabaseServer();
  const monthPrefix = `${month}-%`;
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("category, category_type, amount_mxn_cents")
    .eq("user_id", input.user_id)
    .eq("thread_id", input.thread_id)
    .eq("type", "EXPENSE")
    .like("date_iso", monthPrefix);

  if (error) {
    return err("DB_ERROR", "Failed to fetch category summary");
  }

  const totals = new Map<string, { category: string; category_type: string; total: number }>();
  for (const tx of transactions || []) {
    const key = `${tx.category}||${tx.category_type}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += tx.amount_mxn_cents;
    } else {
      totals.set(key, {
        category: tx.category,
        category_type: tx.category_type,
        total: tx.amount_mxn_cents,
      });
    }
  }

  const categories = Array.from(totals.values())
    .sort((a, b) => b.total - a.total)
    .map((item) => ({
      category: item.category,
      category_type: item.category_type,
      expense_total_mxn_cents: item.total,
    }));

  return ok({
    month,
    categories,
  });
}
