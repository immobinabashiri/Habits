import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { saveWeekPlan } from "@/lib/services/calendar";
import { occurrenceDateSchema, weekPlanSchema } from "@/lib/validation/calendar";
import { parseOrThrow } from "@/lib/validation/parse";

type Context = { params: Promise<{ weekStart: string }> };

// PUT /api/calendar/week-plans/:weekStart   body: { "priorities": [{ id, text, done }] }
// Any day of the week names that week.
export function PUT(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const { date } = parseOrThrow(occurrenceDateSchema, { date: (await params).weekStart });
    const input = parseOrThrow(weekPlanSchema, await readJson(request));
    return NextResponse.json({ weekPlan: await saveWeekPlan(userId, date, input) });
  });
}
