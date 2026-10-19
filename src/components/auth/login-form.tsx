"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@/components/auth/form-field";
import { getAuthErrorMessage } from "@/lib/auth/error-messages";
import { EMAIL_PATTERN } from "@/lib/auth/rules";

type Errors = { email?: string; password?: string; form?: string };

export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");

    // Quick checks so obvious mistakes never reach the server.
    const next: Errors = {};
    if (!EMAIL_PATTERN.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (next.email || next.password) return;

    setPending(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setErrors({ form: getAuthErrorMessage(result.error, "login") });
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrors({ form: getAuthErrorMessage(null, "login") });
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

      <FormField
        id="login-email"
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
        id="login-password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        error={errors.password}
        disabled={pending}
      />

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="min-h-12 w-full rounded-md bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}