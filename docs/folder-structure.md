# Folder Structure

This document explains the organization of the Cristi Bot codebase.

## Root Directory

### `/docs`
- **Purpose:** Project documentation, including requirements, architecture, and guides.
- **Contents:** `.md` files.
- **Excluded:** Code logic.

### `/agents`
- **Purpose:** generalized agent definitions.
- **Contents:** Sub-folders for specific agents.

#### `/agents/financial-agent`
- **Purpose:** Core logic for the Financial Agent v1.
- **Contents:**
  - `/prompts`: System prompts and template strings for the LLM.
  - `/tools`: Functional tools (e.g., `add_transaction`, `query_budget`).
  - `/langgraph`: State graph definition, nodes, and edges.

### `/db`
- **Purpose:** Database interaction layer.
- **Contents:**
  - Supabase client initialization.
  - Schema definitions (SQL files).
  - TypeScript types for DB tables.
- **Excluded:** Business logic (should be in agents/tools).

### `/api`
- **Purpose:** Vercel (Next.js) API Routes.
- **Contents:**
  - `/api/webhook/telegram`: Endpoint to receive updates from Telegram.
- **Excluded:** Frontend pages (pages/app directory is minimal/unused for UI).

### `/telegram`
- **Purpose:** Telegram-specific utilities.
- **Contents:**
  - Method wrappers (sendMessage, setWebhook).
  - Type definitions for the Telegram Bot API.

### `/scripts`
- **Purpose:** Utility scripts for dev/ops.
- **Contents:**
  - `set-webhook.ts`
  - `seed-db.ts`
  - `test-agent.ts`

### `/config`
- **Purpose:** App-wide constants and configuration.
- **Contents:**
  - `constants.ts` (e.g., default categories).
  - `env.ts` (Typed environment variable parsing).

## What Goes Where?

| Artifact | Location |
|----------|----------|
| New Tool Definition | `/agents/financial-agent/tools` |
| New System Prompt | `/agents/financial-agent/prompts` |
| Database Migration SQL | `/db` |
| Webhook Handler | `/api` |
| Environment Variables | `.env.local` (not committed) & `/config` |
