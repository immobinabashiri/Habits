import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { setHabitOrder } from "@/lib/services/user";
import { habitOrderSchema } from "@/lib/validation/dashboard";
import { parseOrThrow } from "@/lib/validation/parse";

// PUT /api/user/habit-order   body: { "habitIds": ["<id>", "<id>", ...] }
// Replaces the user's habit order for the dashboard.
export function PUT(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const { habitIds } = parseOrThrow(habitOrderSchema, await readJson(request));
    await setHabitOrder(userId, habitIds);
    return NextResponse.json({ ok: true });
  });
}
