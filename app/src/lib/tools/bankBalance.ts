import { supabaseServer } from "../supabase/server";
import { err, ok, ToolResponse } from "./types";
import { toMexicoCityIso } from "./time";
import { isNonEmptyString, isNonNegativeInteger, isValidDateTimeIso } from "./validate";

export async function get_bank_balance(input: {
  user_id?: string;
  thread_id?: string;
}): Promise<
  ToolResponse<{
    bank_balance_mxn_cents: number;
    as_of_iso: string;
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
    .from("bank_balances")
    .select("bank_balance_mxn_cents, as_of_iso")
    .eq("user_id", input.user_id)
    .eq("thread_id", input.thread_id)
    .order("as_of_iso", { ascending: false })
    .limit(1);

  if (error) {
    return err("DB_ERROR", "Failed to fetch bank balance");
  }

  const latest = data?.[0];
  if (!latest) {
    return err("NOT_FOUND", "No bank balance snapshot found");
  }

  return ok({
    bank_balance_mxn_cents: latest.bank_balance_mxn_cents,
    as_of_iso: latest.as_of_iso,
  });
}

export async function set_bank_balance(input: {
  user_id?: string;
  thread_id?: string;
  bank_balance_mxn_cents?: number;
  as_of_iso?: string;
  now_iso?: string;
}): Promise<
  ToolResponse<{
    stored: {
      bank_balance_mxn_cents: number;
      as_of_iso: string;
    };
  }>
> {
  if (!input || !isNonEmptyString(input.user_id || "")) {
    return err("VALIDATION_ERROR", "user_id is required", { field: "user_id" });
  }
  if (!isNonEmptyString(input.thread_id || "")) {
    return err("VALIDATION_ERROR", "thread_id is required", { field: "thread_id" });
  }
  if (!isNonNegativeInteger(input.bank_balance_mxn_cents as number)) {
    return err("VALIDATION_ERROR", "bank_balance_mxn_cents must be a non-negative integer", {
      field: "bank_balance_mxn_cents",
    });
  }

  let asOf: string | undefined;
  if (isNonEmptyString(input.as_of_iso || "")) {
    if (!isValidDateTimeIso(input.as_of_iso as string)) {
      return err("VALIDATION_ERROR", "as_of_iso is invalid", { field: "as_of_iso" });
    }
    asOf = input.as_of_iso as string;
  } else if (isNonEmptyString(input.now_iso || "")) {
    if (!isValidDateTimeIso(input.now_iso as string)) {
      return err("VALIDATION_ERROR", "now_iso is invalid", { field: "now_iso" });
    }
    const normalized = toMexicoCityIso(input.now_iso as string);
    if (!isNonEmptyString(normalized)) {
      return err("VALIDATION_ERROR", "now_iso is invalid", { field: "now_iso" });
    }
    asOf = normalized;
  } else {
    return err("VALIDATION_ERROR", "as_of_iso or now_iso is required", {
      field: "as_of_iso",
    });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("bank_balances")
    .insert({
      user_id: input.user_id,
      thread_id: input.thread_id,
      bank_balance_mxn_cents: input.bank_balance_mxn_cents,
      as_of_iso: asOf,
    })
    .select("bank_balance_mxn_cents, as_of_iso")
    .single();

  if (error || !data) {
    return err("DB_ERROR", "Failed to set bank balance");
  }

  return ok({
    stored: {
      bank_balance_mxn_cents: data.bank_balance_mxn_cents,
      as_of_iso: data.as_of_iso,
    },
  });
}
