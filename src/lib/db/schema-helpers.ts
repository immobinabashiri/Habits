import "server-only";
import { Schema } from "mongoose";

export const isInteger = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

function isRealDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  // Rejects impossible dates such as 2026-02-31.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export const dateKey = {
  validator: isRealDateKey,
  message: "{PATH} must be a valid YYYY-MM-DD date",
};

// Every user-owned document stores its owner. All queries must filter by it.
export const ownerField = {
  type: Schema.Types.ObjectId,
  ref: "User",
  required: true,
};