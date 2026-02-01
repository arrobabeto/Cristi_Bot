# Project Overview

## What is Financial Agent v1?

Cristi Bot Financial Agent v1 is a deterministic, conversational personal finance assistant designed for a single user (the founder). It operates primarily through a Telegram interface, backed by a robust backend system that ensures data integrity and financial accuracy. It is built to be a reliable partner in managing personal finances, tracking expenses, and providing insights without the fluff or unpredictability often associated with generative AI.

## What is it NOT?

- **It is NOT a multi-tenant SaaS.** It is a single-user tool.
- **It is NOT a generic chatbot.** It does not engage in casual chit-chat outside of its financial domain.
- **It is NOT a "black box" AI.** It relies on deterministic tools and structured data, not purely on LLM generation for numbers.
- **It is NOT a UI-heavy application.** There is no web dashboard in v1; interaction is exclusively via Telegram.

## Core Use Cases

1.  **Expense Tracking:** Logging expenses via natural language messages (e.g., "$50 for groceries").
2.  **Budget Monitoring:** Checking status against set budget limits.
3.  **Financial Querying:** Asking specific questions about spending habits (e.g., "How much did I spend on dining out last month?").
4.  **Recurring Payments:** Reminders and tracking of subscriptions and bills.
5.  **Receipt Processing (Future/MVP+):** Simple text parsing of forwarded receipts (if strictly text-based).

## Non-Goals (v1)

- **Multi-Agent Systems:** No complex orchestration of multiple autonomous agents. One agent handles all requests.
- **Web Interface:** No frontend development. The web component exists strictly for API routes and webhooks.
- **Banking Integrations (Plaid/Yodlee):** No direct bank feeds in v1. Manual entry or simple import scripts only.
- **Complex Investment Analysis:** Focus is on cash flow and budgeting, not stock market portfolio management.
- **Multi-User Support:** No authentication logic for multiple users. Hardcoded or env-var based auth for the single owner.
- **Voice/Image Processing:** Text-only for v1.
