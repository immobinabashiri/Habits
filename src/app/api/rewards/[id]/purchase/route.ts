import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { purchaseReward } from "@/lib/services/rewards";
import { parseOrThrow } from "@/lib/validation/parse";
import { purchaseSchema } from "@/lib/validation/reward";

type Context = { params: Promise<{ id: string }> };

// POST /api/rewards/:id/purchase   body: { "note"?: string }   (costs gems)
export function POST(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const rewardId = parseObjectId((await params).id);
    const input = parseOrThrow(purchaseSchema, await readJson(request));
    return NextResponse.json(await purchaseReward(userId, rewardId, input), { status: 201 });
  });
}
