import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { addExemptDate, removeExemptDate } from "@/lib/services/habits";
import { exemptDateSchema } from "@/lib/validation/habit";
import { parseOrThrow } from "@/lib/validation/parse";

type Context = { params: Promise<{ id: string }> };

// POST /api/habits/:id/exempt   body: { "date": "YYYY-MM-DD" }
export function POST(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const habitId = parseObjectId((await params).id);
    const { date } = parseOrThrow(exemptDateSchema, await readJson(request));
    return NextResponse.json({ habit: await addExemptDate(userId, habitId, date) });
  });
}

// DELETE /api/habits/:id/exempt?date=YYYY-MM-DD
export function DELETE(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const habitId = parseObjectId((await params).id);
    const { date } = parseOrThrow(exemptDateSchema, {
      date: new URL(request.url).searchParams.get("date"),
    });
    return NextResponse.json({ habit: await removeExemptDate(userId, habitId, date) });
  });
}