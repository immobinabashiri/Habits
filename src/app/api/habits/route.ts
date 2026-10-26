import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { createHabit, listHabits } from "@/lib/services/habits";
import { createHabitSchema, listQuerySchema } from "@/lib/validation/habit";
import { parseOrThrow } from "@/lib/validation/parse";

// GET /api/habits?status=active|archived|all   (default: active)
export function GET(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const { status } = parseOrThrow(listQuerySchema, {
      status: new URL(request.url).searchParams.get("status") ?? undefined,
    });
    return NextResponse.json({ habits: await listHabits(userId, status ?? "active") });
  });
}

// POST /api/habits
export function POST(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const input = parseOrThrow(createHabitSchema, await readJson(request));
    return NextResponse.json(
      { habit: await createHabit(userId, input) },
      { status: 201 },
    );
  });
}