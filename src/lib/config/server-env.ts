import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// Server-only configuration for Telegram and scheduled jobs. Values are read from the
// environment at request time and are never sent to the browser or written to logs:
// problems are reported by variable NAME only.

export interface TelegramConfig {
  token: string;
  username: string; // without "@"
  webhookSecret: string;
  apiBase: string; // https://api.telegram.org unless overridden (tests, proxies)
}

export type ConfigResult<T> = { ok: true; value: T } | { ok: false; problems: string[] };

const TOKEN_FORMAT = /^\d{5,}:[A-Za-z0-9_-]{30,}$/; // what BotFather issues
const USERNAME_FORMAT = /^[A-Za-z][A-Za-z0-9_]{3,30}[Bb][Oo][Tt]$/; // Telegram requires the "bot" suffix
const SECRET_FORMAT = /^[A-Za-z0-9_-]{32,256}$/; // Telegram's allowed characters for the header secret

const warned = new Set<string>();
function warnOnce(scope: string, problems: string[]) {
  const key = `${scope}:${problems.join(",")}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[config] ${scope} is not configured: ${problems.join("; ")}. See docs/TELEGRAM_SETUP_TODO.md.`);
}

export function readTelegramConfig(): ConfigResult<TelegramConfig> {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  const username = (process.env.TELEGRAM_BOT_USERNAME ?? "").trim().replace(/^@/, "");
  const webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
  const apiBase = (process.env.TELEGRAM_API_BASE_URL ?? "").trim().replace(/\/+$/, "") || "https://api.telegram.org";

  const problems: string[] = [];
  if (!token) problems.push("TELEGRAM_BOT_TOKEN is empty");
  else if (!TOKEN_FORMAT.test(token)) problems.push("TELEGRAM_BOT_TOKEN is not in BotFather's format (digits:characters)");
  if (!username) problems.push("TELEGRAM_BOT_USERNAME is empty");
  else if (!USERNAME_FORMAT.test(username)) problems.push("TELEGRAM_BOT_USERNAME must be a bot username ending in 'bot'");
  if (!webhookSecret) problems.push("TELEGRAM_WEBHOOK_SECRET is empty");
  else if (!SECRET_FORMAT.test(webhookSecret)) problems.push("TELEGRAM_WEBHOOK_SECRET must be 32-256 characters of A-Z, a-z, 0-9, _ or -");
  if (!/^https?:\/\//.test(apiBase)) problems.push("TELEGRAM_API_BASE_URL must start with http(s)://");

  if (problems.length > 0) {
    warnOnce("Telegram", problems);
    return { ok: false, problems };
  }
  return { ok: true, value: { token, username, webhookSecret, apiBase } };
}

export function readCronSecret(): ConfigResult<string> {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) {
    warnOnce("CRON_SECRET", ["CRON_SECRET is empty"]);
    return { ok: false, problems: ["CRON_SECRET is empty"] };
  }
  if (secret.length < 32) {
    warnOnce("CRON_SECRET", ["CRON_SECRET must be at least 32 characters"]);
    return { ok: false, problems: ["CRON_SECRET must be at least 32 characters"] };
  }
  return { ok: true, value: secret };
}

// Compares secrets in constant time (hashing first also hides their length).
export function secretsMatch(given: string | null | undefined, expected: string): boolean {
  if (!given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// "Authorization: Bearer <secret>": the convention Vercel Cron uses, and what the
// setup docs tell cron-job.org to send.
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}
