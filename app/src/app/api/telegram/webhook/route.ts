import "server-only";
import { NextResponse } from "next/server";
import { handleTelegramText } from "@/lib/telegram/router";
import { sendTelegramMessage } from "@/lib/telegram/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json(
      { ok: false, error: { code: "AUTH_ERROR", message: "Missing TELEGRAM_WEBHOOK_SECRET" } },
      { status: 500 }
    );
  }
  if (secret) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json(
        { ok: false, error: { code: "AUTH_ERROR", message: "Unauthorized" } },
        { status: 401 }
      );
    }
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message =
    update?.message?.text ? update.message : update?.edited_message?.text ? update.edited_message : null;
  const text = message?.text;
  if (!text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message?.chat?.id;
  if (!chatId) {
    return NextResponse.json({ ok: true });
  }

  const user_id = message?.from?.id ? String(message.from.id) : "unknown";
  const thread_id = String(chatId);
  const now_iso = new Date().toISOString();

  const reply = await handleTelegramText({
    user_id,
    thread_id,
    text,
    now_iso,
  });

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ok: true, reply });
  }

  await sendTelegramMessage(chatId, reply);

  return NextResponse.json({ ok: true });
}
