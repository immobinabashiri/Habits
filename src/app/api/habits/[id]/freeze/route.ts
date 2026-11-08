import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { decideMissedDay } from "@/lib/services/streak-freezes";
import { missedDaySchema } from "@/lib/validation/dashboard";
import { parseOrThrow } from "@/lib/validation/parse";

type Context = { params: Promise<{ id: string }> };

// POST /api/habits/:id/freeze   body: { "date": "YYYY-MM-DD", "decision": "frozen" | "broken" }
export function POST(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const habitId = parseObjectId((await params).id);
    const { date, decision } = parseOrThrow(missedDaySchema, await readJson(request));
    return NextResponse.json(await decideMissedDay(userId, habitId, date, decision));
  });
}
