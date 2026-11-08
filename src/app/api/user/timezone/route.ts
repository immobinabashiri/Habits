import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { setTimezone } from "@/lib/services/user";
import { timezoneSchema } from "@/lib/validation/dashboard";
import { parseOrThrow } from "@/lib/validation/parse";

// POST /api/user/timezone   body: { "timezone": "Europe/Berlin" }
export function POST(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const { timezone } = parseOrThrow(timezoneSchema, await readJson(request));
    await setTimezone(userId, timezone);
    return NextResponse.json({ ok: true });
  });
}
