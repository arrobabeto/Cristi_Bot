# Financial Agent v1 - Tools Contracts

This document defines the deterministic tool surface area for Cristi Bot Financial Agent v1.

Source of truth
- Long-term data is stored in PostgreSQL (Supabase). Tools are the only way to read/write that data.
- The agent MUST use tools for numeric answers (sums, summaries, affordability). No hallucinated totals.

Money representation (deterministic)
- Currency: MXN.
- All money amounts are represented and stored as integer cents: `*_mxn_cents` (int64).
  - Example: 15.50 MXN -> 1550
  - Example: 15 MXN -> 1500
- Avoid floating point.

Category normalization (deterministic)
- Tools MUST normalize `category` before storing/returning it:
  - trim leading/trailing whitespace
  - canonicalize casing to Title Case (e.g., "food" -> "Food", "  subscriptions  " -> "Subscriptions")
- Optional: a small synonym mapping MAY be applied, but it must be deterministic and explicitly documented by the implementation (do not rely on model guesswork).

Date & timezone normalization (deterministic)
- Timezone: America/Mexico_City.
- All tools that accept a date MUST normalize to `date_iso` as `YYYY-MM-DD` using America/Mexico_City.
  - If input is a full timestamp, convert to America/Mexico_City then take the local calendar date.
- Reject invalid dates (e.g., 2026-02-30) with `VALIDATION_ERROR`.
- Month inputs (when present) must be `YYYY-MM` and validated.

Common request fields
- `user_id` (string): Telegram user id.
- `thread_id` (string): Telegram chat id / conversation thread id.
- `now_iso` (string, ISO-8601): current timestamp for deterministic defaults (required whenever a tool defaults time/date).

Common response envelope (recommended)
- Success:
  - `{ "ok": true, "data": <tool-specific> }`
- Error:
  - `{ "ok": false, "error": { "code": "...", "message": "...", "details": { ... } } }`

Standard error codes
- `VALIDATION_ERROR`: input missing/invalid.
- `NOT_FOUND`: requested record does not exist (or required snapshot has never been set).
- `AUTH_ERROR`: user_id not allowed.
- `DB_ERROR`: database failure.
- `CONFLICT`: operation conflicts with current state.

Validation rules (applies to all tools)
- Reject missing required fields with `VALIDATION_ERROR`.
- Reject negative amounts for expenses/income unless explicitly supported by a tool contract.
- Reject unknown enums (intent/category_type/etc.).
- Reject invalid or non-normalizable dates.

---

## 1) parse_transaction_from_text

Purpose
- LLM-assisted parsing of a user message into a structured transaction candidate.
- No database side effects.

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654",
  "text": "Lunch at Chipotle 155.50 today",
  "now_iso": "2026-02-01T12:00:00-06:00"
}
```

Outputs
- Returns a validated candidate plus explicit missing/ambiguous fields, and confidence metadata.
```json
{
  "ok": true,
  "data": {
    "candidate": {
      "type": "EXPENSE",
      "amount_mxn_cents": 15550,
      "category_type": "VARIABLE",
      "category": "Food",
      "description": "Lunch at Chipotle",
      "date_iso": "2026-02-01"
    },
    "inferred_fields": ["date"],
    "missing_fields": [],
    "ambiguities": [],
    "confidence": 0.92,
    "low_confidence_fields": []
  }
}
```

Error example
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "text is required",
    "details": {"field": "text"}
  }
}
```

Notes
- If amount/category cannot be extracted with high confidence, put them in `missing_fields` and leave them null.
- If the user does not specify a date, infer `date_iso` from `now_iso` in America/Mexico_City and include "date" in `inferred_fields`.
- `confidence` is 0..1 (overall).
- `low_confidence_fields` lists specific fields to clarify (e.g., ["category"]).
- Deterministic variable spend classification (Option A):
  - The parser should set `category_type` when confident.
  - If `category_type` is missing or low-confidence, include it in `missing_fields` or `low_confidence_fields`.
  - `category_type` enum:
    - "INCOME" | "FIXED" | "VARIABLE" | "DEBT" | "DONATION" | "SAVINGS"

---

## 2) add_transaction

Purpose
- Persist a new transaction.

