const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

const headers = { "Content-Type": "application/json" };
if (TELEGRAM_WEBHOOK_SECRET) {
  headers["x-telegram-bot-api-secret-token"] = TELEGRAM_WEBHOOK_SECRET;
}

const update = {
  update_id: 1,
  message: {
    message_id: 1,
    text: "summary",
    date: Math.floor(Date.now() / 1000),
    chat: { id: 123456, type: "private" },
    from: { id: 999, is_bot: false, first_name: "Test" },
  },
};

const res = await fetch(`${BASE_URL}/api/telegram/webhook`, {
  method: "POST",
  headers,
  body: JSON.stringify(update),
});

const json = await res.json();
console.log(JSON.stringify(json));
