"use client";

import { Check, ClipboardList, Dumbbell, LayoutTemplate, ListChecks, ListTodo, Plus, Timer, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatDuration, formatLongDate } from "@/lib/domain/calendar";
import type { WeekReview } from "@/lib/domain/calendar";
import { CALENDAR_LIMITS } from "@/lib/domain/defaults";
import { weekdayOf } from "@/lib/domain/dates";
import { WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/domain/weekdays";
import type { PublicPlanTemplate, WeekPriority } from "@/types/calendar";
import type { DateKey } from "@/types/common";

// Ids for new priorities. Not security-relevant: they only key the list.
function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const ratio = ({ done, total }: { done: number; total: number }) => (total === 0 ? "–" : `${done}/${total}`);

export function WeekPlanPanel({
  weekLabel,
  today,
  priorities,
  review,
  templates,
  busy,
  onSavePriorities,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
}: {
  weekLabel: string;
  today: DateKey;
  priorities: WeekPriority[];
  review: WeekReview;
  templates: PublicPlanTemplate[];
  busy: boolean;
  onSavePriorities: (next: WeekPriority[]) => void;
  onApplyTemplate: (template: PublicPlanTemplate) => void;
  onSaveTemplate: () => void;
  onDeleteTemplate: (template: PublicPlanTemplate) => void;
}) {
  const [text, setText] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const full = priorities.length >= CALENDAR_LIMITS.maxPriorities;
  const maxMinutes = Math.max(60, ...review.perDay.map((d) => d.minutes));

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim().slice(0, CALENDAR_LIMITS.maxPriorityText);
    if (!value || full) return;
    onSavePriorities([...priorities, { id: newId(), text: value, done: false }]);
    setText("");
  }

  return (
    <section aria-labelledby="plan-title" className="panel space-y-5 p-4">
      <div>
        <h2 id="plan-title" className="type-h3 flex items-center gap-2">
          <ClipboardList className="size-4 text-primary" aria-hidden="true" />
          Week plan
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{weekLabel}</p>
      </div>

      <div>
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Priorities · {priorities.filter((p) => p.done).length}/{priorities.length || 0}
        </h3>
        {priorities.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {priorities.map((priority) => (
              <li key={priority.id} className="flex items-center gap-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={priority.done}
                  aria-label={`${priority.done ? "Mark not done" : "Mark done"}: ${priority.text}`}
                  onClick={() =>
                    onSavePriorities(priorities.map((p) => (p.id === priority.id ? { ...p, done: !p.done } : p)))
                  }
                  disabled={busy}
                  className="btn-icon shrink-0"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-5 items-center justify-center rounded-md border-2 border-primary ${
                      priority.done ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    {priority.done ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                </button>
                <span className={`min-w-0 flex-1 text-sm break-words ${priority.done ? "text-muted-foreground line-through" : ""}`}>
                  {priority.text}
                </span>
                <button
                  type="button"
                  onClick={() => onSavePriorities(priorities.filter((p) => p.id !== priority.id))}
                  disabled={busy}
                  aria-label={`Remove priority: ${priority.text}`}
                  className="btn-icon btn-icon-danger shrink-0"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">What matters most this week? Add up to {CALENDAR_LIMITS.maxPriorities}.</p>
        )}
        {!full ? (
          <form onSubmit={add} className="mt-2 flex gap-2">
            <label htmlFor="priority-text" className="sr-only">
              New priority
            </label>
            <input
              id="priority-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={CALENDAR_LIMITS.maxPriorityText}
              placeholder="e.g. Finish the report"
              autoComplete="off"
              className="field block min-h-11 min-w-0 flex-1"
            />
            <button type="submit" disabled={busy || !text.trim()} className="btn btn-secondary shrink-0 px-3" aria-label="Add priority">
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </form>
        ) : null}
      </div>

      <div>
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Week at a glance</h3>
        <StatStrip
          label="This week in numbers"
          columns={2}
          columnsSmall={2}
          className="mt-2"
          items={[
            { icon: <Timer />, label: "Planned time", value: formatDuration(review.plannedMinutes) },
            {
              icon: <Dumbbell />,
              label: "Workouts",
              value: ratio(review.workouts),
              hint: review.workouts.minutes ? formatDuration(review.workouts.minutes) : undefined,
            },
            { icon: <ListTodo />, label: "Tasks done", value: ratio(review.tasks) },
            { icon: <ListChecks />, label: "Habits so far", value: ratio(review.habits) },
          ]}
        />
        <ul className="mt-3 grid grid-cols-7 items-end gap-1.5" aria-label="Planned time per day">
          {review.perDay.map((day) => {
            const weekday = weekdayOf(day.date);
            const busiest = review.busiest === day.date && day.items > 0;
            return (
              <li key={day.date} className="flex flex-col items-center gap-1">
                <span className="sr-only">
                  {WEEKDAY_LONG[weekday]}: {formatDuration(day.minutes)} planned, {day.items} item{day.items === 1 ? "" : "s"}
                  {busiest ? ", the busiest day" : ""}
                </span>
                <span aria-hidden="true" className="flex h-14 w-full items-end overflow-hidden rounded-sm bg-muted/60">
                  <span
                    className={`block w-full rounded-sm transition-[height] ${busiest ? "bg-primary" : "bg-[color-mix(in_oklab,var(--primary)_45%,var(--card))]"}`}
                    style={{ height: `${day.minutes > 0 ? Math.max(8, (day.minutes / maxMinutes) * 100) : day.items > 0 ? 8 : 0}%` }}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className={`text-[0.6875rem] ${day.date === today ? "font-bold text-foreground" : "text-muted-foreground"}`}
                >
                  {WEEKDAY_SHORT[weekday].slice(0, 2)}
                </span>
              </li>
            );
          })}
        </ul>
        {review.busiest && review.perDay.some((d) => d.items > 0) ? (
          <p className="mt-2 text-xs text-muted-foreground">Busiest: {formatLongDate(review.busiest)}</p>
        ) : null}
      </div>

      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <LayoutTemplate className="size-3.5" aria-hidden="true" />
          Week templates
        </h3>
        {templates.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {templates.map((template) => (
              <li key={template.id} className="flex items-center gap-1 rounded-md border border-border py-1 pl-3 pr-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{template.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {template.entries.length} item{template.entries.length === 1 ? "" : "s"}
                  </span>
                </span>
                {confirmId === template.id ? (
                  <>
                    <button type="button" onClick={() => setConfirmId(null)} className="btn btn-quiet min-h-11 px-2 text-xs">
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmId(null);
                        onDeleteTemplate(template);
                      }}
                      disabled={busy}
                      className="btn btn-danger min-h-11 px-2 text-xs"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onApplyTemplate(template)}
                      disabled={busy}
                      className="btn btn-secondary min-h-11 px-3 text-xs"
                      aria-label={`Apply ${template.name} to this week`}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(template.id)}
                      disabled={busy}
                      aria-label={`Delete template ${template.name}`}
                      className="btn-icon btn-icon-danger"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Plan a week you like, then save it here and reuse it with one tap.
          </p>
        )}
        {templates.length < CALENDAR_LIMITS.maxTemplates ? (
          <button type="button" onClick={onSaveTemplate} disabled={busy} className="btn btn-outline mt-2 w-full gap-2 text-sm">
            <Plus className="size-4" aria-hidden="true" />
            Save this week as a template
          </button>
        ) : null}
      </div>
    </section>
  );
}
