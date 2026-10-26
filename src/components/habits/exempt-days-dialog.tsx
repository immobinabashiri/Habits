"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  addExemptDateRequest,
  removeExemptDateRequest,
  toApiError,
} from "@/lib/api/habits-client";
import { formatDateKey } from "@/lib/domain/dates";
import type { PublicHabit } from "@/types/habits";

interface ExemptDaysDialogProps {
  habit: PublicHabit; // always the latest copy from the list
  onClose: () => void;
  onChange: (habit: PublicHabit) => void; // the API returns the updated habit
}

export function ExemptDaysDialog({ habit, onClose, onChange }: ExemptDaysDialogProps) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  // "add", or the date currently being removed. One request at a time.
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<PublicHabit>) {
    setBusy(key);
    setError(null);
    try {
      onChange(await action());
      return true;
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return false;
      }
      setError(apiError.fields.date ?? apiError.message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!date) {
      setError("Pick a date first.");
      return;
    }
    if (await run("add", () => addExemptDateRequest(habit.id, date))) setDate("");
  }

  // Newest first: the dates you care about are the recent and upcoming ones.
  const dates = [...habit.exemptDates].reverse();

  return (
    <div className="flex max-h-[90dvh] flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h2 id="modal-title" className="text-lg font-bold tracking-tight">
            Exempt days
          </h2>
          <p className="truncate text-sm text-muted-foreground">{habit.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">
          Days you can skip without breaking your streak, like holidays, travel or sick days.
        </p>

        <form onSubmit={handleAdd} noValidate className="space-y-1.5">
          <label htmlFor="exempt-date" className="text-sm font-medium">
            Add a day
          </label>
          <div className="flex gap-3">
            <input
              id="exempt-date"
              type="date"
              data-autofocus
              min={habit.startDate}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={busy !== null}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "exempt-error" : undefined}
              className="block min-h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-base text-card-foreground disabled:opacity-60 aria-[invalid=true]:border-destructive"
            />
            <button
              type="submit"
              disabled={busy !== null}
              aria-busy={busy === "add"}
              className="min-h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy === "add" ? "Adding…" : "Add"}
            </button>
          </div>
          {error ? (
            <p id="exempt-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </form>

        {dates.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No exempt days yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {dates.map((key) => (
              <li key={key} className="flex items-center justify-between gap-3 py-1 pl-4 pr-1">
                <span className="text-sm font-medium">{formatDateKey(key)}</span>
                <button
                  type="button"
                  onClick={() => run(key, () => removeExemptDateRequest(habit.id, key))}
                  disabled={busy !== null}
                  aria-label={`Remove ${formatDateKey(key)}`}
                  title="Remove"
                  className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-md bg-secondary px-5 text-sm font-semibold text-secondary-foreground hover:opacity-90"
        >
          Done
        </button>
      </div>
    </div>
  );
}
