"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { FormField } from "@/components/auth/form-field";
import { SliderField } from "@/components/ui/slider";
import { HABIT_ICON_KEYS, HABIT_ICON_LABELS, HabitIcon } from "@/components/habits/habit-icons";
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
  "inline-flex items-center justify-center rounded-md border border-input bg-field text-sm font-medium transition hover:border-primary active:scale-95 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-60";

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
        <h2 id="modal-title" className="type-h2">
          {habit ? "Edit habit" : "New habit"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="btn-icon -mr-2"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto px-5 py-5">
        {errors.form ? (
          <p role="alert" className="alert alert-error">
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
            {HABIT_ICON_KEYS.map((key) => {
              return (
                <label key={key} className="cursor-pointer" title={HABIT_ICON_LABELS[key]}>
                  <input
                    type="radio"
                    name="icon"
                    value={key}
                    checked={draft.icon === key}
                    onChange={() => set("icon", key)}
                    disabled={pending}
                    className="peer sr-only"
                  />
                  <span className={`${chipFace} h-11 w-full`}>
                    <HabitIcon name={key} className="size-5" />
                    <span className="sr-only">{HABIT_ICON_LABELS[key]}</span>
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

        <div className={`grid gap-4 ${bonus ? "sm:grid-cols-2" : ""}`}>
          <SliderField
            id="habit-xp"
            label="XP per completion"
            unit="XP"
            min={0}
            max={LIMITS.maxHabitXp}
            value={Number(draft.xp) || 0}
            onChange={(value) => set("xp", String(value))}
            error={errors.xp}
            disabled={pending}
          />
          {bonus ? (
            <SliderField
              id="habit-gems"
              label="Gems per completion"
              unit="gems"
              min={0}
              max={LIMITS.maxHabitGems}
              value={Number(draft.gems) || 0}
              onChange={(value) => set("gems", String(value))}
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
            className="field block w-full py-2"
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
              className="switch"
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
              <div className="col-span-2">
                <SliderField
                  id="habit-extra-xp"
                  label="Extra XP per block"
                  unit="XP"
                  min={0}
                  max={LIMITS.maxHabitXp}
                  value={Number(draft.extraXp) || 0}
                  onChange={(value) => set("extraXp", String(value))}
                  error={errors["timed.extraXpPerUnit"]}
                  disabled={pending}
                />
              </div>
              {bonus ? (
                <div className="col-span-2">
                  <SliderField
                    id="habit-extra-gems"
                    label="Extra gems per block"
                    unit="gems"
                    min={0}
                    max={LIMITS.maxHabitGems}
                    value={Number(draft.extraGems) || 0}
                    onChange={(value) => set("extraGems", String(value))}
                    error={errors["timed.extraGemsPerUnit"]}
                    disabled={pending}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-quiet px-4"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="btn btn-primary px-5"
        >
          {pending ? "Saving…" : habit ? "Save changes" : "Add habit"}
        </button>
      </div>
    </form>
  );
}
