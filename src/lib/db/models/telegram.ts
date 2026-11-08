import "server-only";
import { model, models, Schema } from "mongoose";
import type { Model } from "mongoose";
import { dateKey, ownerField } from "@/lib/db/schema-helpers";
import type { NotificationLogRecord, TelegramLinkTokenRecord, TelegramUpdateRecord } from "@/types/notifications";

// ---- Link tokens: short-lived, single-use, stored only as a hash ----
const linkTokenSchema = new Schema<TelegramLinkTokenRecord>(
  {
    userId: ownerField,
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
linkTokenSchema.index({ tokenHash: 1 }, { unique: true });
linkTokenSchema.index({ userId: 1 });
// MongoDB deletes expired tokens by itself (checked about once a minute; the expiry
// is also checked on every use, so the delay never matters).
linkTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---- Processed webhook updates: Telegram may deliver one more than once ----
// The duplicate guards below use _id, not a secondary unique index: MongoDB always
// enforces _id uniqueness, even before Mongoose has built (or if a host disables
// building) the other indexes.
const updateSchema = new Schema<TelegramUpdateRecord>({
  _id: { type: Number, required: true }, // = update_id
  updateId: { type: Number, required: true },
  receivedAt: { type: Date, default: Date.now },
});
updateSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 }); // Telegram keeps updates 24 h at most

// ---- Notification log: the duplicate guard for scheduled messages ----
const logSchema = new Schema<NotificationLogRecord>(
  {
    _id: { type: String, required: true }, // "<userId>:<key>"
    userId: ownerField,
    key: { type: String, required: true, maxlength: 120 },
    kind: { type: String, enum: ["habitReminder", "incompleteReminder", "dailySummary", "calendarReminder"], required: true },
    date: { type: String, required: true, validate: dateKey },
    status: { type: String, enum: ["sending", "sent", "failed"], default: "sending" },
    error: { type: String, default: null, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
logSchema.index({ userId: 1, createdAt: -1 });
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });

export const TelegramLinkToken: Model<TelegramLinkTokenRecord> =
  (models.TelegramLinkToken as Model<TelegramLinkTokenRecord> | undefined) ??
  model<TelegramLinkTokenRecord>("TelegramLinkToken", linkTokenSchema);

export const TelegramUpdate: Model<TelegramUpdateRecord> =
  (models.TelegramUpdate as Model<TelegramUpdateRecord> | undefined) ??
  model<TelegramUpdateRecord>("TelegramUpdate", updateSchema);

export const NotificationLog: Model<NotificationLogRecord> =
  (models.NotificationLog as Model<NotificationLogRecord> | undefined) ??
  model<NotificationLogRecord>("NotificationLog", logSchema);
