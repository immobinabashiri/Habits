import { createRewardSchema } from "@/lib/validation/reward";
import type { CreateRewardInput } from "@/lib/validation/reward";
import type { PublicReward } from "@/types/reward";

// Error keys match the paths the server uses in `fields`, so client-side and
// server-side errors render through the same code.
export type RewardFormErrors = Partial<Record<string, string>>;

export const DEFAULT_CATEGORY = "Custom Rewards";

// The price is kept as text while typing and parsed on submit.
export interface RewardDraft {
  name: string;
  price: string;
  category: string;
  description: string;
  icon: string;
  favorite: boolean;
}

export const INITIAL_REWARD_DRAFT: RewardDraft = {
  name: "",
  price: "50",
  category: "",
  description: "",
  icon: "gift",
  favorite: false,
};

export function draftFromReward(reward: PublicReward): RewardDraft {
  return {
    name: reward.name,
    price: String(reward.price),
    category: reward.category,
    description: reward.description,
    icon: reward.icon,
    favorite: reward.favorite,
  };
}

// Same rules as the server (the very same schema), so the user gets instant
// feedback and the server stays the final judge.
export function buildRewardInput(
  draft: RewardDraft,
): { ok: true; input: CreateRewardInput } | { ok: false; errors: RewardFormErrors } {
  const price = /^\d+$/.test(draft.price.trim()) ? Number(draft.price) : Number.NaN;
  const parsed = createRewardSchema.safeParse({
    name: draft.name,
    price: Number.isNaN(price) ? undefined : price,
    category: draft.category.trim() || DEFAULT_CATEGORY,
    description: draft.description,
    icon: draft.icon,
    favorite: draft.favorite,
  });
  if (parsed.success) return { ok: true, input: parsed.data };

  const errors: RewardFormErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "form";
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
