import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { deleteCalendarItem, updateCalendarItem } from "@/lib/services/calendar";
import { deleteCalendarItemQuerySchema, updateCalendarItemSchema } from "@/lib/validation/calendar";
import { parseOrThrow } from "@/lib/validation/parse";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/calendar/items/:id   body: any subset of the fields, plus optional
// "occurrenceDate" to change only that day of a repeating series.
export function PATCH(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const itemId = parseObjectId((await params).id);
    const input = parseOrThrow(updateCalendarItemSchema, await readJson(request));
    return NextResponse.json(await updateCalendarItem(userId, itemId, input));
  });
}

// DELETE /api/calendar/items/:id              deletes the item (a whole series)
// DELETE /api/calendar/items/:id?date=...     removes only that day of a series
export function DELETE(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const itemId = parseObjectId((await params).id);
    const { date } = parseOrThrow(deleteCalendarItemQuerySchema, {
      date: new URL(request.url).searchParams.get("date") ?? undefined,
    });
    const item = await deleteCalendarItem(userId, itemId, date);
    return item ? NextResponse.json({ item }) : new Response(null, { status: 204 });
  });
}
