"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { FormField } from "@/components/auth/form-field";
import { HABIT_ICON_KEYS, HabitIcon } from "@/components/habits/habit-icons";
import { buildHabitInput, draftFromHabit, INITIAL_DRAFT } from "@/components/habits/habit-draft";
import type { FormErrors, HabitDraft } from "@/components/habits/habit-draft";
import { ApiClientError, createHabitRequest, updateHabitRequest } from "@/lib/api/habits-client";
import { LIMITS } from "@/lib/domain/defaults";
import { WEEKDAY_LONG, WEEKDAY_SHORT, WEEK_ORDER } from "@/lib/domain/weekdays";
import type { Weekday } from "@/types/common";
import type { HabitKind, PublicHabit } from "@/types/habits";

interface HabitFormProps {
  habit?: PublicHabit; // present = edit mode, absent = create mode
  onClose: () => void;
  onSaved: (habit: PublicHabit) => void;
}

const KINDS: { value: HabitKind; title: string; hint: string }[] = [
  { value: "core", title: "Core", hint: "Your essentials. Earns XP." },
  { value: "bonus", title: "Bonus", hint: "Extras. Earns XP and gems." },
];

// Shared look of a selectable chip. The real input is visually hidden (sr-only)
// but stays focusable, so keyboard and screen readers work natively.
const chipFace =
  "inline-flex items-center justify-center rounded-md border border-input bg-card text-sm font-medium transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-60";

function Fieldset({ legend, error, children }: { legend: string; error?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </fieldset>
  );
}

