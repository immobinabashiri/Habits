"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { FormField } from "@/components/auth/form-field";
import { primaryButton, SaveStatus, SettingsCard } from "@/components/settings/settings-card";
import { toApiError } from "@/lib/api/client";
import { updateProfileRequest } from "@/lib/api/settings-client";
import { MAX_DISPLAY_NAME, profileSchema } from "@/lib/validation/settings";

export function ProfileSection({ name: initialName, email }: { name: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [saved, setSaved] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setSaved(null);

    const parsed = profileSchema.safeParse({ name });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try {
      const stored = await updateProfileRequest(parsed.data);
      setName(stored);
      setSaved("Name saved.");
      router.refresh(); // the sidebar greets the user by name
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      setFieldError(apiError.fields.name);
      if (!apiError.fields.name) setError(apiError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsCard id="profile" title="Profile" description="How you are greeted in the app.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          id="profile-name"
          name="name"
          label="Name"
          autoComplete="name"
          maxLength={MAX_DISPLAY_NAME}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldError}
          disabled={pending}
        />
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Email</p>
          <p className="min-h-11 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-base text-muted-foreground">
            {email}
          </p>
          <p className="text-xs text-muted-foreground">Your email is your login and cannot be changed here.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} aria-busy={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save name"}
          </button>
          <SaveStatus error={error} saved={saved} />
        </div>
      </form>
    </SettingsCard>
  );
}
