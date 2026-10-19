"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@/components/auth/form-field";
import { getAuthErrorMessage } from "@/lib/auth/error-messages";
import {
  EMAIL_PATTERN,
  MAX_FULL_NAME,
  MAX_PASSWORD,
  MIN_NAME,
  MIN_PASSWORD,
} from "@/lib/auth/rules";

type Field = "name" | "last_name" | "email" | "password" | "form";
type Errors = Partial<Record<Field, string>>;

export function SignupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const lastName = String(data.get("last_name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");

    // Same rules as the server, so mistakes are shown immediately.
    const next: Errors = {};
    if (name.length < MIN_NAME) {
      next.name = `First name must be at least ${MIN_NAME} characters.`;
    }
    if (lastName.length < MIN_NAME) {
      next.last_name = `Last name must be at least ${MIN_NAME} characters.`;
    } else if (`${name} ${lastName}`.length > MAX_FULL_NAME) {
      next.last_name = `First and last name together must be at most ${MAX_FULL_NAME} characters.`;
    }
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      next.email = "Enter a valid email address.";
    }
    if (password.length < MIN_PASSWORD) {
      next.password = `Password must be at least ${MIN_PASSWORD} characters.`;
    } else if (password.length > MAX_PASSWORD) {
      next.password = `Password must be at most ${MAX_PASSWORD} characters.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const result = await signIn("credentials", {
        name,
        last_name: lastName,
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        const message = getAuthErrorMessage(result.error, "signup");
        if (result.error === "NAME_AT_LEAST") setErrors({ name: message });
        else if (result.error === "LAST_NAME_AT_LEAST") setErrors({ last_name: message });
        else if (result.error === "PASSWORD_AT_LEAST") setErrors({ password: message });
        else setErrors({ form: message });
        return;
      }
      // The account exists and the session is already started.
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrors({ form: getAuthErrorMessage(null, "signup") });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {errors.form ? (
        <p
          role="alert"
          className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive"
        >
          {errors.form}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="signup-name"
          name="name"
          label="First name"
          autoComplete="given-name"
          error={errors.name}
          disabled={pending}
        />
        <FormField
          id="signup-last-name"
          name="last_name"
          label="Last name"
          autoComplete="family-name"
          error={errors.last_name}
          disabled={pending}
        />
      </div>
      <FormField
        id="signup-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        error={errors.email}
        disabled={pending}
      />
      <FormField
        id="signup-password"
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        placeholder={`At least ${MIN_PASSWORD} characters`}
        error={errors.password}
        disabled={pending}
      />

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="min-h-12 w-full rounded-md bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}