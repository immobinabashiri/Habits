import { z } from "zod";
import { LIMITS } from "@/lib/domain/defaults";

const name = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(60, "Name must be at most 60 characters.");
const icon = z.string().trim().min(1).max(32);
const category = z.string().trim().min(1).max(40);
const description = z.string().trim().max(300, "Description is too long.");
const price = z
  .number("Enter a price.")
  .int("Price must be a whole number.")
  .min(1, "Price must be at least 1 gem.")
  .max(LIMITS.maxRewardPrice, `Price must be at most ${LIMITS.maxRewardPrice.toLocaleString("en-US")}.`);

export const createRewardSchema = z.object({
  name,
  price,
  icon: icon.optional(),
  category: category.optional(),
  description: description.optional(),
  favorite: z.boolean().optional(),
});

export const updateRewardSchema = z
  .object({
    name: name.optional(),
    price: price.optional(),
    icon: icon.optional(),
    category: category.optional(),
    description: description.optional(),
    favorite: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Send at least one field to change.");

export const purchaseSchema = z.object({
  note: z
    .string()
    .trim()
    .max(LIMITS.maxPurchaseNote, `Note must be at most ${LIMITS.maxPurchaseNote} characters.`)
    .optional(),
});

export type CreateRewardInput = z.infer<typeof createRewardSchema>;
export type UpdateRewardInput = z.infer<typeof updateRewardSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
