# Financial Agent v1 - LangGraph State Schema

This document defines the minimal state stored by the LangGraph checkpointer for a conversation thread.

Purpose
- Enable short-term, multi-turn handling (clarifications, confirmations, follow-ups).
- Long-term memory is ONLY the database (transactions/budgets/debts).

Minimal state schema (conceptual)
```ts
type ExtractedIntent =
  | "LOG_TRANSACTION"
  | "QUERY_DATA"
  | "SET_BUDGET"
  | "MANAGE_DEBT"
  | "SIMULATE_PURCHASE"
  | "UNKNOWN";

type PendingActionType =
  | "ADD_TRANSACTION"
  | "UPDATE_LAST_TRANSACTION"
  | "DELETE_LAST_TRANSACTION"
  | "ADD_OR_UPDATE_DEBT"
  | "SET_BUDGET_CAP"
  | "SET_BANK_BALANCE"
  | null;

type TransactionDraft = {
  type: "EXPENSE" | "INCOME" | null;
  amount_mxn_cents: number | null;
  category_type: "INCOME" | "FIXED" | "VARIABLE" | "DEBT" | "DONATION" | "SAVINGS" | null;
  category: string | null;
  description: string | null;
  date_iso: string | null; // YYYY-MM-DD (America/Mexico_City normalized)
};

type ClarificationQuestion = {
  key: "amount" | "date" | "category" | "description" | "other";
  question: string;
};

type ToolResult = {
  tool_name: string;
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string; details?: unknown };
  at_iso: string;
};

type TimestampContext = {
  now_iso: string;
  timezone?: string | null; // default America/Mexico_City
};

type FinancialAgentState = {
  // Identity
  user_id: string;   // Telegram user id
  thread_id: string; // Telegram chat id / thread id

  // Last turn
  last_user_message: string;
  extracted_intent: ExtractedIntent;

  // Confirmation gate
  pending_action: {
    type: PendingActionType;
    confirmation_prompt: string | null;
    payload: unknown | null;
    // NOTE: pending_action.payload MUST match the corresponding write-tool request shape exactly.
    // Example mapping:
    // - ADD_TRANSACTION -> add_transaction input
    // - UPDATE_LAST_TRANSACTION -> update_last_transaction input
    // - DELETE_LAST_TRANSACTION -> delete_last_transaction input
    // - ADD_OR_UPDATE_DEBT -> add_or_update_debt input
    // - SET_BUDGET_CAP -> set_budget_cap input
    // - SET_BANK_BALANCE -> set_bank_balance input
  };

  // Transaction flow
  pending_transaction: TransactionDraft | null;
  clarification_questions: ClarificationQuestion[];

  // Tool outputs for the current run (short-term only)
  tool_results: ToolResult[];

  // Timestamp
  timestamp: TimestampContext;

  // Overwrite-safe backup log (see note below)
  backup_overwrite_log: Array<{
    at_iso: string;
    reason: string;
    snapshot: {
      last_user_message: string;
      extracted_intent: ExtractedIntent;
      pending_action: FinancialAgentState["pending_action"];
      pending_transaction: TransactionDraft | null;
      clarification_questions: ClarificationQuestion[];
    };
  }>;
};
```

What is NOT stored in state
- No long-term memory beyond what the database stores.
- No running totals computed from chat history.
- No "ledger" reconstructed from the conversation context window.
- No sensitive secrets (API keys, tokens).

Overwrite-safe memory note (Context Intake requirement)
- If state would be overwritten in a way that loses an in-progress flow (e.g., new intent arrives while `pending_action` is not null), the graph should append a compact snapshot to `backup_overwrite_log` before overwriting fields.
- The log should be append-only and bounded (e.g., keep last 20 snapshots) to prevent unbounded growth in the checkpointer.
- This is an in-state backup mechanism; do not rely on a persistent filesystem (serverless constraint).
