import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { updateNotificationPrefs } from "@/lib/services/telegram";
import { notificationPrefsSchema } from "@/lib/validation/notifications";
import { parseOrThrow } from "@/lib/validation/parse";

// PUT /api/user/notifications   body: any of { enabled, habitReminder: { enabled, time }, ... }
export function PUT(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const input = parseOrThrow(notificationPrefsSchema, await readJson(request));
    return NextResponse.json({ prefs: await updateNotificationPrefs(userId, input) });
  });
}
