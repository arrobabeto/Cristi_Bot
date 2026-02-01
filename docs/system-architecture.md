# System Architecture

## High-Level Data Flow

```ascii
[ User (Telegram) ]
       |
       v
[ Telegram Webhook (Next.js API Route) ]
       |
       v
[ Controller / Router ] ---> [ Auth Check (Allowlist) ]
       |
       v
[ LangGraph Agent (State Machine) ]
       |
    /--+--\
   /       \
[LLM]    [Tools]
 (Intent)   |
            +---> [ DB Tool (Supabase) ]
            |
            +---> [ Date/Time Tool ]
```

## Layer Responsibilities

### 1. Telegram Layer
- **Responsibility:** Receive webhooks from Telegram servers.
- **Components:** `api/start/route.ts` (webhook handler).
- **Logic:** Minimal. Verify secret token, extract chat ID and text, pass to backend.

### 2. API Layer (Next.js)
- **Responsibility:** Entry point for the application.
- **Logic:** Authenticate the user (check ID against `TELEGRAM_ALLOWED_USERS`). Instantiate the LangGraph agent.
- **State:** Stateless. Spawns a new graph run or resumes a thread based on `thread_id` (usually Chat ID).

### 3. Agent Layer (LangGraph)
- **Responsibility:** Core logic and reasoning.
- **Logic:**
  - **State Graph:** Nodes for `listening`, `processing`, `confirming`.
  - **Memory:** `LangGraph` Checkpointer (using Postgres or ephemeral for MVP) tracks the conversation turns.
  - **Decision:** Determines if it needs to call a tool or just reply.

### 4. Persistence Layer (Supabase/PostgreSQL)
- **Responsibility:** Source of Truth.
- **Schema:**
  - `transactions`: Log of all financial entries.
  - `users`: (Optional for MVP) Preferences.
  - `budgets`: Monthly limits per category.

## State Management

- **Conversational State:** Managed by LangGraph Checkpointer. It allows the bot to remember "I just asked you for the category" in a multi-turn conversation.
- **Application State:** Stateless lambda functions.
- **Business Data:** Persistent in Supabase `transactions` table.

## What LangGraph Does vs. Does NOT Do

| LangGraph Does | LangGraph Does NOT |
|----------------|--------------------|
| Manage conversation flow (State Machine) | Execute database migrations |
| Decide which tool to call | Host the database |
| Handle retries/failures of tool calls | Render UI |
| Manage conversation history context | Serve static assets |

