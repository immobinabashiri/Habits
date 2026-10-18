import "server-only";
import { model, models, Schema } from "mongoose";
import type { Model } from "mongoose";
import { isInteger, ownerField } from "@/lib/db/schema-helpers";
import type { PurchaseRecord, TransactionRecord } from "@/types/reward";

// ---- Transaction: append-only ledger. The API must never update or delete these. ----
const transactionSchema = new Schema<TransactionRecord>(
  {
    userId: ownerField,
    type: {
      type: String,
      enum: ["habit", "streak-bonus", "reversal", "adjustment", "purchase"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: [
        isInteger,
        { validator: (v: number) => v !== 0, message: "amount must not be 0" },
      ],
    },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    refId: { type: String, default: null, maxlength: 200 },
    eventKey: { type: String, required: true, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One reward per event: a second insert with the same eventKey fails.
transactionSchema.index({ userId: 1, eventKey: 1 }, { unique: true });
// Transaction history, newest first.
transactionSchema.index({ userId: 1, createdAt: -1 });

// ---- Purchase ----
const purchaseSchema = new Schema<PurchaseRecord>({
  userId: ownerField,
  kind: { type: String, enum: ["reward", "streak-freeze"], required: true },
  rewardId: { type: Schema.Types.ObjectId, ref: "Reward", default: null },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  icon: { type: String, trim: true, maxlength: 32, default: "gift" },
  category: { type: String, trim: true, maxlength: 40, default: "" },
  cost: { type: Number, required: true, min: 1, validate: isInteger },
  quantity: { type: Number, default: 1, min: 1, validate: isInteger },
  note: { type: String, trim: true, maxlength: 200, default: "" },
  purchasedAt: { type: Date, default: Date.now },
});
purchaseSchema.index({ userId: 1, purchasedAt: -1 });

export const Transaction: Model<TransactionRecord> =
  (models.Transaction as Model<TransactionRecord> | undefined) ??
  model<TransactionRecord>("Transaction", transactionSchema);

export const Purchase: Model<PurchaseRecord> =
  (models.Purchase as Model<PurchaseRecord> | undefined) ??
  model<PurchaseRecord>("Purchase", purchaseSchema);