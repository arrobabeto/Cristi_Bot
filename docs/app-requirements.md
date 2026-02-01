# App Requirements (PRD)

## Functional Requirements

### 1. Telegram Interface
- **FR-01:** The bot must accept text messages from an authorized Telegram user ID.
- **FR-02:** The bot must ignore messages from unauthorized users.
- **FR-03:** The bot must support standard commands (e.g., `/start`, `/help`, `/balance`).
- **FR-04:** The bot must accept natural language input for transaction logging (e.g., "Spent 20 on lunch").

### 2. Transaction Management
- **FR-05:** The system must parse natural language inputs to extract: Amount, Category, Description, and Date (default to now).
- **FR-06:** The system must ask clarifying questions if critical information (like Amount) is missing.
- **FR-07:** The system must persist transactions to the PostgreSQL database.
- **FR-08:** Users must be able to edit or delete the last transaction via command or dialogue.

### 3. Financial Intelligence (LangGraph Agent)
- **FR-09:** The agent must identify intent: `LOG_TRANSACTION`, `QUERY_DATA`, `SET_BUDGET`.
- **FR-10:** The agent must use "tools" to query the database; it must *not* attempt to calculate sums from its own context window history if reliable data exists in the DB.
- **FR-11:** The agent must answer questions about spending trends (e.g., "Total spent on Food this month").

### 4. Memory & Context
- **FR-12:** The system must maintain a short-term conversational memory to handle follow-up questions.
- **FR-13:** Long-term "memory" is strictly the structured data in the database.

## Non-Functional Requirements

- **NFR-01 (Latency):** Simple responses should be generated within <3 seconds. Complex queries within <10 seconds.
- **NFR-02 (Reliability):** 99.9% uptime is not required, but no data loss is acceptable. Database backups should be enabled (Supabase default).
- **NFR-03 (Security):** Strict allow-list for Telegram User IDs. No public access.
- **NFR-04 (Accuracy):** Financial calculations must be precise. Floating point errors must be avoided (store values in cents/integers or use `DECIMAL` types).
- **NFR-05 (Cost):** Usage of OpenAI API should be cost-efficient (use GPT-4o-mini for simple tasks, GPT-4o only when necessary).

## Constraints

- **C-01:** Host on Vercel (Serverless functions). Timeout limits apply (max 10s-60s depending on plan).
- **C-02:** No persistent file system. All state must prove to DB or external storage.
- **C-03:** Single developer resource (the user).

## Assumptions

- **A-01:** The user has a Telegram account.
- **A-02:** The user trusts OpenAI with the content of their financial messages.
- **A-03:** The user will manually categorize unclear transactions if the AI asks.

## Success Criteria for MVP

- [ ] User can log a transaction in <5 seconds.
- [ ] User can ask "How much have I spent today?" and get an accurate number.
- [ ] System handles 50+ transactions without degradation.
- [ ] Bot does not crash on malformed input.
