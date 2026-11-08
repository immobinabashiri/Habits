import { NextResponse } from "next/server";
import { parseObjectId, readJson, respond } from "@/lib/api/http";
import { requireUserId } from "@/lib/auth/session";
import { deleteReward, updateReward } from "@/lib/services/rewards";
import { parseOrThrow } from "@/lib/validation/parse";
import { updateRewardSchema } from "@/lib/validation/reward";

type Context = { params: Promise<{ id: string }> };

// PATCH /api/rewards/:id   (any subset of the editable fields, including favorite)
export function PATCH(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const rewardId = parseObjectId((await params).id);
    const input = parseOrThrow(updateRewardSchema, await readJson(request));
    return NextResponse.json({ reward: await updateReward(userId, rewardId, input) });
  });
}

// DELETE /api/rewards/:id   (purchase history is kept)
export function DELETE(_request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const rewardId = parseObjectId((await params).id);
    await deleteReward(userId, rewardId);
    return new Response(null, { status: 204 });
  });
}
