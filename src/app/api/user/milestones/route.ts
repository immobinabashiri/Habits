import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { setMilestones } from "@/lib/services/settings";
import { parseOrThrow } from "@/lib/validation/parse";
import { milestonesSchema } from "@/lib/validation/settings";

// PUT /api/user/milestones   body: { "milestones": [{ "days": 7, "gems": 50 }, ...] }
// Replaces the whole list ([] = no streak bonuses).
export function PUT(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const input = parseOrThrow(milestonesSchema, await readJson(request));
    return NextResponse.json({ milestones: await setMilestones(userId, input) });
  });
}
