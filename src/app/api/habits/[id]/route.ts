import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { deleteHabit, getHabit, updateHabit } from "@/lib/services/habits";
import { updateHabitSchema } from "@/lib/validation/habit";
import { parseOrThrow } from "@/lib/validation/parse";

type Context = { params: Promise<{ id: string }> };

// GET /api/habits/:id
export function GET(_request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const habitId = parseObjectId((await params).id);
    return NextResponse.json({ habit: await getHabit(userId, habitId) });
  });
}

// PATCH /api/habits/:id   (any subset of the editable fields)
export function PATCH(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const habitId = parseObjectId((await params).id);
    const input = parseOrThrow(updateHabitSchema, await readJson(request));
    return NextResponse.json({ habit: await updateHabit(userId, habitId, input) });
  });
}

// DELETE /api/habits/:id   (permanent; archive is the reversible option)
export function DELETE(_request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const habitId = parseObjectId((await params).id);
    await deleteHabit(userId, habitId);
    return new Response(null, { status: 204 });
  });
}