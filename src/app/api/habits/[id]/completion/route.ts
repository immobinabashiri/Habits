import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { completeHabit, undoCompletion } from "@/lib/services/completions";
import { completeSchema } from "@/lib/validation/dashboard";
import { parseOrThrow } from "@/lib/validation/parse";

type Context = { params: Promise<{ id: string }> };

// POST /api/habits/:id/completion   body: { "minutes"?: number }
// Completes the habit for TODAY (decided by the server, never by the client).
export function POST(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const habitId = parseObjectId((await params).id);
    const input = parseOrThrow(completeSchema, await readJson(request));
    return NextResponse.json(await completeHabit(userId, habitId, input), { status: 201 });
  });
}

// DELETE /api/habits/:id/completion   (undo today's completion)
export function DELETE(_request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const habitId = parseObjectId((await params).id);
    return NextResponse.json(await undoCompletion(userId, habitId));
  });
}
