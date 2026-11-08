"use client";

import { AlertTriangle, Check, ChevronDown, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { FormField } from "@/components/auth/form-field";
import { buildItemInput, draftFromItem, isAlwaysAllDay, newDraft, shiftEnd } from "@/components/calendar/calendar-draft";
import type { ItemDraft, ItemFormErrors } from "@/components/calendar/calendar-draft";
import { CATEGORIES, CATEGORY_META, KIND_META, KINDS, KindIcon } from "@/components/calendar/calendar-meta";
import { toApiError } from "@/lib/api/client";
import {
  createCalendarItemRequest,
  deleteCalendarItemRequest,
  updateCalendarItemRequest,
} from "@/lib/api/calendar-client";
import {
  describeRecurrence,
  describeReminder,
  describeTime,
  findConflicts,
  formatShortDate,
  isCompletable,
  occurrencesInRange,
  REMINDER_OPTIONS,
} from "@/lib/domain/calendar";
import { CALENDAR_LIMITS } from "@/lib/domain/defaults";
import { weekdayOf } from "@/lib/domain/dates";
import { WEEK_ORDER, WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/domain/weekdays";
import type { CalendarPriority, OccurrenceMoveResult, PublicCalendarItem, RecurrenceFreq } from "@/types/calendar";
import type { DateKey } from "@/types/common";

interface ItemFormProps {
  item?: PublicCalendarItem; // present = edit mode
  occurrenceDate: DateKey | null; // the day that was opened (matters for a series)
  done: boolean; // is that occurrence checked off
  preset?: Partial<ItemDraft>;
  date: DateKey; // default day for a new item
  items: PublicCalendarItem[]; // what is on the calendar, for the "overlaps with" hint
  onClose: () => void;
  onSaved: (result: OccurrenceMoveResult, isNew: boolean) => void;
  onDeleted: (itemId: string, remaining: PublicCalendarItem | null, title: string) => void;
  onToggleDone: () => void;
}

const REPEAT_LABELS: Record<"none" | RecurrenceFreq, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};
const UNIT: Record<RecurrenceFreq, string> = { daily: "days", weekly: "weeks", monthly: "months", yearly: "years" };
const PRIORITY_LABELS: Record<CalendarPriority, string> = { low: "Low", normal: "Normal", high: "High" };

const chip =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-input bg-field px-3 text-sm font-medium transition hover:border-primary active:scale-[0.97] aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground disabled:opacity-60";

function ErrorText({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="text-sm text-destructive">
      {error}
    </p>
  ) : null;
}

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {children}
    </label>
  );
}

