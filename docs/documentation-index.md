# Documentation Index

This file serves as a map to all project documentation.

## Core Documentation
- **[Project Overview](./project-overview.md)** - High-level goals, philosophy, and what the project is/isn't.
- **[App Requirements](./app-requirements.md)** - Functional and non-functional requirements (PRD).
- **[System Architecture](./system-architecture.md)** - Diagrams and explanation of the tech stack layers.
- **[Folder Structure](./folder-structure.md)** - Guide to the codebase organization.

## Technical Docs (Recommended Future Docs)
- **`state-schema.md`** - Definition of the LangGraph state interface (messages, current_intent, extracted_data).
- **`tools-contracts.md`** - Input/Output specifications for tools like `add_transaction` or `get_budget`.
- **`security.md`** - Details on headers protection, Telegram secret tokens, and RLS policies.
- **`decisions.md`** - Architecture Decision Records (ADR) for choices like "Why LangGraph?" or "Why specific DB schema?".

## Guides
- **`setup-local.md`** - Detailed step-by-step for setting up environment variables and local database.
- **`deployment.md`** - Vercel deployment and Supabase migration specifics.
