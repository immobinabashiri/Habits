"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@/components/auth/form-field";
import { primaryButton, SaveStatus, SettingsCard } from "@/components/settings/settings-card";
import { toApiError } from "@/lib/api/client";
import { changePasswordRequest } from "@/lib/api/settings-client";
import { MAX_NEW_PASSWORD, passwordSchema } from "@/lib/validation/settings";

type Errors = Partial<Record<"currentPassword" | "newPassword" | "confirm", string>>;

export function PasswordSection() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setSaved(null);

    const found: Errors = {};
    const parsed = passwordSchema.safeParse({ currentPassword: current, newPassword: next });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "currentPassword" | "newPassword";
        found[key] ??= issue.message;
      }
    }
    if (confirm !== next) found.confirm = "The two new passwords do not match.";
    if (!parsed.success || found.confirm) {
      setErrors(found);
      return;
    }

    setErrors({});
    setPending(true);
    try {
      await changePasswordRequest(parsed.data);
      setCurrent("");
      setNext("");
      setConfirm("");
      setSaved("Password changed. Use the new one next time you log in.");
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      const hasFields = Object.keys(apiError.fields).length > 0;
      if (hasFields) setErrors(apiError.fields);
      else setError(apiError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsCard
      id="password"
      title="Password"
      description="Choose a new password. You need your current one to do this."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          id="password-current"
          name="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
          maxLength={MAX_NEW_PASSWORD}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={errors.currentPassword}
          disabled={pending}
        />
        <FormField
          id="password-new"
          name="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
          maxLength={MAX_NEW_PASSWORD}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={errors.newPassword}
          disabled={pending}
        />
        <FormField
          id="password-confirm"
          name="confirm"
          label="Repeat the new password"
          type="password"
          autoComplete="new-password"
          maxLength={MAX_NEW_PASSWORD}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          disabled={pending}
        />
        <p className="text-sm text-muted-foreground">
          Other devices where you are already logged in stay logged in until their session ends.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} aria-busy={pending} className={primaryButton}>
            {pending ? "Changing…" : "Change password"}
          </button>
          <SaveStatus error={error} saved={saved} />
        </div>
      </form>
    </SettingsCard>
  );
}