Side effects
- Writes to `transactions` table.

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654",
  "transaction": {
    "type": "EXPENSE",
    "amount_mxn_cents": 15550,
    "category_type": "VARIABLE",
    "category": "Food",
    "description": "Lunch at Chipotle",
    "date_iso": "2026-02-01"
  }
}
```

Outputs
```json
{
  "ok": true,
  "data": {
    "transaction_id": "tx_01HXYZ...",
    "stored": {
      "type": "EXPENSE",
      "amount_mxn_cents": 15550,
      "category_type": "VARIABLE",
      "category": "Food",
      "description": "Lunch at Chipotle",
      "date_iso": "2026-02-01"
    }
  }
}
```

Error example (invalid date)
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "date_iso is invalid (expected YYYY-MM-DD in America/Mexico_City)",
    "details": {"field": "transaction.date_iso", "value": "2026-02-30"}
  }
}
```

Validation notes
- `category_type` is required.
- If `transaction.type == "INCOME"`, then `category_type` MUST be "INCOME".
- If `transaction.type == "EXPENSE"`, then `category_type` MUST be one of: "FIXED" | "VARIABLE" | "DEBT" | "DONATION" | "SAVINGS".
- `category` MUST be stored in canonical form (see Category normalization).

---

## 3) update_last_transaction

Purpose
- Update the most recently created transaction for the user/thread.

Deterministic selection rule
- "last transaction" = `ORDER BY created_at DESC LIMIT 1` filtered by `user_id` AND `thread_id`.

Side effects
- Updates an existing row in `transactions`.

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654",
  "patch": {
    "amount_mxn_cents": 16000,
    "category": "Food",
    "description": "Lunch",
    "date_iso": "2026-02-01"
  }
}
```

Outputs (safer)
```json
{
  "ok": true,
  "data": {
    "transaction_id": "tx_01HXYZ...",
    "previous": {
      "type": "EXPENSE",
      "amount_mxn_cents": 15550,
      "category_type": "VARIABLE",
      "category": "Food",
      "description": "Lunch at Chipotle",
      "date_iso": "2026-02-01"
    },
    "current": {
      "type": "EXPENSE",
      "amount_mxn_cents": 16000,
      "category_type": "VARIABLE",
      "category": "Food",
      "description": "Lunch",
      "date_iso": "2026-02-01"
    }
  }
}
```

Error example
```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No last transaction found to update",
    "details": {}
  }
}
```

---

## 4) delete_last_transaction

Purpose
- Delete the most recently created transaction for the user/thread.

Deterministic selection rule
- "last transaction" = `ORDER BY created_at DESC LIMIT 1` filtered by `user_id` AND `thread_id`.

Side effects
- Deletes a row from `transactions`.

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654"
}
```

Outputs (safer)
```json
{
  "ok": true,
  "data": {
    "deleted_transaction_id": "tx_01HXYZ...",
    "deleted": {
      "type": "EXPENSE",
      "amount_mxn_cents": 16000,
      "category_type": "VARIABLE",
      "category": "Food",
      "description": "Lunch",
      "date_iso": "2026-02-01"
    }
  }
}
```

---

## 5) get_month_summary

Purpose
- Get month-level totals (income/expense) and budget status from DB.

Deterministic "variable spend" logic (Option A)
- `variable_spend_mxn_cents` = sum of EXPENSE transactions where `category_type == "VARIABLE"` within the requested month (America/Mexico_City date boundaries).
- `variable_remaining_mxn_cents` = `variable_cap_mxn_cents - variable_spend_mxn_cents`.

Side effects
- None.

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654",
  "month": "2026-02"
}
```

Outputs
```json
{
  "ok": true,
  "data": {
    "month": "2026-02",
    "income_total_mxn_cents": 0,
    "expense_total_mxn_cents": 315550,
    "variable_cap_mxn_cents": 600000,
    "variable_spend_mxn_cents": 120000,
    "variable_remaining_mxn_cents": 480000
  }
}
```

---

## 6) get_category_summary

Purpose
- Get totals grouped by category for a given month.

Side effects
- None.

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654",
  "month": "2026-02"
}
```

Outputs
```json
{
  "ok": true,
  "data": {
    "month": "2026-02",
    "categories": [
      {"category": "Food", "category_type": "VARIABLE", "expense_total_mxn_cents": 80000},
      {"category": "Subscriptions", "category_type": "FIXED", "expense_total_mxn_cents": 95800}
    ]
  }
}
```

---

## 7) get_debts

Purpose
- Fetch the current debt list and required minimum/monthly payments.

