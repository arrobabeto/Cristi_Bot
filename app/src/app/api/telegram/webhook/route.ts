import "server-only";
import { NextResponse } from "next/server";
import { handleTelegramText } from "@/lib/telegram/router";
import { sendTelegramMessage } from "@/lib/telegram/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
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

  let reply = "No pude procesar tu mensaje.";
  try {
    reply = await handleTelegramText({
      user_id,
      thread_id,
      text,
      now_iso,
    });
  } catch {
    reply = "Ocurrio un error al procesar tu mensaje. Intenta de nuevo.";
  }

  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ok: true, reply });
  }

  try {
    await sendTelegramMessage(chatId, reply);
  } catch {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
