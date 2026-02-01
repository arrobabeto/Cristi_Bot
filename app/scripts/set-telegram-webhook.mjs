const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

if (!PUBLIC_BASE_URL) {
  console.error("PUBLIC_BASE_URL is required");
  process.exit(1);
}

const url = `${PUBLIC_BASE_URL}/api/telegram/webhook`;
const body = { url };
if (TELEGRAM_WEBHOOK_SECRET) {
  body.secret_token = TELEGRAM_WEBHOOK_SECRET;
}

const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const json = await res.json();
console.log(JSON.stringify(json, null, 2));
