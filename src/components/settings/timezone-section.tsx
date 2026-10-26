"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { primaryButton, quietButton, SaveStatus, SettingsCard } from "@/components/settings/settings-card";
import { toApiError } from "@/lib/api/client";
import { syncTimezoneRequest } from "@/lib/api/dashboard-client";

interface TimezoneSectionProps {
  timezone: string; // saved value
  options: string[]; // every IANA time zone, computed on the server so SSR and hydration match
}

export function TimezoneSection({ timezone, options }: TimezoneSectionProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(timezone);
  const [value, setValue] = useState(timezone);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Read only when the button is pressed, so nothing here can differ between server and browser.
  function useThisDevice() {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setMessage(null);
    if (detected && options.includes(detected)) {
      setValue(detected);
      setError(null);
    } else {
      setError("This device's time zone is not in the list. Pick one by hand.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      await syncTimezoneRequest(value);
      setSaved(value);
      setMessage(`Saved. Your days now start and end in ${value}.`);
      router.refresh();
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      setError(apiError.fields.timezone ?? apiError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsCard
      id="timezone"
      title="Time zone"
      description="Decides when a day starts and ends, so it controls what counts as today and when a streak breaks."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="timezone-select" className="text-sm font-medium">
            Your time zone
          </label>
          <select
            id="timezone-select"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setMessage(null);
            }}
            disabled={pending}
            className="block min-h-11 w-full rounded-md border border-input bg-card px-3 text-base text-card-foreground disabled:opacity-60"
          >
            {options.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Changing it moves what counts as today, so do it when your location really changes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || value === saved} aria-busy={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save time zone"}
          </button>
          <button type="button" onClick={useThisDevice} disabled={pending} className={quietButton}>
            Use this device&apos;s time zone
          </button>
        </div>
        <SaveStatus error={error} saved={message} />
      </form>
    </SettingsCard>
  );
}
