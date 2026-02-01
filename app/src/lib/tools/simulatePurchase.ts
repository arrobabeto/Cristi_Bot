import { supabaseServer } from "../supabase/server";
import { normalizeCategoryTitleCase } from "./normalize";
import { get_debts } from "./debts";
import { get_month_summary } from "./summaries";
import { err, ok, ToolResponse } from "./types";
import { dateIsoToMonth } from "./time";
import { isNonEmptyString, isNonNegativeInteger, isValidDateIso } from "./validate";

const DEFAULT_VARIABLE_CAP = 600000;

type SimulatePurchaseInput = {
  user_id?: string;
  thread_id?: string;
  purchase?: {
    amount_mxn_cents?: number;
    date_iso?: string;
    category?: string;
    description?: string;
  };
  assumptions?: {
    cash_available_definition?: "BANK_BALANCE_ONLY";
    include_cash?: boolean;
  };
};

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function nextDueDateIso(purchaseDateIso: string, dueDay: number): string {
  const year = Number(purchaseDateIso.slice(0, 4));
  const month = Number(purchaseDateIso.slice(5, 7));
  const day = Number(purchaseDateIso.slice(8, 10));

  const maxDayThisMonth = daysInMonth(year, month);
  const dueDayThisMonth = Math.min(dueDay, maxDayThisMonth);
  const candidate = `${purchaseDateIso.slice(0, 7)}-${String(dueDayThisMonth).padStart(
    2,
    "0"
  )}`;

  if (candidate >= purchaseDateIso) {
    return candidate;
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const maxDayNextMonth = daysInMonth(nextYear, nextMonth);
  const dueDayNextMonth = Math.min(dueDay, maxDayNextMonth);

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(
    dueDayNextMonth
  ).padStart(2, "0")}`;
}

export async function simulate_purchase(
  input: SimulatePurchaseInput
): Promise<
  ToolResponse<{
    affordable: boolean;
    reasons: string[];
    variable_cap_mxn_cents: number;
    variable_remaining_mxn_cents: number;
    next_obligations: Array<{
      name: string;
      amount_mxn_cents: number;
      due_date_iso: string | null;
    }>;
  }>
> {
  if (!input || !isNonEmptyString(input.user_id || "")) {
    return err("VALIDATION_ERROR", "user_id is required", { field: "user_id" });
  }
  if (!isNonEmptyString(input.thread_id || "")) {
    return err("VALIDATION_ERROR", "thread_id is required", { field: "thread_id" });
  }
  if (!input.purchase) {
    return err("VALIDATION_ERROR", "purchase is required", { field: "purchase" });
  }

  if (
    input.assumptions?.cash_available_definition &&
    input.assumptions.cash_available_definition !== "BANK_BALANCE_ONLY"
  ) {
    return err(
      "VALIDATION_ERROR",
      "assumptions.cash_available_definition must be BANK_BALANCE_ONLY",
      { field: "assumptions.cash_available_definition" }
    );
  }
  if (input.assumptions?.include_cash === true) {
    return err(
      "VALIDATION_ERROR",
      "assumptions.include_cash must be false",
      { field: "assumptions.include_cash" }
    );
  }

  const amount = input.purchase.amount_mxn_cents;
  const dateIso = input.purchase.date_iso;
  const category = input.purchase.category;

  if (!isNonNegativeInteger(amount as number)) {
    return err(
      "VALIDATION_ERROR",
      "purchase.amount_mxn_cents must be a non-negative integer",
      {
        field: "purchase.amount_mxn_cents",
      }
    );
  }
  if (!isNonEmptyString(dateIso || "") || !isValidDateIso(dateIso as string)) {
    return err("VALIDATION_ERROR", "purchase.date_iso is invalid (expected YYYY-MM-DD)", {
      field: "purchase.date_iso",
    });
  }
  if (!isNonEmptyString(category || "")) {
    return err("VALIDATION_ERROR", "purchase.category is required", {
      field: "purchase.category",
    });
  }

  const normalizedCategory = normalizeCategoryTitleCase(category as string);
  if (!isNonEmptyString(normalizedCategory)) {
    return err("VALIDATION_ERROR", "purchase.category is required", {
      field: "purchase.category",
    });
  }

  const supabase = supabaseServer();

  const { data: bbRows, error: bbErr } = await supabase
    .from("bank_balances")
    .select("bank_balance_mxn_cents")
    .eq("user_id", input.user_id)
    .eq("thread_id", input.thread_id)
    .order("as_of_iso", { ascending: false })
    .limit(1);

  if (bbErr) return err("DB_ERROR", "Failed to read bank balance");
  const bankBalance = bbRows?.[0]?.bank_balance_mxn_cents;
  if (bankBalance === undefined) {
    return err("NOT_FOUND", "Bank balance is not set", {
      missing: ["bank_balance_mxn_cents"],
    });
  }

  const month = dateIsoToMonth(dateIso as string);
  const monthSummary = await get_month_summary({
    user_id: input.user_id,
    thread_id: input.thread_id,
    month,
  });

  if (!monthSummary.ok) {
    return monthSummary;
  }

  const variableRemainingAfter =
    monthSummary.data.variable_remaining_mxn_cents - (amount as number);

  const debtsResult = await get_debts({
    user_id: input.user_id,
    thread_id: input.thread_id,
  });

  if (!debtsResult.ok) {
    return debtsResult;
  }

  const nextObligations = debtsResult.data.debts
    .filter((d) => (d.minimum_payment_mxn_cents ?? 0) > 0)
    .map((d) => {
      if (d.due_day_of_month === null || d.due_day_of_month === undefined) {
        return {
          name: d.name,
          amount_mxn_cents: d.minimum_payment_mxn_cents as number,
          due_date_iso: null,
        };
      }

      const dueDateIso = nextDueDateIso(dateIso as string, d.due_day_of_month);
      return {
        name: d.name,
        amount_mxn_cents: d.minimum_payment_mxn_cents as number,
        due_date_iso: dueDateIso,
      };
    });

  const obligationsTotal = nextObligations
    .filter(
      (o) => o.due_date_iso === null || o.due_date_iso >= (dateIso as string)
    )
    .reduce((sum, o) => sum + o.amount_mxn_cents, 0);

  const reasons: string[] = [];
  if (variableRemainingAfter < 0) {
    reasons.push("Would exceed variable spending cap for the month");
  }

  const cashAfterPurchase = bankBalance - (amount as number);
  if (cashAfterPurchase < obligationsTotal) {
    reasons.push("Would reduce cash available below upcoming mandatory obligations");
  }

  const affordable = reasons.length === 0;

  return ok({
    affordable,
    reasons,
    variable_cap_mxn_cents:
      monthSummary.data.variable_cap_mxn_cents ?? DEFAULT_VARIABLE_CAP,
    variable_remaining_mxn_cents: Math.max(0, variableRemainingAfter),
    next_obligations: nextObligations,
  });
}
