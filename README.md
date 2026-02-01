# Cristi Bot - Financial Agent v1

Cristi Bot is a personal financial assistant interface via Telegram. It allows for natural language transaction logging, budget monitoring, and financial querying. It is built with Next.js, LangGraph, OpenAI, and Supabase.

## How It Works

1. **Input:** You send a message to the bot on Telegram (e.g., "Paid $12 for Netflix").
2. **Processing:** The message is sent via webhook to our API.
3. **Reasoning:** A LangGraph agent analyzes the intent. It extracts structured data (Amount: 12.00, Category: Subscription, Date: Today).
4. **Execution:** The agent confirms the details and saves the transaction to the database.
5. **Response:** The bot replies with a confirmation or a clarifying question.

## Supported Commands & Examples

### Commands
- `/start` - Initialize the bot.
- `/help` - Show available commands.
- `/balance` - Show current month's spending vs budget.

### Natural Language Examples
- **Log Expense:** "Lunch at Chipotle $15.50"
- **Log Income:** "Received salary $3000"
- **Query:** "How much did I spend on Uber this month?"
- **Budget:** "Set my food budget to $500"

## Memory System

The bot uses **short-term conversational memory** to maintain context within a session (e.g., if it asks "What was this for?", it knows you are replying to the previous transaction attempt).

**Long-term memory** is solely the structured data in the PostgreSQL database. The LLM does not "remember" things outside of what is queried from the DB or passed in the context window of the current conversation thread.

## Local Development

### Prerequisites
- Node.js 18+
- Supabase Project
- OpenAI API Key
- Telegram Bot Token

### Setup
1. Clone the repository.
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env.local` and fill in credentials.
4. Run the development server: `pnpm dev`
5. Expose your local server to the internet (using ngrok or similar) to test webhooks.

## Deployment

The project is designed to be deployed on **Vercel**.

1. Push code to GitHub.
2. Import project in Vercel.
3. Add Environment Variables (SUPABASE_URL, OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, etc.).
4. Deploy.
5. Set the Telegram Webhook to your production URL using the script: `pnpm webhook:set`.

## Known Limitations (v1)

- **Single User:** The bot is hardcoded to respond only to authorized User IDs.
- **No Edit History:** Editing a transaction overwrites it; no audit trail for edits.
- **Text Only:** Does not support image recognition for receipts.
- **No Recurring Automation:** Does not automatically log monthly bills; requires manual entry or query.

## Roadmap (v2+)

- [ ] Receipt scanning (Image processing).
- [ ] Multi-user support with family accounts.
- [ ] Monthly pdf report generation.
- [ ] Proactive budget alerts (Push notifications).
