import "server-only";
import type { HydratedDocument, Types } from "mongoose";
import { Reward } from "@/lib/db/models/reward";
import { Purchase } from "@/lib/db/models/transaction";
import { User } from "@/lib/db/models/user";
import { LIMITS } from "@/lib/domain/defaults";
import { AppError } from "@/lib/errors";
import { adjustWallet, recordTransaction } from "@/lib/services/ledger";
import type { CreateRewardInput, PurchaseInput, UpdateRewardInput } from "@/lib/validation/reward";
import { connectDB } from "@/utils/connectDB";
import type {
  PublicPurchase,
  PublicReward,
  PurchaseRecord,
  PurchaseResult,
  RewardRecord,
  RewardsData,
} from "@/types/reward";

const HISTORY_LIMIT = 30;

export function toPublicReward(reward: HydratedDocument<RewardRecord>): PublicReward {
  return {
    id: reward._id.toString(),
    name: reward.name,
    icon: reward.icon,
    description: reward.description,
    price: reward.price,
    category: reward.category,
    favorite: reward.favorite,
    createdAt: reward.createdAt.toISOString(),
    updatedAt: reward.updatedAt.toISOString(),
  };
}

export function toPublicPurchase(purchase: HydratedDocument<PurchaseRecord>): PublicPurchase {
  return {
    id: purchase._id.toString(),
    kind: purchase.kind,
    name: purchase.name,
    icon: purchase.icon,
    category: purchase.category,
    cost: purchase.cost,
    quantity: purchase.quantity,
    note: purchase.note,
    purchasedAt: purchase.purchasedAt.toISOString(),
  };
}

// Every lookup filters by userId: someone else's reward behaves like a missing one.
async function findOwnedReward(userId: Types.ObjectId, rewardId: Types.ObjectId) {
  const reward = await Reward.findOne({ _id: rewardId, userId });
  if (!reward) throw new AppError("NOT_FOUND");
  return reward;
}

export async function getRewardsData(userId: Types.ObjectId): Promise<RewardsData> {
  await connectDB();
  const [user, rewards, purchases] = await Promise.all([
    User.findById(userId).select("wallet.gems settings.timezone"),
    Reward.find({ userId }).sort({ createdAt: 1 }).limit(LIMITS.maxRewards),
    Purchase.find({ userId }).sort({ purchasedAt: -1 }).limit(HISTORY_LIMIT),
  ]);
  if (!user) throw new AppError("UNAUTHENTICATED");
  return {
    rewards: rewards.map((reward) => toPublicReward(reward)),
    purchases: purchases.map((purchase) => toPublicPurchase(purchase)),
    gems: user.wallet.gems,
    timezone: user.settings.timezone,
  };
}

export async function createReward(
  userId: Types.ObjectId,
  input: CreateRewardInput,
): Promise<PublicReward> {
  await connectDB();
  // Two simultaneous requests could exceed the limit by one. That is acceptable here.
  if ((await Reward.countDocuments({ userId })) >= LIMITS.maxRewards) {
    throw new AppError("LIMIT_REACHED");
  }
  const reward = await Reward.create({
    userId,
    name: input.name,
    price: input.price,
    icon: input.icon ?? "gift",
    category: input.category ?? "Custom Rewards",
    description: input.description ?? "",
    favorite: input.favorite ?? false,
  });
  return toPublicReward(reward);
}

export async function updateReward(
  userId: Types.ObjectId,
  rewardId: Types.ObjectId,
  input: UpdateRewardInput,
): Promise<PublicReward> {
  await connectDB();
  const reward = await findOwnedReward(userId, rewardId);

  if (input.name !== undefined) reward.name = input.name;
  if (input.price !== undefined) reward.price = input.price;
  if (input.icon !== undefined) reward.icon = input.icon;
  if (input.category !== undefined) reward.category = input.category;
  if (input.description !== undefined) reward.description = input.description;
  if (input.favorite !== undefined) reward.favorite = input.favorite;

  await reward.save(); // schema validators run here
  return toPublicReward(reward);
}

// Purchases keep their own copy of the name, icon and cost, so history stays
// correct after a reward is edited or deleted.
export async function deleteReward(userId: Types.ObjectId, rewardId: Types.ObjectId): Promise<void> {
  await connectDB();
  const deleted = await Reward.findOneAndDelete({ _id: rewardId, userId });
  if (!deleted) throw new AppError("NOT_FOUND");
}

// Spends gems on a reward. The price is read once; the payment is ONE atomic
// update that only applies while the balance still covers it, so two quick
// clicks can never overspend. If saving the purchase fails after paying, the
// gems are given back.
export async function purchaseReward(
  userId: Types.ObjectId,
  rewardId: Types.ObjectId,
  input: PurchaseInput,
): Promise<PurchaseResult> {
  await connectDB();
  const reward = await findOwnedReward(userId, rewardId);
  const cost = reward.price;

  const paid = await User.findOneAndUpdate(
    { _id: userId, "wallet.gems": { $gte: cost } },
    { $inc: { "wallet.gems": -cost, "wallet.totalGemsSpent": cost } },
    { returnDocument: "after" },
  ).select("wallet.gems");
  if (!paid) throw new AppError("INSUFFICIENT_GEMS");

  let purchase;
  try {
    purchase = await Purchase.create({
      userId,
      kind: "reward",
      rewardId: reward._id,
      name: reward.name,
      icon: reward.icon,
      category: reward.category,
      cost,
      quantity: 1,
      note: input.note ?? "",
    });
  } catch (error) {
    await adjustWallet(userId, { gems: cost, totalGemsSpent: -cost }); // give the gems back
    throw error;
  }

  await recordTransaction(userId, {
    type: "purchase",
    amount: -cost,
    label: `Bought: ${reward.name}`,
    refId: purchase._id.toString(),
    eventKey: `purchase:${purchase._id}`,
  });

  return { purchase: toPublicPurchase(purchase), gems: paid.wallet.gems };
}
