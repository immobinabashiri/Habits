import type { Types } from "mongoose";

// A shop item owned by one user (HTML: S.rewards).
export interface RewardRecord {
  userId: Types.ObjectId;
  name: string;
  icon: string;
  description: string;
  price: number; // gems
  category: string;
  favorite: boolean; // HTML: fav
  createdAt: Date;
  updatedAt: Date;
}

// HTML: t = habit | bonus | reversal | adjust | purchase
export type TransactionType =
  | "habit"
  | "streak-bonus"
  | "reversal"
  | "adjustment"
  | "purchase";

// HTML: S.tx. Append-only ledger that explains every change of the balance.
export interface TransactionRecord {
  userId: Types.ObjectId;
  type: TransactionType;
  amount: number; // signed: positive earns, negative spends
  label: string;
  refId: string | null; // completion id, purchase id, or milestone key
  // Unique per user. Prevents granting the same reward twice for one event,
  // e.g. "completion:<id>" or "milestone:<habitId>:<days>:<startDate>".
  eventKey: string;
  createdAt: Date;
}

export type PurchaseKind = "reward" | "streak-freeze";

// HTML: S.purch
export interface PurchaseRecord {
  userId: Types.ObjectId;
  kind: PurchaseKind;
  rewardId: Types.ObjectId | null; // null for Streak Freezes
  name: string; // snapshots: stay correct if the reward is edited or deleted
  icon: string;
  category: string;
  cost: number; // total gems spent
  quantity: number; // 1 for rewards, n for "Streak Freeze x n"
  note: string;
  purchasedAt: Date;
}