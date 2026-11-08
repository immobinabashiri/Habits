import "server-only";
import { model, models, Schema } from "mongoose";
import type { Model } from "mongoose";
import { LIMITS } from "@/lib/domain/defaults";
import { isInteger, ownerField } from "@/lib/db/schema-helpers";
import type { RewardRecord } from "@/types/reward";

const rewardSchema = new Schema<RewardRecord>(
  {
    userId: ownerField,
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
    icon: { type: String, trim: true, maxlength: 32, default: "gift" },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    price: { type: Number, required: true, min: 1, max: LIMITS.maxRewardPrice, validate: isInteger },
    category: { type: String, trim: true, minlength: 1, maxlength: 40, default: "Custom Rewards" },
    favorite: { type: Boolean, default: false },
  },
  { timestamps: true },
);

rewardSchema.index({ userId: 1 });

export const Reward: Model<RewardRecord> =
  (models.Reward as Model<RewardRecord> | undefined) ??
  model<RewardRecord>("Reward", rewardSchema);