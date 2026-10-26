import { z } from "zod";
import { isValidDateKey } from "@/lib/domain/dates";

// A real calendar day written as "YYYY-MM-DD".
export const dateKeySchema = z
  .string()
  .refine(isValidDateKey, "Use a valid date in YYYY-MM-DD format.");
