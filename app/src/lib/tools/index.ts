import { simulate_purchase } from "./simulatePurchase";
import {
  add_transaction,
  delete_last_transaction,
  parse_transaction_from_text,
  update_last_transaction,
} from "./transactions";
import { get_month_summary, get_category_summary } from "./summaries";
import { get_debts, add_or_update_debt } from "./debts";
import { set_budget_cap } from "./budgets";
import { get_bank_balance, set_bank_balance } from "./bankBalance";

export {
  parse_transaction_from_text,
  add_transaction,
  update_last_transaction,
  delete_last_transaction,
  get_month_summary,
  get_category_summary,
  get_debts,
  add_or_update_debt,
  set_budget_cap,
  get_bank_balance,
  set_bank_balance,
  simulate_purchase,
};

export const TOOLS = {
  parse_transaction_from_text,
  add_transaction,
  update_last_transaction,
  delete_last_transaction,
  get_month_summary,
  get_category_summary,
  get_debts,
  add_or_update_debt,
  set_budget_cap,
  get_bank_balance,
  set_bank_balance,
  simulate_purchase,
} as const;
