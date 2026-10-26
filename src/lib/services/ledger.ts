import "server-only";
import type { Types } from "mongoose";
import { Transaction } from "@/lib/db/models/transaction";
import { User } from "@/lib/db/models/user";
import type { TransactionType } from "@/types/reward";

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === 11000
  );
}

type WalletDelta = Partial<{
  xp: number;
  gems: number;
  totalGemsEarned: number;
  totalGemsSpent: number;
  streakFreezes: number;
}>;

// Atomic $inc on the cached wallet. Zero deltas are skipped.
export async function adjustWallet(userId: Types.ObjectId, delta: WalletDelta): Promise<void> {
  const inc: Record<string, number> = {};
  for (const [field, value] of Object.entries(delta)) {
    if (value) inc[`wallet.${field}`] = value;
  }
  if (Object.keys(inc).length === 0) return;
  await User.updateOne({ _id: userId }, { $inc: inc });
}

interface LedgerEntry {
  type: TransactionType;
  amount: number; // signed, never 0
  label: string;
  refId?: string | null;
  eventKey: string; // unique per user: the same event can never be recorded twice
}

// Appends to the ledger. Returns false when this event was already recorded.
export async function recordTransaction(
  userId: Types.ObjectId,
  entry: LedgerEntry,
): Promise<boolean> {
  try {
    await Transaction.create({ userId, refId: null, ...entry });
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) return false;
    throw error;
  }
}
