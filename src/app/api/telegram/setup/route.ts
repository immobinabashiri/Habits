import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/brand";
import { bearerToken, readCronSecret, readTelegramConfig, secretsMatch } from "@/lib/config/server-env";
import { callTelegram, TelegramApiError } from "@/lib/telegram/api";
import { BOT_COMMANDS, BOT_DESCRIPTION, BOT_SHORT_DESCRIPTION } from "@/lib/telegram/messages";

// One-time bot setup after deploying, so nobody has to paste the bot token into curl.
// Protected by CRON_SECRET (the server's operator secret).
//
// POST /api/telegram/setup   registers the webhook (with TELEGRAM_WEBHOOK_SECRET),
//                            the command menu and the bot's descriptions
// GET  /api/telegram/setup   reports the bot and webhook status, for verification
// Header: Authorization: Bearer <CRON_SECRET>

async function guard(request: Request) {
  const secret = readCronSecret();
  if (!secret.ok) return { error: NextResponse.json({ ok: false, error: "CRON_SECRET is not configured on the server." }, { status: 503 }) };
  if (!secretsMatch(bearerToken(request), secret.value)) {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
  }
  const telegram = readTelegramConfig();
  if (!telegram.ok) {
    return { error: NextResponse.json({ ok: false, error: "Telegram is not configured.", problems: telegram.problems }, { status: 503 }) };
  }
  return { config: telegram.value };
}

const failure = (error: unknown) =>
  NextResponse.json(
    { ok: false, error: error instanceof TelegramApiError ? error.message : "Unexpected error talking to Telegram." },
    { status: 502 },
  );

export async function GET(request: Request) {
  const { config, error } = await guard(request);
  if (error) return error;
  try {
    const [me, webhook] = await Promise.all([
      callTelegram<{ username: string; first_name: string }>(config, "getMe"),
      callTelegram<{ url: string; pending_update_count: number; last_error_message?: string; last_error_date?: number }>(config, "getWebhookInfo"),
    ]);
    const expected = siteUrl() ? `${siteUrl()}/api/telegram/webhook` : null;
    return NextResponse.json({
      ok: true,
      bot: { username: me.username, name: me.first_name, matchesEnv: me.username.toLowerCase() === config.username.toLowerCase() },
      webhook: {
        url: webhook.url || null,
        expectedUrl: expected,
        pointsHere: expected !== null && webhook.url === expected,
        pendingUpdates: webhook.pending_update_count,
        lastError: webhook.last_error_message ?? null,
        lastErrorAt: webhook.last_error_date ? new Date(webhook.last_error_date * 1000).toISOString() : null,
      },
    });
  } catch (caught) {
    return failure(caught);
  }
}

export async function POST(request: Request) {
  const { config, error } = await guard(request);
  if (error) return error;
  const site = siteUrl();
  if (!site.startsWith("https://")) {
    return NextResponse.json(
      { ok: false, error: "NEXT_PUBLIC_SITE_URL (or NEXTAUTH_URL) must be the public https:// address of this site. Telegram only calls https webhooks." },
      { status: 400 },
    );
  }
  const webhookUrl = `${site}/api/telegram/webhook`;
  try {
    await callTelegram(config, "setWebhook", {
      url: webhookUrl,
      secret_token: config.webhookSecret,
      allowed_updates: ["message", "callback_query", "my_chat_member"],
      max_connections: 20,
    });
    await callTelegram(config, "setMyCommands", { commands: BOT_COMMANDS });
    await callTelegram(config, "setMyDescription", { description: BOT_DESCRIPTION });
    await callTelegram(config, "setMyShortDescription", { short_description: BOT_SHORT_DESCRIPTION });
    return NextResponse.json({ ok: true, webhookUrl, commands: BOT_COMMANDS.map((c) => `/${c.command}`) });
  } catch (caught) {
    return failure(caught);
  }
}
