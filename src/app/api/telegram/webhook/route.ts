import { NextResponse } from "next/server";
import { readTelegramConfig, secretsMatch } from "@/lib/config/server-env";
import { handleTelegramUpdate } from "@/lib/services/telegram-bot";
import { telegramUpdateSchema } from "@/lib/validation/notifications";

const MAX_BODY_BYTES = 256 * 1024;

// POST /api/telegram/webhook   (called by Telegram only)
// Authenticated by the X-Telegram-Bot-Api-Secret-Token header, which Telegram sends
// with the secret given to setWebhook (TELEGRAM_WEBHOOK_SECRET). Responses never
// contain details: Telegram doesn't need them and nobody else should get them.
export async function POST(request: Request) {
  const config = readTelegramConfig();
  if (!config.ok) return NextResponse.json({ ok: false }, { status: 503 });

  if (!secretsMatch(request.headers.get("x-telegram-bot-api-secret-token"), config.value.webhookSecret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  const update = telegramUpdateSchema.safeParse(body);
  // An update we can't read is acknowledged, so Telegram doesn't resend it forever.
  if (!update.success) return NextResponse.json({ ok: true });

  try {
    await handleTelegramUpdate(config.value, update.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // A server problem (e.g. the database): 500 makes Telegram retry this update later.
    console.error(`[telegram] update ${update.data.update_id} failed: ${error instanceof Error ? error.name : "error"}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
