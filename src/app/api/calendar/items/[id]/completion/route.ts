import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { setItemCompletion } from "@/lib/services/calendar";
import { occurrenceDateSchema } from "@/lib/validation/calendar";
import { parseOrThrow } from "@/lib/validation/parse";

type Context = { params: Promise<{ id: string }> };

// POST /api/calendar/items/:id/completion   body: { "date": "YYYY-MM-DD" }
export function POST(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const itemId = parseObjectId((await params).id);
    const { date } = parseOrThrow(occurrenceDateSchema, await readJson(request));
    return NextResponse.json({ item: await setItemCompletion(userId, itemId, date, true) });
  });
}

// DELETE /api/calendar/items/:id/completion?date=YYYY-MM-DD
export function DELETE(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const itemId = parseObjectId((await params).id);
    const { date } = parseOrThrow(occurrenceDateSchema, {
      date: new URL(request.url).searchParams.get("date"),
    });
    return NextResponse.json({ item: await setItemCompletion(userId, itemId, date, false) });
  });
}
