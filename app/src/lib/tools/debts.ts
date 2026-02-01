import { supabaseServer } from "../supabase/server";
import { err, ok, ToolResponse } from "./types";
import { isNonEmptyString, isNonNegativeInteger } from "./validate";

export async function get_debts(input: {
  user_id?: string;
  thread_id?: string;
}): Promise<
  ToolResponse<{
    debts: Array<{
      name: string;
      balance_mxn_cents: number | null;
      minimum_payment_mxn_cents: number | null;
      due_day_of_month: number | null;
      priority: string;
      do_not_accelerate: boolean;
    }>;
  }>
> {
  if (!input || !isNonEmptyString(input.user_id || "")) {
    return err("VALIDATION_ERROR", "user_id is required", { field: "user_id" });
  }
  if (!isNonEmptyString(input.thread_id || "")) {
    return err("VALIDATION_ERROR", "thread_id is required", { field: "thread_id" });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("debts")
    .select(
      "name, balance_mxn_cents, minimum_payment_mxn_cents, due_day_of_month, priority, do_not_accelerate"
    )
    .eq("user_id", input.user_id)
    .eq("thread_id", input.thread_id)
    .order("created_at", { ascending: true });

  if (error) {
    return err("DB_ERROR", "Failed to fetch debts");
  }

  return ok({ debts: data || [] });
}

export async function add_or_update_debt(input: {
  user_id?: string;
  thread_id?: string;
  debt?: {
    name?: string;
    balance_mxn_cents?: number | null;
    minimum_payment_mxn_cents?: number | null;
    due_day_of_month?: number | null;
    priority?: string;
    do_not_accelerate?: boolean;
  };
}): Promise<
  ToolResponse<{
    debt_id: string;
    stored: {
      name: string;
      balance_mxn_cents: number | null;
      minimum_payment_mxn_cents: number | null;
      due_day_of_month: number | null;
      priority: string;
      do_not_accelerate: boolean;
    };
  }>
> {
  if (!input || !isNonEmptyString(input.user_id || "")) {
    return err("VALIDATION_ERROR", "user_id is required", { field: "user_id" });
  }
  if (!isNonEmptyString(input.thread_id || "")) {
    return err("VALIDATION_ERROR", "thread_id is required", { field: "thread_id" });
  }
  if (!input.debt) {
    return err("VALIDATION_ERROR", "debt is required", { field: "debt" });
  }
  if (!isNonEmptyString(input.debt.name || "")) {
    return err("VALIDATION_ERROR", "name is required", { field: "debt.name" });
  }
  if (!isNonEmptyString(input.debt.priority || "")) {
    return err("VALIDATION_ERROR", "priority is required", { field: "debt.priority" });
  }

  if (
    input.debt.balance_mxn_cents !== undefined &&
    input.debt.balance_mxn_cents !== null &&
    !isNonNegativeInteger(input.debt.balance_mxn_cents)
  ) {
    return err("VALIDATION_ERROR", "balance_mxn_cents must be non-negative", {
      field: "debt.balance_mxn_cents",
    });
  }

  if (
    input.debt.minimum_payment_mxn_cents !== undefined &&
    input.debt.minimum_payment_mxn_cents !== null &&
    !isNonNegativeInteger(input.debt.minimum_payment_mxn_cents)
  ) {
    return err("VALIDATION_ERROR", "minimum_payment_mxn_cents must be non-negative", {
      field: "debt.minimum_payment_mxn_cents",
    });
  }

  if (
    input.debt.due_day_of_month !== undefined &&
    input.debt.due_day_of_month !== null &&
    (!Number.isInteger(input.debt.due_day_of_month) ||
      input.debt.due_day_of_month < 1 ||
      input.debt.due_day_of_month > 31)
  ) {
    return err("VALIDATION_ERROR", "due_day_of_month must be between 1 and 31", {
      field: "debt.due_day_of_month",
    });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("debts")
    .upsert(
      {
        user_id: input.user_id,
        thread_id: input.thread_id,
        name: input.debt.name,
        balance_mxn_cents:
          input.debt.balance_mxn_cents === undefined
            ? null
            : input.debt.balance_mxn_cents,
        minimum_payment_mxn_cents:
          input.debt.minimum_payment_mxn_cents === undefined
            ? null
            : input.debt.minimum_payment_mxn_cents,
        due_day_of_month:
          input.debt.due_day_of_month === undefined
            ? null
            : input.debt.due_day_of_month,
        priority: input.debt.priority,
        do_not_accelerate: input.debt.do_not_accelerate ?? false,
      },
      { onConflict: "user_id,thread_id,name" }
    )
    .select(
      "id, name, balance_mxn_cents, minimum_payment_mxn_cents, due_day_of_month, priority, do_not_accelerate"
    )
    .single();

  if (error || !data) {
    return err("DB_ERROR", "Failed to add or update debt");
  }

  return ok({
    debt_id: data.id,
    stored: {
      name: data.name,
      balance_mxn_cents: data.balance_mxn_cents,
      minimum_payment_mxn_cents: data.minimum_payment_mxn_cents,
      due_day_of_month: data.due_day_of_month,
      priority: data.priority,
      do_not_accelerate: data.do_not_accelerate,
    },
  });
}
