import { jsonInit, request } from "@/lib/api/client";
import type { CreateRewardInput, UpdateRewardInput } from "@/lib/validation/reward";
import type { PublicReward, PurchaseResult } from "@/types/reward";

const rewardUrl = (id: string) => `/api/rewards/${encodeURIComponent(id)}`;

// POST /api/rewards
export async function createRewardRequest(input: CreateRewardInput): Promise<PublicReward> {
  return (await request<{ reward: PublicReward }>("/api/rewards", jsonInit("POST", input))).reward;
}

// PATCH /api/rewards/:id
export async function updateRewardRequest(id: string, input: UpdateRewardInput): Promise<PublicReward> {
  return (await request<{ reward: PublicReward }>(rewardUrl(id), jsonInit("PATCH", input))).reward;
}

// DELETE /api/rewards/:id
export async function deleteRewardRequest(id: string): Promise<void> {
  await request<void>(rewardUrl(id), { method: "DELETE" });
}

// POST /api/rewards/:id/purchase
export function purchaseRewardRequest(id: string, note?: string): Promise<PurchaseResult> {
  return request<PurchaseResult>(`${rewardUrl(id)}/purchase`, jsonInit("POST", note ? { note } : {}));
}