Side effects
- None.

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654"
}
```

Outputs
```json
{
  "ok": true,
  "data": {
    "debts": [
      {
        "name": "NU CC",
        "balance_mxn_cents": 2438500,
        "minimum_payment_mxn_cents": null,
        "due_day_of_month": null,
        "priority": "HIGH",
        "do_not_accelerate": false
      }
    ]
  }
}
```

---

## 8) add_or_update_debt

Purpose
- Add a new debt entry or update an existing one.

Side effects
- Writes to `debts` table (or equivalent persistence).

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654",
  "debt": {
    "name": "Rappi CC",
    "balance_mxn_cents": 1723033,
    "minimum_payment_mxn_cents": 125300,
    "due_day_of_month": 15,
    "priority": "MEDIUM_HIGH",
    "do_not_accelerate": false
  }
}
```

Outputs
```json
{
  "ok": true,
  "data": {
    "debt_id": "debt_01HXYZ...",
    "stored": {
      "name": "Rappi CC",
      "balance_mxn_cents": 1723033,
      "minimum_payment_mxn_cents": 125300,
      "due_day_of_month": 15,
      "priority": "MEDIUM_HIGH",
      "do_not_accelerate": false
    }
  }
}
```

---

## 9) set_budget_cap

Purpose
- Set the monthly cap for variable/discretionary spending.

Side effects
- Writes to `budgets` table.

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654",
  "variable_cap_mxn_cents": 600000,
  "effective_month": "2026-02"
}
```

Outputs
```json
{
  "ok": true,
  "data": {
    "effective_month": "2026-02",
    "variable_cap_mxn_cents": 600000
  }
}
```

---

## 10) simulate_purchase

Purpose
- Determine affordability of a proposed purchase using DB data and upcoming obligations.

Deterministic requirements
- Must use persisted data (transactions, budgets, debts) and known upcoming obligations.
- Must not estimate totals from chat history.
- "Cash available" MUST be bank balance only (no cash).

Deterministic "variable spend" logic (Option A)
- When evaluating the variable cap, use the same definition as `get_month_summary`:
  - Current `variable_spend_mxn_cents` = sum of EXPENSE transactions where `category_type == "VARIABLE"` within the month.

Side effects
- None (read-only).

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654",
  "purchase": {
    "amount_mxn_cents": 250000,
    "date_iso": "2026-02-05",
    "category": "Personal purchases",
    "description": "Headphones"
  },
  "assumptions": {
    "cash_available_definition": "BANK_BALANCE_ONLY",
    "include_cash": false
  }
}
```

Outputs
```json
{
  "ok": true,
  "data": {
    "affordable": false,
    "reasons": [
      "Would exceed variable spending cap for the month",
      "Would reduce cash available below upcoming mandatory obligations"
    ],
    "variable_cap_mxn_cents": 600000,
    "variable_remaining_mxn_cents": 120000,
    "next_obligations": [
      {"name": "Donation", "amount_mxn_cents": 448200, "due_date_iso": null}
    ]
  }
}
```

Error example (missing bank balance)
```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Bank balance is not set",
    "details": {"missing": ["bank_balance_mxn_cents"]}
  }
}
```

---

## 11) get_bank_balance

Purpose
- Read the latest bank balance snapshot (cash available = bank balance only).

Side effects
- None (read-only).

Inputs
```json
{
  "user_id": "123456",
  "thread_id": "987654"
}
```

Outputs
```json
{
  "ok": true,
  "data": {
    "bank_balance_mxn_cents": 1250000,
    "as_of_iso": "2026-02-01T09:30:00-06:00"
  }
}
```

Error example (never set)
```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No bank balance snapshot found",
    "details": {}
  }
}
```

---

## 12) set_bank_balance

Purpose
- Store a bank balance snapshot.

Side effects
- Writes to `bank_balances` table (or equivalent persistence).

Inputs
- If `as_of_iso` is omitted, the tool MUST use `now_iso`.
```json
{
  "user_id": "123456",
  "thread_id": "987654",
  "bank_balance_mxn_cents": 1250000,
  "as_of_iso": "2026-02-01T09:30:00-06:00"
}
```

Outputs
```json
{
  "ok": true,
  "data": {
    "stored": {
      "bank_balance_mxn_cents": 1250000,
      "as_of_iso": "2026-02-01T09:30:00-06:00"
    }
  }
}
```

Error example
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "bank_balance_mxn_cents must be a non-negative integer",
    "details": {"field": "bank_balance_mxn_cents"}
  }
}
```
