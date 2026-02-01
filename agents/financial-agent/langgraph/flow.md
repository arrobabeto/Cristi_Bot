# Financial Agent v1 - LangGraph Flow

This document describes the LangGraph state machine for Cristi Bot Financial Agent v1.

Design goals (from docs)
- Stateless API layer; conversation continuity via LangGraph checkpointer.
- Database is the source of truth; tools provide deterministic reads/writes.
- Clarify missing critical fields; confirm before any write.
- Spanish-by-default responses; short and neutral.

Confirmation token allowlists (must match system prompt)
- confirm: ["sí","si","s","ok","va","confirmo","yes"]
- reject: ["no","cancelar","cancela"]
- If response not in set: re-ask “Responde exactamente: sí / no”.

Nodes
1) router
   - Input: `last_user_message`, `pending_action`, `pending_transaction`, `clarification_questions`
   - Output: `extracted_intent` and a route decision.
   - Rules:
     - If `clarification_questions.length > 0`, route to clarify (patch mode) to apply the user reply to the pending draft; do not restart the whole pipeline.
     - If `pending_action.type != null`, route to confirm unless user rejects/cancels.
     - Otherwise, classify intent into one of: LOG_TRANSACTION, QUERY_DATA, SET_BUDGET, MANAGE_DEBT, SIMULATE_PURCHASE.

2) parse
   - LOG_TRANSACTION: call `parse_transaction_from_text` to produce/refresh `pending_transaction` (including `category_type` when confident).
   - MANAGE_DEBT: extract debt fields (name, balances, minimums, due day) as draft params; do not compute totals.
   - SET_BUDGET: extract cap amount.
   - SIMULATE_PURCHASE: extract purchase draft (amount/category/description/date).
   - QUERY_DATA: extract query parameters (month/category) without computing totals.

3) validate
   - Enforce required fields for the selected intent.
   - LOG_TRANSACTION requires: amount + category + category_type. Date defaults to today (America/Mexico_City from now_iso) if not provided, but must be shown in confirmation.
   - SET_BUDGET requires: variable cap.
   - MANAGE_DEBT requires: at least `name` plus the specific fields being changed.
   - SIMULATE_PURCHASE requires: purchase amount + date (date defaults to today if missing) + category (if used by budgets).
   - If missing/ambiguous: populate `clarification_questions`.

4) clarify (patch mode)
   - Ask only the minimum questions needed.
   - When `clarification_questions` exist, treat the NEXT user reply as a field patch to:
     - `pending_transaction` (for LOG_TRANSACTION / SIMULATE_PURCHASE, including `category`, `category_type`, `amount_mxn_cents`, `date_iso`, `description`), or
      - the pending parameters draft for SET_BUDGET / MANAGE_DEBT / SET_BANK_BALANCE follow-ups.
   - After patching, clear/refresh `clarification_questions` and return to validate (do not restart parse unless still needed).

5) confirm
   - Build a single explicit confirmation prompt for any DB write.
   - Populate `pending_action` with the write-tool payload.
   - Ask: “Responde: sí / no”.
   - Only accept confirmation/rejection using the allowlists; otherwise re-ask:
     “Responde exactamente: sí / no”.

6) execute_tools
   - If user confirms (token in confirm set), execute the write tool in `pending_action.payload`.
   - If user rejects/cancels (token in reject set), cancel `pending_action` and do not write.
   - For read-only queries, call tools and store results in `tool_results`.
   - Numeric outputs must be tool-sourced.

   Special case: SIMULATE_PURCHASE missing bank balance
   - If `simulate_purchase` returns missing/NOT_FOUND for bank balance:
     1) Ask user for current bank balance (MXN).
     2) Build a pending_action of type SET_BANK_BALANCE (payload for `set_bank_balance`), and require confirmation before calling it.
     3) After `set_bank_balance` succeeds, re-run `simulate_purchase` with the original purchase draft.

7) respond
   - Respond neutrally, briefly, Spanish-by-default.
   - Any totals/summaries must come from tools.
   - Display dates as YYYY-MM-DD.
   - Apply display-only rounding if needed; never change stored values.

8) error_handler
   - Convert tool errors into user-safe Spanish messages.
   - If DB/tool fails, say you cannot compute/execute safely and ask for the next required input.

Edges (high-level)
- router -> clarify
  - When `clarification_questions.length > 0` (apply patch mode).
- router -> confirm
  - When `pending_action.type != null` and the message is a potential confirmation/rejection.
- router -> parse
  - Otherwise.

- parse -> validate
  - Always.

- validate -> clarify
  - If `clarification_questions.length > 0`.

- validate -> confirm
  - If intent requires a DB write and all required fields are present.

- validate -> execute_tools
  - If intent is QUERY_DATA or SIMULATE_PURCHASE (read-only) and parameters are sufficient.

- confirm -> execute_tools
  - On explicit confirm token.

- confirm -> respond
  - On explicit reject token (cancel action).

- execute_tools -> respond
  - On success.

- any -> error_handler
  - On tool/validation failures.

ASCII diagram
```ascii
                +------------------+
User message -->|      router      |
                +---+----------+---+
                    |          |
           clarify?  |          | pending_action?
             yes     |          | yes
                    v           v
               +-----------+  +-------------+
               |  clarify  |  |   confirm   |
               +-----+-----+  +------+------+
                     |              |
                     v              v
                +---------+   +-------------+
                | validate |-->| execute     |
                +----+----+   |  tools      |
                     |        +------+------+
                     |               |
                     v               v
                  +-------+     +----------+
                  |respond|<----|error_hand|
                  +-------+     +----------+
```

Validation checklist (must pass before merge)
- Deterministic finance-safe behavior: no hallucinated totals, no arithmetic from chat history for DB-backed numbers.
- Tools are the only source for numeric totals; summaries/totals are tool-derived.
- All DB writes require explicit confirmation BEFORE tool execution, using the token allowlists.
- Currency MXN; cash available is BANK BALANCE ONLY (no cash).
- Spanish-by-default responses; short and neutral.
- Clarify flow patches drafts (does not restart the pipeline) when `clarification_questions` exist.
- SIMULATE_PURCHASE handles missing bank balance by collecting it, confirming SET_BANK_BALANCE, then re-running simulation.
