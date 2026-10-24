import type { z } from "zod";
import { AppError } from "@/lib/errors";
import type { FieldErrors } from "@/lib/errors";

// Validates input and throws a VALIDATION_FAILED error with one message per field.
export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  data: unknown,
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.map(String).join(".") || "form";
      fields[key] ??= issue.message;
    }
    throw new AppError("VALIDATION_FAILED", fields);
  }
  return result.data as z.infer<T>;
}