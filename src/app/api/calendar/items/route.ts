import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { createCalendarItem } from "@/lib/services/calendar";
import { createCalendarItemSchema } from "@/lib/validation/calendar";
import { parseOrThrow } from "@/lib/validation/parse";

// POST /api/calendar/items   body: { type, title, date, allDay?, startTime?, endTime?, recurrence?, ... }
export function POST(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const input = parseOrThrow(createCalendarItemSchema, await readJson(request));
    return NextResponse.json({ item: await createCalendarItem(userId, input) }, { status: 201 });
  });
}
