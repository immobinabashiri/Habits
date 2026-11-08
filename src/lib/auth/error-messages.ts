import { APP_ERRORS } from "@/lib/errors";
import type { ErrorCode } from "@/lib/errors";

type Context = "login" | "signup";

function isErrorCode(value: string): value is ErrorCode {
  return value in APP_ERRORS;
}

// `code` is result.error from signIn(). It is one of our ErrorCode values, or a
// generic NextAuth error such as "CredentialsSignin" / "Configuration".
export function getAuthErrorMessage(
  code: string | null | undefined,
  context: Context,
): string {
  if (!code || !isErrorCode(code)) return APP_ERRORS.INTERNAL.message;

  // On the login page an unknown email falls into the sign-up branch of
  // authorize(). Never show sign-up validation messages there.
  if (context === "login" && (code === "NAME_AT_LEAST" || code === "LAST_NAME_AT_LEAST")) {
    return APP_ERRORS.INVALID_CREDENTIALS.message;
  }

  if (context === "signup" && (code === "INVALID_CREDENTIALS" || code === "EMAIL_ALREADY_REGISTERED")) {
    return "An account with this email may already exist. Try logging in instead.";
  }

  return APP_ERRORS[code].message;
}