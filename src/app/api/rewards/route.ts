import { NextResponse } from "next/server";
import { readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { createReward, getRewardsData } from "@/lib/services/rewards";
import { parseOrThrow } from "@/lib/validation/parse";
import { createRewardSchema } from "@/lib/validation/reward";

// GET /api/rewards   (rewards, purchase history and the gem balance)
export function GET() {
  return respond(async () => {
    const userId = await requireUserId();
    return NextResponse.json(await getRewardsData(userId));
  });
}

// POST /api/rewards
export function POST(request: Request) {
  return respond(async () => {
    const userId = await requireUserId();
    const input = parseOrThrow(createRewardSchema, await readJson(request));
    return NextResponse.json({ reward: await createReward(userId, input) }, { status: 201 });
  });
}
