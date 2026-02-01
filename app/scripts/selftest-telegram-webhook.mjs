const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

const headers = { "Content-Type": "application/json" };
if (TELEGRAM_WEBHOOK_SECRET) {
  headers["x-telegram-bot-api-secret-token"] = TELEGRAM_WEBHOOK_SECRET;
}

const cases = ["/start", "help", "deudas", "gasto 87 openai", "summary"];

async function postMessage(text, updateId) {
  const update = {
    update_id: updateId,
    message: {
      message_id: updateId,
      text,
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
  if (!json || json.ok !== true) {
    throw new Error(`Expected ok:true for '${text}', got ${JSON.stringify(json)}`);
  }

  if (json.reply) {
    if (text === "/start" && !json.reply.toLowerCase().includes("comandos")) {
      throw new Error("/start should return help text");
    }
    if (text === "help" && !json.reply.toLowerCase().includes("comandos")) {
      throw new Error("help should return help text");
    }
    if (text === "deudas" && !json.reply.toLowerCase().includes("deuda")) {
      throw new Error("deudas should mention debts");
    }
  }

  console.log(JSON.stringify({ text, ok: json.ok }));
}

let updateId = 1;
for (const text of cases) {
  await postMessage(text, updateId);
  updateId += 1;
}
