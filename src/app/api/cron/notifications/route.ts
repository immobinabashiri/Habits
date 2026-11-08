import { NextResponse } from "next/server";
import { bearerToken, readCronSecret, readTelegramConfig, secretsMatch } from "@/lib/config/server-env";
import { runNotifications } from "@/lib/services/notifications";
import { cronQuerySchema } from "@/lib/validation/notifications";

// Long enough for a run over many users on hosts that cap function time (Vercel).
export const maxDuration = 60;

// GET or POST /api/cron/notifications[?dryRun=1][&jobs=habitReminder,calendarReminder]
// Header: Authorization: Bearer <CRON_SECRET>
//
// Run every 5 minutes. Each run sends whatever is due right now in each user's own
// time zone; running it twice (or late) never sends anything twice. GET is accepted
// because Vercel Cron only sends GET; cron-job.org can use either.
async function handle(request: Request) {
  const secret = readCronSecret();
  if (!secret.ok) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured on the server." }, { status: 503 });
  }
  if (!secretsMatch(bearerToken(request), secret.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  // From here the caller holds the cron secret, so naming missing variables is safe.
  const telegram = readTelegramConfig();
  if (!telegram.ok) {
    return NextResponse.json({ ok: false, error: "Telegram is not configured.", problems: telegram.problems }, { status: 503 });
  }
  const url = new URL(request.url);
  const query = cronQuerySchema.safeParse({
    jobs: url.searchParams.get("jobs") ?? undefined,
    dryRun: url.searchParams.get("dryRun") ?? undefined,
  });
  if (!query.success) {
    return NextResponse.json({ ok: false, error: "Unknown job or dryRun value." }, { status: 400 });
  }
  const started = Date.now();
  try {
    const report = await runNotifications(telegram.value, { dryRun: query.data.dryRun, jobs: query.data.jobs });
    return NextResponse.json({ ok: true, ms: Date.now() - started, ...report });
  } catch (error) {
    console.error(`[cron] notifications failed: ${error instanceof Error ? error.name : "error"}`);
    return NextResponse.json({ ok: false, error: "The run failed. Check the server logs." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
