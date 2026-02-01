import { supabaseServer } from "../supabase/server";
import { err, ok, ToolResponse } from "./types";
import { isNonEmptyString, isNonNegativeInteger, isValidMonth } from "./validate";

export async function set_budget_cap(input: {
  user_id?: string;
  thread_id?: string;
  variable_cap_mxn_cents?: number;
  effective_month?: string;
}): Promise<
  ToolResponse<{
    effective_month: string;
    variable_cap_mxn_cents: number;
  }>
> {
  if (!input || !isNonEmptyString(input.user_id || "")) {
    return err("VALIDATION_ERROR", "user_id is required", { field: "user_id" });
  }
  if (!isNonEmptyString(input.thread_id || "")) {
    return err("VALIDATION_ERROR", "thread_id is required", { field: "thread_id" });
  }
  if (!isNonNegativeInteger(input.variable_cap_mxn_cents as number)) {
    return err("VALIDATION_ERROR", "variable_cap_mxn_cents must be non-negative", {
      field: "variable_cap_mxn_cents",
    });
  }
  if (!isNonEmptyString(input.effective_month || "") || !isValidMonth(input.effective_month as string)) {
    return err("VALIDATION_ERROR", "effective_month is invalid (expected YYYY-MM)", {
      field: "effective_month",
    });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        user_id: input.user_id,
        thread_id: input.thread_id,
        effective_month: input.effective_month,
        variable_cap_mxn_cents: input.variable_cap_mxn_cents,
      },
      { onConflict: "user_id,thread_id,effective_month" }
    )
    .select("effective_month, variable_cap_mxn_cents")
    .single();

  if (error || !data) {
    return err("DB_ERROR", "Failed to set budget cap");
  }

  return ok({
    effective_month: data.effective_month,
    variable_cap_mxn_cents: data.variable_cap_mxn_cents,
  });
}