export function ItemForm({
  item,
  occurrenceDate,
  done,
  preset,
  date,
  items,
  onClose,
  onSaved,
  onDeleted,
  onToggleDone,
}: ItemFormProps) {
  const router = useRouter();
  const series = item?.recurrence ? item : null;
  const [draft, setDraft] = useState<ItemDraft>(() => (item ? draftFromItem(item) : newDraft(date, preset)));
  // For a repeating item: change every repeat, or only the day that was opened.
  const [scope, setScope] = useState<"all" | "one">("all");
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // "More options" starts open when the item already uses any of them.
  const [more, setMore] = useState(
    () =>
      !!item &&
      (item.recurrence !== null || item.reminderMinutes !== null || item.priority !== "normal" || item.notes !== ""),
  );

  const kindMeta = KIND_META[draft.kind];
  const allDayOnly = isAlwaysAllDay(draft.kind);
  const timed = !allDayOnly && !draft.allDay;
  const oneDay = series !== null && scope === "one";
  const repeatable = !oneDay;
  const conflicts =
    timed && draft.startTime
      ? findConflicts(occurrencesInRange(items, draft.date, draft.date), draft.date, draft.startTime, draft.endTime || null, item?.id ?? null)
      : [];

  function set<K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function chooseScope(next: "all" | "one") {
    setScope(next);
    if (series) set("date", next === "one" && occurrenceDate ? occurrenceDate : series.date);
  }

  function chooseRepeat(repeat: ItemDraft["repeat"]) {
    setDraft((current) => ({
      ...current,
      repeat,
      days: repeat === "weekly" && current.days.length === 0 ? [weekdayOf(current.date)] : current.days,
    }));
  }

  function toggleDay(day: (typeof WEEK_ORDER)[number]) {
    setDraft((current) => ({
      ...current,
      days: current.days.includes(day) ? current.days.filter((d) => d !== day) : [...current.days, day],
    }));
  }

  function handleError(caught: unknown) {
    const apiError = toApiError(caught);
    if (apiError.code === "UNAUTHENTICATED") {
      router.push("/login");
      return;
    }
    const hasFields = Object.keys(apiError.fields).length > 0;
    setErrors({ ...apiError.fields, ...(hasFields ? {} : { form: apiError.message }) });
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (pending) return;
    const result = buildItemInput(draft, { withRecurrence: repeatable });
    if (!result.ok) {
      setErrors(result.errors);
      if (Object.keys(result.errors).some((key) => key.startsWith("recurrence") || key === "reminderMinutes")) {
        setMore(true);
      }
      return;
    }
    setErrors({});
    setPending(true);
    try {
      if (!item) {
        onSaved({ item: await createCalendarItemRequest(result.input), occurrence: null }, true);
      } else if (oneDay && occurrenceDate) {
        const { recurrence: _ignored, ...changes } = result.input;
        void _ignored;
        onSaved(await updateCalendarItemRequest(item.id, { ...changes, occurrenceDate }), false);
      } else {
        onSaved(await updateCalendarItemRequest(item.id, result.input), false);
      }
    } catch (caught) {
      handleError(caught);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(onlyThisDay: boolean) {
    if (!item || pending) return;
    setPending(true);
    setErrors({});
    try {
      const remaining = await deleteCalendarItemRequest(item.id, onlyThisDay && occurrenceDate ? occurrenceDate : undefined);
      onDeleted(item.id, remaining, item.title);
    } catch (caught) {
      handleError(caught);
      setConfirmDelete(false);
    } finally {
      setPending(false);
    }
  }

  // Ctrl/Cmd + Enter saves from anywhere in the form.
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  const heading = item ? `Edit ${kindMeta.label.toLowerCase()}` : `New ${kindMeta.label.toLowerCase()}`;

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="flex max-h-[90dvh] flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id="modal-title" className="type-h2">
          {heading}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close" className="btn-icon -mr-2">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto px-5 py-5">
        {errors.form || errors.occurrenceDate ? (
          <p role="alert" className="alert alert-error">
            {errors.form ?? errors.occurrenceDate}
          </p>
        ) : null}

        {item && isCompletable(item) && occurrenceDate ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            onClick={onToggleDone}
            disabled={pending}
            className={`cal-tone-${draft.kind} flex min-h-11 w-full items-center gap-3 rounded-md border px-3 text-left text-sm font-medium transition ${
              done ? "border-[var(--tone)] bg-[color-mix(in_oklab,var(--tone)_12%,var(--card))]" : "border-border hover:bg-muted"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex size-5 items-center justify-center rounded-full border-2 border-[var(--tone)] ${
                done ? "bg-[var(--tone)] text-card" : ""
              }`}
            >
              {done ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            {done ? `Done on ${formatShortDate(occurrenceDate)}` : `Mark done for ${formatShortDate(occurrenceDate)}`}
          </button>
        ) : null}

        {series && occurrenceDate ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">This repeats: {describeRecurrence(series.recurrence!, series.date)}</legend>
            <div role="group" aria-label="Apply changes to" className="segmented">
              <button type="button" aria-pressed={scope === "all"} onClick={() => chooseScope("all")} className="segmented-item">
                Every repeat
              </button>
              <button type="button" aria-pressed={scope === "one"} onClick={() => chooseScope("one")} className="segmented-item">
                Only {formatShortDate(occurrenceDate)}
              </button>
            </div>
          </fieldset>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What is it?</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={draft.kind === kind}
                onClick={() => set("kind", kind)}
                disabled={pending}
                title={KIND_META[kind].hint}
                className={`${chip} flex-col gap-0.5! px-1 py-1.5 text-xs`}
              >
                <KindIcon kind={kind} className="size-4" />
                {KIND_META[kind].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{kindMeta.hint}.</p>
        </fieldset>

        <FormField
          id="item-title"
          name="title"
          label="Title"
          placeholder={draft.kind === "workout" ? "e.g. Leg day" : draft.kind === "milestone" ? "e.g. Run a 10K" : "e.g. Dentist"}
          maxLength={CALENDAR_LIMITS.maxTitle}
          autoComplete="off"
          data-autofocus
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          error={errors.title}
          disabled={pending}
        />

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              id="item-date"
              name="date"
              type="date"
              label={draft.repeat !== "none" && repeatable ? "Starts on" : "Date"}
              value={draft.date}
              onChange={(e) => set("date", e.target.value)}
              error={errors.date}
              disabled={pending}
              required
            />
            {!allDayOnly ? (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end">
                <input
                  type="checkbox"
                  checked={draft.allDay}
                  onChange={(e) => set("allDay", e.target.checked)}
                  disabled={pending}
                  className="switch"
                />
                <span className="text-sm font-medium">All day</span>
              </label>
            ) : null}
          </div>

          {timed ? (
            <div className="grid grid-cols-2 gap-3">
              <FormField
                id="item-start"
                name="startTime"
                type="time"
                step={300}
                label="Starts"
                value={draft.startTime}
                onChange={(e) => {
                  const next = e.target.value;
                  setDraft((current) => ({ ...current, startTime: next, endTime: next ? shiftEnd(current, next) : current.endTime }));
                }}
                error={errors.startTime}
                disabled={pending}
              />
              <FormField
                id="item-end"
                name="endTime"
                type="time"
                step={300}
                label={draft.kind === "reminder" || draft.kind === "task" ? "Ends (optional)" : "Ends"}
                value={draft.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                error={errors.endTime}
                disabled={pending}
              />
            </div>
          ) : null}

          {conflicts.length > 0 ? (
            <p className="flex items-start gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm" role="status">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span>
                Overlaps with{" "}
                {conflicts
                  .slice(0, 2)
                  .map((o) => `${o.item.title} (${describeTime(o.item)})`)
                  .join(" and ")}
                {conflicts.length > 2 ? ` and ${conflicts.length - 2} more` : ""}. You can still save it.
              </span>
            </p>
          ) : null}
        </div>

        {draft.kind !== "note" && draft.kind !== "workout" ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Category</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const Icon = CATEGORY_META[category].icon;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={draft.category === category}
                    onClick={() => set("category", category)}
                    disabled={pending}
                    className={chip}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {CATEGORY_META[category].label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <div className="rounded-lg border border-border">
          <button
            type="button"
            aria-expanded={more}
            aria-controls="item-more"
            onClick={() => setMore((open) => !open)}
            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-sm font-medium hover:bg-muted"
          >
            <span>
              More options
              <span className="ml-2 font-normal text-muted-foreground">
                {[
                  repeatable && draft.repeat !== "none" ? REPEAT_LABELS[draft.repeat] : null,
                  draft.reminder !== "none" ? "Reminder" : null,
                  draft.priority !== "normal" ? `${PRIORITY_LABELS[draft.priority]} priority` : null,
                  draft.notes.trim() ? "Notes" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Repeat, reminder, priority, notes"}
              </span>
            </span>
            <ChevronDown className={`size-4 shrink-0 transition-transform ${more ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {more ? (
            <div id="item-more" className="space-y-5 border-t border-border px-3 py-4">
              {repeatable ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="item-repeat">Repeat</Label>
                      <select
                        id="item-repeat"
                        value={draft.repeat}
                        onChange={(e) => chooseRepeat(e.target.value as ItemDraft["repeat"])}
                        disabled={pending}
                        className="field block min-h-11 w-full"
                      >
                        {(Object.keys(REPEAT_LABELS) as ItemDraft["repeat"][]).map((value) => (
                          <option key={value} value={value}>
                            {REPEAT_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                    {draft.repeat !== "none" ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="item-interval">Every</Label>
                        <div className="flex items-center gap-2">
                          <input
                            id="item-interval"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={CALENDAR_LIMITS.maxInterval}
                            value={draft.interval}
                            onChange={(e) => set("interval", e.target.value)}
                            disabled={pending}
                            aria-invalid={errors["recurrence.interval"] ? true : undefined}
                            aria-describedby={errors["recurrence.interval"] ? "item-interval-error" : undefined}
                            className="field block min-h-11 w-20"
                          />
                          <span className="text-sm text-muted-foreground">{UNIT[draft.repeat]}</span>
                        </div>
                        <ErrorText id="item-interval-error" error={errors["recurrence.interval"]} />
                      </div>
                    ) : null}
                  </div>

                  {draft.repeat === "weekly" ? (
                    <fieldset className="space-y-1.5">
                      <legend className="text-sm font-medium">On</legend>
                      <div className="grid grid-cols-7 gap-1.5">
                        {WEEK_ORDER.map((day) => (
                          <button
                            key={day}
                            type="button"
                            aria-pressed={draft.days.includes(day)}
                            aria-label={WEEKDAY_LONG[day]}
                            onClick={() => toggleDay(day)}
                            disabled={pending}
                            className={`${chip} px-0`}
                          >
                            {WEEKDAY_SHORT[day].slice(0, 2)}
                          </button>
                        ))}
                      </div>
                      <ErrorText id="item-days-error" error={errors["recurrence.days"]} />
                    </fieldset>
                  ) : null}

                  {draft.repeat !== "none" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="item-until">
                        Ends on <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <input
                        id="item-until"
                        type="date"
                        value={draft.until}
                        min={draft.date}
                        onChange={(e) => set("until", e.target.value)}
                        disabled={pending}
                        aria-invalid={errors["recurrence.until"] ? true : undefined}
                        aria-describedby={errors["recurrence.until"] ? "item-until-error" : undefined}
                        className="field block min-h-11 w-full"
                      />
                      <ErrorText id="item-until-error" error={errors["recurrence.until"]} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only this day changes. It is saved on its own and leaves the repeating series.
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="item-reminder">Reminder</Label>
                <select
                  id="item-reminder"
                  value={draft.reminder}
                  onChange={(e) => set("reminder", e.target.value)}
                  disabled={pending}
                  aria-describedby="item-reminder-hint"
                  className="field block min-h-11 w-full"
                >
                  <option value="none">{describeReminder(null)}</option>
                  {REMINDER_OPTIONS.map((minutes) => (
                    <option key={minutes} value={String(minutes)}>
                      {timed || minutes === 0 ? describeReminder(minutes) : `${describeReminder(minutes)} 9 AM`}
                    </option>
                  ))}
                </select>
                <p id="item-reminder-hint" className="text-xs text-muted-foreground">
                  Shown in your calendar overview, and as an alert while the Calendar is open.
                  {!timed ? " All-day items remind you from 9 AM." : ""}
                </p>
              </div>

              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Priority</legend>
                <div role="group" aria-label="Priority" className="segmented">
                  {(Object.keys(PRIORITY_LABELS) as CalendarPriority[]).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      aria-pressed={draft.priority === priority}
                      onClick={() => set("priority", priority)}
                      disabled={pending}
                      className="segmented-item"
                    >
                      {PRIORITY_LABELS[priority]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <Label htmlFor="item-notes">Notes</Label>
                <textarea
                  id="item-notes"
                  rows={3}
                  maxLength={CALENDAR_LIMITS.maxNotes}
                  value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  disabled={pending}
                  aria-invalid={errors.notes ? true : undefined}
                  aria-describedby={errors.notes ? "item-notes-error" : undefined}
                  className="field block w-full resize-y py-2"
                />
                <ErrorText id="item-notes-error" error={errors.notes} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {confirmDelete && item ? (
        <div role="alertdialog" aria-labelledby="delete-question" className="space-y-3 border-t border-border px-5 py-3">
          <p id="delete-question" className="text-sm font-medium">
            {series ? `Delete “${item.title}”?` : `Delete “${item.title}”? This can't be undone.`}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" data-autofocus onClick={() => setConfirmDelete(false)} className="btn btn-quiet px-4">
              Keep it
            </button>
            {series && occurrenceDate ? (
              <button type="button" onClick={() => handleDelete(true)} disabled={pending} className="btn btn-outline px-4">
                Only {formatShortDate(occurrenceDate)}
              </button>
            ) : null}
            <button type="button" onClick={() => handleDelete(false)} disabled={pending} aria-busy={pending} className="btn btn-danger px-4">
              {series ? "Every repeat" : "Delete"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          {item ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              className="btn btn-quiet gap-2 px-3 text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-quiet px-4">
              Cancel
            </button>
            <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary px-5">
              {pending ? "Saving…" : item ? "Save" : `Add ${kindMeta.label.toLowerCase()}`}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
