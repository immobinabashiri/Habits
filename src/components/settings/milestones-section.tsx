"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { primaryButton, quietButton, SaveStatus, SettingsCard } from "@/components/settings/settings-card";
import { toApiError } from "@/lib/api/client";
import { saveMilestonesRequest } from "@/lib/api/settings-client";
import {
  DEFAULT_STREAK_MILESTONES,
  MAX_MILESTONE_DAYS,
  MAX_MILESTONE_GEMS,
  MAX_MILESTONES,
} from "@/lib/domain/defaults";
import { milestonesSchema } from "@/lib/validation/settings";
import type { StreakMilestone } from "@/types/user";

// Numbers are kept as text while typing and parsed on save. `key` keeps each row's
// identity stable when another row is removed.
interface Row {
  key: number;
  days: string;
  gems: string;
}

type Errors = Partial<Record<string, string>>;

const toRows = (list: readonly StreakMilestone[], startKey = 0): Row[] =>
  list.map((m, index) => ({ key: startKey + index, days: String(m.days), gems: String(m.gems) }));

const asNumber = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : undefined);

const cell =
  "block min-h-11 w-full rounded-md border border-input bg-card px-3 text-base text-card-foreground disabled:opacity-60 aria-[invalid=true]:border-destructive";

export function MilestonesSection({ milestones }: { milestones: StreakMilestone[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => toRows(milestones));
  const [nextKey, setNextKey] = useState(milestones.length);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function replaceRows(list: readonly StreakMilestone[]) {
    setRows(toRows(list, nextKey));
    setNextKey(nextKey + list.length);
    setErrors({});
    setSaved(null);
  }

  function update(key: number, field: "days" | "gems", text: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: text } : row)));
    setSaved(null);
  }

  function addRow() {
    setRows((current) => [...current, { key: nextKey, days: "", gems: "0" }]);
    setNextKey(nextKey + 1);
    setSaved(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setSaved(null);

    const parsed = milestonesSchema.safeParse({
      milestones: rows.map((row) => ({ days: asNumber(row.days), gems: asNumber(row.gems) })),
    });
    if (!parsed.success) {
      const found: Errors = {};
      for (const issue of parsed.error.issues) found[issue.path.join(".") || "form"] ??= issue.message;
      setErrors(found);
      return;
    }

    setErrors({});
    setPending(true);
    try {
      const stored = await saveMilestonesRequest(parsed.data);
      replaceRows(stored); // shown sorted, exactly as saved
      setSaved(stored.length === 0 ? "Saved. You have no streak bonuses." : "Streak bonuses saved.");
      router.refresh();
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

  const listError = errors.milestones ?? errors.form;

  return (
    <SettingsCard
      id="milestones"
      title="Streak bonuses"
      description="Gems you earn the first time a habit reaches a streak length. Each bonus is paid once per streak."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
            No streak bonuses. Streaks still count, they just do not pay gems.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row, index) => {
              const daysError = errors[`milestones.${index}.days`];
              const gemsError = errors[`milestones.${index}.gems`];
              return (
                <li key={row.key} className="grid grid-cols-[1fr_1fr_auto] items-start gap-3">
                  <div>
                    <label htmlFor={`ms-days-${row.key}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                      Streak (days)
                    </label>
                    <input
                      id={`ms-days-${row.key}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_MILESTONE_DAYS}
                      value={row.days}
                      onChange={(e) => update(row.key, "days", e.target.value)}
                      aria-invalid={daysError ? true : undefined}
                      aria-describedby={daysError ? `ms-days-${row.key}-error` : undefined}
                      disabled={pending}
                      className={cell}
                    />
                    {daysError ? (
                      <p id={`ms-days-${row.key}-error`} className="mt-1 text-sm text-destructive">
                        {daysError}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label htmlFor={`ms-gems-${row.key}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                      Gems
                    </label>
                    <input
                      id={`ms-gems-${row.key}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_MILESTONE_GEMS}
                      value={row.gems}
                      onChange={(e) => update(row.key, "gems", e.target.value)}
                      aria-invalid={gemsError ? true : undefined}
                      aria-describedby={gemsError ? `ms-gems-${row.key}-error` : undefined}
                      disabled={pending}
                      className={cell}
                    />
                    {gemsError ? (
                      <p id={`ms-gems-${row.key}-error`} className="mt-1 text-sm text-destructive">
                        {gemsError}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRows((current) => current.filter((item) => item.key !== row.key));
                      setSaved(null);
                    }}
                    disabled={pending}
                    aria-label={`Remove bonus ${index + 1}${row.days ? ` (${row.days} days)` : ""}`}
                    title="Remove"
                    className="mt-6 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {listError ? (
          <p role="alert" className="text-sm text-destructive">
            {listError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            disabled={pending || rows.length >= MAX_MILESTONES}
            className={quietButton}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add a bonus
          </button>
          <button
            type="button"
            onClick={() => replaceRows(DEFAULT_STREAK_MILESTONES)}
            disabled={pending}
            className={quietButton}
          >
            Reset to defaults
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          A new or shorter bonus also counts for streaks you are on right now: it is paid the next time
          you complete that habit. Bonuses you already earned are never taken back.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} aria-busy={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save streak bonuses"}
          </button>
          <SaveStatus error={error} saved={saved} />
        </div>
      </form>
    </SettingsCard>
  );
}