export function HabitForm({ habit, onClose, onSaved }: HabitFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<HabitDraft>(() => (habit ? draftFromHabit(habit) : INITIAL_DRAFT));
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const bonus = draft.kind === "bonus";

  function set<K extends keyof HabitDraft>(key: K, value: HabitDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleDay(day: Weekday) {
    setDraft((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((d) => d !== day)
        : [...current.days, day],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const result = buildHabitInput(draft, habit ? "update" : "create");
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setPending(true);
    try {
      onSaved(
        habit
          ? await updateHabitRequest(habit.id, result.input)
          : await createHabitRequest(result.input),
      );
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        setErrors({ form: "Something went wrong. Please try again." });
        return;
      }
      if (error.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      // Field-level messages from the server go next to their inputs;
      // anything else (limit reached, network, server error) goes on top.
      const hasFields = Object.keys(error.fields).length > 0;
      setErrors({ ...error.fields, ...(hasFields ? {} : { form: error.message }) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-h-[90dvh] flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id="modal-title" className="text-lg font-bold tracking-tight">
          {habit ? "Edit habit" : "New habit"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto px-5 py-5">
        {errors.form ? (
          <p role="alert" className="rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
            {errors.form}
          </p>
        ) : null}

        <FormField
          id="habit-name"
          name="name"
          label="Name"
          placeholder="e.g. Read 10 pages"
          maxLength={60}
          autoComplete="off"
          data-autofocus
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
          disabled={pending}
        />

        <Fieldset legend="Type">
          <div className="grid grid-cols-2 gap-3">
            {KINDS.map(({ value, title, hint }) => (
              <label key={value} className="block cursor-pointer">
                <input
                  type="radio"
                  name="kind"
                  value={value}
                  checked={draft.kind === value}
                  onChange={() => set("kind", value)}
                  disabled={pending}
                  className="peer sr-only"
                />
                <span
                  className={`${chipFace} min-h-11 w-full flex-col items-start gap-0.5 px-3 py-2 text-left peer-checked:bg-secondary peer-checked:text-secondary-foreground`}
                >
                  <span className="font-semibold">{title}</span>
                  <span className="text-xs font-normal text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </Fieldset>

        <Fieldset legend="Icon">
          <div className="flex flex-wrap gap-2">
            {HABIT_ICON_KEYS.map((key) => {
              return (
                <label key={key} className="cursor-pointer" title={key}>
                  <input
                    type="radio"
                    name="icon"
                    value={key}
                    checked={draft.icon === key}
                    onChange={() => set("icon", key)}
                    disabled={pending}
                    className="peer sr-only"
                  />
                  <span className={`${chipFace} size-11`}>
                    <HabitIcon name={key} className="size-5" />
                    <span className="sr-only">{key}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Fieldset>

        <Fieldset legend="Repeat on" error={errors["schedule.days"]}>
          <div className="flex flex-wrap gap-2">
            {WEEK_ORDER.map((day) => (
              <label key={day} className="cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.days.includes(day)}
                  onChange={() => toggleDay(day)}
                  disabled={pending}
                  className="peer sr-only"
                />
                <span className={`${chipFace} h-11 min-w-12 px-3`}>
                  <span aria-hidden="true">{WEEKDAY_SHORT[day]}</span>
                  <span className="sr-only">{WEEKDAY_LONG[day]}</span>
                </span>
              </label>
            ))}
          </div>
        </Fieldset>

        <div className={`grid gap-4 ${bonus ? "grid-cols-2" : "grid-cols-1"}`}>
          <FormField
            id="habit-xp"
            name="xp"
            label="XP per completion"
            type="number"
            inputMode="numeric"
            min={0}
            max={LIMITS.maxHabitXp}
            value={draft.xp}
            onChange={(e) => set("xp", e.target.value)}
            error={errors.xp}
            disabled={pending}
          />
          {bonus ? (
            <FormField
              id="habit-gems"
              name="gems"
              label="Gems per completion"
              type="number"
              inputMode="numeric"
              min={0}
              max={LIMITS.maxHabitGems}
              value={draft.gems}
              onChange={(e) => set("gems", e.target.value)}
              error={errors.gems}
              disabled={pending}
            />
          ) : null}
        </div>

        <FormField
          id="habit-category"
          name="category"
          label="Category (optional)"
          placeholder="Other"
          maxLength={40}
          autoComplete="off"
          value={draft.category}
          onChange={(e) => set("category", e.target.value)}
          error={errors.category}
          disabled={pending}
        />

        <div className="space-y-1.5">
          <label htmlFor="habit-description" className="text-sm font-medium">
            Description (optional)
          </label>
          <textarea
            id="habit-description"
            name="description"
            rows={2}
            maxLength={300}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={pending}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "habit-description-error" : undefined}
            className="block w-full rounded-md border border-input bg-card px-3 py-2 text-base text-card-foreground placeholder:text-muted-foreground disabled:opacity-60 aria-[invalid=true]:border-destructive"
          />
          {errors.description ? (
            <p id="habit-description-error" className="text-sm text-destructive">
              {errors.description}
            </p>
          ) : null}
        </div>

        <div className="space-y-4 rounded-md border border-border p-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={draft.timed}
              onChange={(e) => set("timed", e.target.checked)}
              disabled={pending}
              className="size-5 accent-primary"
            />
            Track this habit in minutes
          </label>

          {draft.timed ? (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="habit-target"
                label="Minimum minutes"
                type="number"
                inputMode="numeric"
                min={1}
                max={LIMITS.maxMinutesPerDay}
                value={draft.targetMinutes}
                onChange={(e) => set("targetMinutes", e.target.value)}
                error={errors["timed.targetMinutes"]}
                disabled={pending}
              />
              <FormField
                id="habit-unit"
                label="Bonus every (min)"
                type="number"
                inputMode="numeric"
                min={1}
                max={LIMITS.maxMinutesPerDay}
                value={draft.unitMinutes}
                onChange={(e) => set("unitMinutes", e.target.value)}
                error={errors["timed.unitMinutes"]}
                disabled={pending}
              />
              <FormField
                id="habit-extra-xp"
                label="Extra XP per block"
                type="number"
                inputMode="numeric"
                min={0}
                max={LIMITS.maxHabitXp}
                value={draft.extraXp}
                onChange={(e) => set("extraXp", e.target.value)}
                error={errors["timed.extraXpPerUnit"]}
                disabled={pending}
              />
              {bonus ? (
                <FormField
                  id="habit-extra-gems"
                  label="Extra gems per block"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={LIMITS.maxHabitGems}
                  value={draft.extraGems}
                  onChange={(e) => set("extraGems", e.target.value)}
                  error={errors["timed.extraGemsPerUnit"]}
                  disabled={pending}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-md px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="min-h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : habit ? "Save changes" : "Add habit"}
        </button>
      </div>
    </form>
  );
}
