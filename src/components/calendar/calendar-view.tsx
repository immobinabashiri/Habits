"use client";

import { AlarmClock, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, List, PartyPopper, Plus, Rows3, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { AgendaView } from "@/components/calendar/agenda-view";
import type { ItemDraft } from "@/components/calendar/calendar-draft";
import { KIND_META, KindIcon, kindOf, TONE_META, TONES } from "@/components/calendar/calendar-meta";
import type { CalendarKind, CalendarTone } from "@/components/calendar/calendar-meta";
import { DayPanel } from "@/components/calendar/day-panel";
import { ItemForm } from "@/components/calendar/item-form";
import { MonthView } from "@/components/calendar/month-view";
import type { HabitSummary } from "@/components/calendar/month-view";
import { OverviewPanel } from "@/components/calendar/overview-panel";
import { TemplateDialog } from "@/components/calendar/template-dialog";
import { TimeGrid } from "@/components/calendar/time-grid";
import { useCalendarDrag } from "@/components/calendar/use-calendar-drag";
import type { DropTarget } from "@/components/calendar/use-calendar-drag";
import { WeekPlanPanel } from "@/components/calendar/week-plan-panel";
import { Modal } from "@/components/ui/modal";
import { toApiError } from "@/lib/api/client";
import {
  applyTemplateRequest,
  deleteTemplateRequest,
  saveWeekPlanRequest,
  setItemCompletionRequest,
  updateCalendarItemRequest,
} from "@/lib/api/calendar-client";
import {
  AGENDA_DAYS,
  blockRange,
  describeTime,
  formatLongDate,
  formatRangeTitle,
  formatShortDate,
  formatTime,
  groupByDate,
  isOverdue,
  LOOKAHEAD_DAYS,
  minutesToTime,
  monthGridDays,
  nowIn,
  occurrencesInRange,
  reminderAt,
  reviewWeek,
  shiftAnchor,
  viewTitle,
  weekDays,
  weekStartOf,
} from "@/lib/domain/calendar";
import type { Occurrence } from "@/lib/domain/calendar";
import { CALENDAR_LIMITS } from "@/lib/domain/defaults";
import { addDays, weekdayOf } from "@/lib/domain/dates";
import { WEEKDAY_SHORT } from "@/lib/domain/weekdays";
import type { UpdateCalendarItemInput } from "@/lib/validation/calendar";
import type {
  CalendarData,
  CalendarHabitDay,
  CalendarView as View,
  OccurrenceMoveResult,
  PublicCalendarItem,
  PublicPlanTemplate,
  WeekPriority,
} from "@/types/calendar";
import type { DateKey } from "@/types/common";

// Only ids and days are stored: the dialog always reads the latest item from the list.
type DialogState =
  | { type: "item"; itemId: string | null; date: DateKey; occurrenceDate: DateKey | null; preset?: Partial<ItemDraft> }
  | { type: "template" }
  | null;

const VIEWS: { value: View; label: string; icon: typeof CalendarDays }[] = [
  { value: "month", label: "Month", icon: CalendarDays },
  { value: "week", label: "Week", icon: CalendarRange },
  { value: "day", label: "Day", icon: Rows3 },
  { value: "agenda", label: "Agenda", icon: List },
];

// First-run shortcuts: each opens the form ready for that kind of plan.
const STARTERS: { kind: CalendarKind; label: string; preset: Partial<ItemDraft> }[] = [
  { kind: "workout", label: "Schedule a workout", preset: { kind: "workout", title: "Workout", startTime: "07:00", endTime: "08:00" } },
  { kind: "task", label: "Add a task", preset: { kind: "task", allDay: true } },
  { kind: "reminder", label: "Set a reminder", preset: { kind: "reminder", endTime: "", reminder: "0" } },
  { kind: "milestone", label: "Mark an important date", preset: { kind: "milestone", allDay: true } },
];

// The minute clock: re-renders the "now" line and reminders once a minute. The server
// (and the first paint) has no clock, so nothing time-dependent mismatches on hydration.
function subscribeMinute(onChange: () => void) {
  const id = window.setInterval(onChange, 15_000);
  window.addEventListener("focus", onChange);
  return () => {
    window.clearInterval(id);
    window.removeEventListener("focus", onChange);
  };
}
const currentMinute = () => Math.floor(Date.now() / 60_000);
const noClock = () => null;

const occurrenceKey = (o: { item: { id: string }; date: DateKey }) => `${o.item.id}-${o.date}`;

function firstSelected(data: CalendarData): DateKey {
  if (data.view === "month") {
    const month = data.anchor.slice(0, 7);
    return data.today.startsWith(month) ? data.today : data.anchor;
  }
  if (data.view === "week") return data.today >= data.from && data.today <= data.to ? data.today : data.from;
  return data.anchor;
}

function summarize(habitDays: CalendarHabitDay[]): Map<DateKey, HabitSummary> {
  const map = new Map<DateKey, HabitSummary>();
  for (const day of habitDays) {
    if (day.status === "exempt") continue;
    const entry = map.get(day.date) ?? { done: 0, total: 0 };
    entry.total += 1;
    if (day.status === "done") entry.done += 1;
    map.set(day.date, entry);
  }
  return map;
}

export function CalendarView({ data }: { data: CalendarData }) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();

  // The server's data, kept in state so every change shows at once. When the page
  // renders again with new data (another month, another view), the state follows it.
  const [source, setSource] = useState(data);
  const [items, setItems] = useState(data.items);
  const [plan, setPlan] = useState(data.weekPlan);
  const [templates, setTemplates] = useState(data.templates);
  const [selected, setSelected] = useState(() => firstSelected(data));
  if (source !== data) {
    setSource(data);
    setItems(data.items);
    setPlan(data.weekPlan);
    setTemplates(data.templates);
    setSelected(firstSelected(data));
  }

  const [hidden, setHidden] = useState<Set<CalendarTone>>(() => new Set());
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => new Set());

  const minute = useSyncExternalStore(subscribeMinute, currentMinute, noClock);
  const now = minute === null ? null : nowIn(data.timezone, new Date(minute * 60_000));

  const { view, from, to, today } = data;

  // ---- What is on screen ----
  const shown = items.filter((item) => !hidden.has(kindOf(item)));
  const occurrences = occurrencesInRange(shown, from, to);
  const byDate = groupByDate(occurrences);
  const habitsById = new Map(data.habits.map((habit) => [habit.id, habit]));
  const habitDays = hidden.has("habit") ? [] : data.habitDays.filter((d) => d.date >= from && d.date <= to);
  const habitsByDate = summarize(habitDays);
  const upcoming = occurrencesInRange(items, today, addDays(today, LOOKAHEAD_DAYS));
  const overdue = items
    .filter((item) => isOverdue(item, today))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, CALENDAR_LIMITS.maxOverdue);
  const habitDaysOn = (date: DateKey) => data.habitDays.filter((d) => d.date === date);
  const weekStart = plan.weekStart;
  const weekLabel = formatRangeTitle(weekStart, addDays(weekStart, 6));

  // Reminders that are going off right now, while the page is open.
  const alerts = now
    ? upcoming
        .map((o) => ({ o, at: reminderAt(o.item, o.date) }))
        .filter(({ o, at }) => at && !o.done && at.date === now.date && at.minutes <= now.minutes && at.minutes > now.minutes - 5)
        .map(({ o }) => o)
        .filter((o) => !dismissedAlerts.has(occurrenceKey(o)))
    : [];

  // ---- Navigation (URL state: ?view=&date=) ----
  function go(nextView: View, date: DateKey) {
    const params = new URLSearchParams({ view: nextView, date });
    startNavigation(() => router.push(`/dashboard/calendar?${params.toString()}`, { scroll: false }));
  }
  const openDay = (date: DateKey) => go("day", date);

  // ---- Errors and messages ----
  function fail(caught: unknown, message?: string) {
    const apiError = toApiError(caught);
    if (apiError.code === "UNAUTHENTICATED") {
      router.push("/login");
      return;
    }
    setNotice(null);
    setError(message ?? apiError.message);
  }
  function tell(message: string) {
    setError(null);
    setNotice(message);
  }

  function upsert(...list: PublicCalendarItem[]) {
    setItems((current) => {
      const map = new Map(current.map((item) => [item.id, item]));
      for (const item of list) map.set(item.id, item);
      return [...map.values()];
    });
  }
  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }
  function applyResult(result: OccurrenceMoveResult) {
    upsert(result.item, ...(result.occurrence ? [result.occurrence] : []));
  }

  // ---- Changes ----
  async function toggleDone(occurrence: Occurrence) {
    const { item, date } = occurrence;
    const key = occurrenceKey(occurrence);
    if (busyKey) return;
    const done = !item.completedDates.includes(date);
    setBusyKey(key);
    upsert({
      ...item,
      completedDates: done ? [...item.completedDates, date] : item.completedDates.filter((d) => d !== date),
    });
    try {
      upsert(await setItemCompletionRequest(item.id, date, done));
    } catch (caught) {
      upsert(item);
      fail(caught);
    } finally {
      setBusyKey(null);
    }
  }

  // Drag-and-drop and "To today". A repeating item moves only that one day.
  async function moveOccurrence(occurrence: Occurrence, target: DropTarget) {
    const { item } = occurrence;
    if (busyKey) return;
    let changes: UpdateCalendarItemInput = { date: target.date };
    if (target.minutes !== null && item.type !== "note" && item.type !== "milestone") {
      const length = item.allDay || !item.startTime ? 60 : item.endTime ? blockRange(item).end - blockRange(item).start : null;
      const start = length ? Math.min(target.minutes, 1440 - length) : target.minutes;
      changes = {
        date: target.date,
        allDay: false,
        startTime: minutesToTime(start),
        endTime: length ? minutesToTime(Math.min(start + length, 1439)) : null,
      };
    }
    const sameDay = target.date === occurrence.date;
    const sameTime = changes.startTime === undefined || changes.startTime === item.startTime;
    if (sameDay && sameTime && (changes.allDay === undefined || changes.allDay === item.allDay)) return;

    const before = items;
    const key = occurrenceKey(occurrence);
    setBusyKey(key);
    const series = item.recurrence !== null;
    // Show the result straight away; the server's answer replaces it.
    if (series) {
      upsert(
        { ...item, skippedDates: [...item.skippedDates, occurrence.date] },
        { ...item, ...changes, id: `temp-${key}`, recurrence: null, skippedDates: [], completedDates: [] } as PublicCalendarItem,
      );
    } else {
      upsert({ ...item, ...changes } as PublicCalendarItem);
    }
    try {
      const result = await updateCalendarItemRequest(item.id, series ? { ...changes, occurrenceDate: occurrence.date } : changes);
      removeItem(`temp-${key}`);
      applyResult(result);
      const moved = result.occurrence ?? result.item;
      tell(
        `Moved “${item.title}” to ${formatLongDate(moved.date)}${moved.allDay ? "" : `, ${describeTime(moved)}`}${
          series ? ". Only this day changed; the rest of the series stays." : "."
        }`,
      );
    } catch (caught) {
      setItems(before);
      fail(caught, `“${item.title}” could not be moved. ${toApiError(caught).message}`);
    } finally {
      setBusyKey(null);
    }
  }

  const { dragProps, dragging, target } = useCalendarDrag({
    disabled: busyKey !== null,
    canDrag: (occurrence) => !occurrence.item.id.startsWith("temp-"),
    onDrop: moveOccurrence,
  });
  const draggedItem = dragging ? items.find((item) => item.id === dragging.id) : undefined;
  const dragMinutes =
    draggedItem && !draggedItem.allDay && draggedItem.startTime
      ? blockRange(draggedItem).end - blockRange(draggedItem).start
      : 60;

  async function savePriorities(next: WeekPriority[]) {
    const previous = plan;
    setPlan({ ...plan, priorities: next });
    setBusyKey("plan");
    try {
      setPlan(await saveWeekPlanRequest(previous.weekStart, next));
    } catch (caught) {
      setPlan(previous);
      fail(caught);
    } finally {
      setBusyKey(null);
    }
  }

  async function applyTemplate(template: PublicPlanTemplate) {
    setBusyKey("template");
    try {
      const result = await applyTemplateRequest(template.id, weekStart);
      upsert(...result.created);
      const added = result.created.length;
      tell(
        added === 0
          ? `Everything from “${template.name}” is already on this week.`
          : `Added ${added} item${added === 1 ? "" : "s"} from “${template.name}”${
              result.skipped ? ` (${result.skipped} already there)` : ""
            }.`,
      );
    } catch (caught) {
      fail(caught);
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteTemplate(template: PublicPlanTemplate) {
    setBusyKey("template");
    try {
      await deleteTemplateRequest(template.id);
      setTemplates((current) => current.filter((t) => t.id !== template.id));
      tell(`Deleted the template “${template.name}”. Items already planned with it stay.`);
    } catch (caught) {
      fail(caught);
    } finally {
      setBusyKey(null);
    }
  }

  // ---- Dialogs ----
  function openItem(occurrence: Occurrence) {
    if (occurrence.item.id.startsWith("temp-")) return;
    setDialog({ type: "item", itemId: occurrence.item.id, date: occurrence.date, occurrenceDate: occurrence.date });
  }
  function create(date: DateKey, minutes: number | null = null, preset: Partial<ItemDraft> = {}) {
    const timing: Partial<ItemDraft> =
      minutes === null
        ? {}
        : { allDay: false, startTime: minutesToTime(minutes), endTime: minutesToTime(Math.min(minutes + 60, 1439)) };
    setDialog({ type: "item", itemId: null, date, occurrenceDate: null, preset: { ...timing, ...preset } });
  }
  const dialogItem = dialog?.type === "item" && dialog.itemId ? items.find((item) => item.id === dialog.itemId) : undefined;
  const closeDialog = () => setDialog(null);

  function handleSaved(result: OccurrenceMoveResult, isNew: boolean) {
    applyResult(result);
    setDialog(null);
    const saved = result.occurrence ?? result.item;
    const outside = saved.date < from || saved.date > to;
    tell(
      `${isNew ? "Added" : "Saved"} “${saved.title}” on ${formatLongDate(saved.date)}${
        outside && !saved.recurrence ? ". It is outside the dates on screen." : "."
      }`,
    );
    if (!outside) setSelected(saved.date);
  }

  function handleDeleted(itemId: string, remaining: PublicCalendarItem | null, title: string) {
    if (remaining) upsert(remaining);
    else removeItem(itemId);
    setDialog(null);
    tell(remaining ? `Removed one day of “${title}”.` : `Deleted “${title}”.`);
  }

  function toggleTone(tone: CalendarTone) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(tone)) next.delete(tone);
      else next.add(tone);
      return next;
    });
  }

  // ---- Layout ----
  const firstRun = items.length === 0 && templates.length === 0;
  const selectedOccurrences = byDate.get(selected) ?? [];
  const selectedHabitDays = hidden.has("habit") ? [] : habitDaysOn(selected);
  const title = viewTitle(view, data.anchor);
  const emptyRange = occurrences.length === 0;

  const viewBody =
    view === "month" ? (
      <MonthView
        anchor={data.anchor}
        days={monthGridDays(data.anchor)}
        today={today}
        selected={selected}
        byDate={byDate}
        habitsByDate={habitsByDate}
        dropTarget={target}
        dragProps={dragProps}
        onSelect={setSelected}
        onOpen={openItem}
        onCreate={(date) => create(date)}
      />
    ) : view === "agenda" ? (
      <AgendaView
        from={from}
        today={today}
        occurrences={occurrences}
        habitsByDate={habitsByDate}
        busyKey={busyKey}
        onOpen={openItem}
        onToggleDone={toggleDone}
        onCreate={(date) => create(date)}
        onOpenDay={openDay}
      />
    ) : (
      <div className="space-y-3">
        {view === "week" ? (
          // Phones show one day of the week at a time.
          <div role="group" aria-label="Day of the week" className="grid grid-cols-7 gap-1 md:hidden">
            {weekDays(from).map((date) => {
              const count = (byDate.get(date) ?? []).length;
              return (
                <button
                  key={date}
                  type="button"
                  aria-pressed={date === selected}
                  onClick={() => setSelected(date)}
                  aria-label={`${formatLongDate(date)}, ${count} item${count === 1 ? "" : "s"}`}
                  className="flex min-h-14 flex-col items-center justify-center rounded-md border border-border text-xs aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  <span className="font-medium">{WEEKDAY_SHORT[weekdayOf(date)].slice(0, 2)}</span>
                  <span className={`text-sm font-semibold tabular-nums ${date === today ? "underline underline-offset-2" : ""}`}>
                    {Number(date.slice(8))}
                  </span>
                  <span aria-hidden="true" className={`mt-0.5 size-1 rounded-full ${count ? "bg-current" : ""}`} />
                </button>
              );
            })}
          </div>
        ) : null}
        <TimeGrid
          days={view === "week" ? weekDays(from) : [from]}
          today={today}
          now={now}
          selected={selected}
          byDate={byDate}
          habitsByDate={habitsByDate}
          dropTarget={target}
          dragMinutes={dragMinutes}
          dragProps={dragProps}
          onOpen={openItem}
          onOpenDay={openDay}
          onCreateAt={(date, minutes) => create(date, minutes, minutes === null ? { allDay: true } : {})}
        />
        <p className="text-xs text-muted-foreground">
          Click an empty time to add something there. Drag an item to move it
          <span className="md:hidden"> (press and hold on a phone)</span>.
        </p>
      </div>
    );

  return (
    <div className="page page-wide">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="type-h1">Calendar</h1>
          <p className="mt-1 text-muted-foreground">Plan your days around your habits, workouts and goals.</p>
        </div>
        <button type="button" onClick={() => create(selected >= today || view === "month" ? selected : today)} className="btn btn-primary gap-2 px-4">
          <Plus className="size-5" aria-hidden="true" />
          New
        </button>
      </div>

      {error ? (
        <div role="alert" className="mt-6 flex items-start justify-between gap-3 alert alert-error">
          <p className="py-1.5">{error}</p>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="btn-icon btn-icon-danger -my-1 -mr-2 shrink-0">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="mt-6 flex items-start justify-between gap-3 alert alert-success">
          <p className="flex items-center gap-2 py-1.5">
            <PartyPopper className="size-4 shrink-0" aria-hidden="true" />
            {notice}
          </p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="btn-icon -my-1 -mr-2 shrink-0">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {firstRun ? (
        <section aria-labelledby="starter-title" className="mt-6 glass p-5">
          <h2 id="starter-title" className="type-h2">
            Your plan starts here
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Your habits already appear on the days they are scheduled. Add workouts, tasks, reminders and important dates
            around them, and plan whole weeks you can reuse.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STARTERS.map((starter) => (
              <li key={starter.kind}>
                <button
                  type="button"
                  onClick={() => create(today, null, starter.preset)}
                  className={`cal-tone-${starter.kind} flex min-h-12 w-full items-center gap-2.5 rounded-md border border-border bg-card/60 px-3 text-left text-sm font-medium hover:bg-muted`}
                >
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--tone)_16%,var(--card))] text-[var(--tone)]">
                    <KindIcon kind={starter.kind} className="size-4" />
                  </span>
                  {starter.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => go(view, shiftAnchor(view, data.anchor, -1))}
                className="btn-icon"
                aria-label={`Previous ${view === "agenda" ? `${AGENDA_DAYS} days` : view}`}
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(view, today)}
                className="btn btn-outline min-h-11 px-3 text-sm"
                disabled={today >= from && today <= to && (view !== "month" || data.anchor.slice(0, 7) === today.slice(0, 7))}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => go(view, shiftAnchor(view, data.anchor, 1))}
                className="btn-icon"
                aria-label={`Next ${view === "agenda" ? `${AGENDA_DAYS} days` : view}`}
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
            <h2 className="type-h2 min-w-0 truncate" aria-live="polite">
              {title}
            </h2>
          </div>
          <div role="group" aria-label="Calendar view" className="segmented max-sm:w-full">
            {VIEWS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => go(value, view === "month" || value === "day" ? selected : data.anchor)}
                className="segmented-item px-3"
              >
                <Icon className="size-4 max-[22rem]:hidden" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-label="Show on the calendar" className="flex flex-wrap gap-1.5">
          {TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              aria-pressed={!hidden.has(tone)}
              onClick={() => toggleTone(tone)}
              className={`cal-filter cal-tone-${tone} shrink-0`}
            >
              <KindIcon kind={tone} className="size-3.5" />
              {TONE_META[tone].label}
            </button>
          ))}
        </div>
        {emptyRange && !firstRun && view !== "agenda" ? (
          <p className="text-sm text-muted-foreground">
            Nothing planned for this {view}
            {hidden.size > 0 ? " (some types are hidden)" : ""}.{" "}
            {view === "month" ? "Double-click a day, or use New." : "Click an empty time to add something."}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-6 min-[100rem]:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-label={title} aria-busy={navigating}>
          <div key={`${view}-${from}`} className="cal-enter">
            {viewBody}
          </div>
        </section>

        <aside
          aria-label="Plan and overview"
          className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 md:grid-cols-2 min-[100rem]:grid-cols-[minmax(0,1fr)] min-[100rem]:content-start"
        >
          {view === "month" ? (
            <DayPanel
              date={selected}
              today={today}
              occurrences={selectedOccurrences}
              habitDays={selectedHabitDays}
              habits={habitsById}
              busyKey={busyKey}
              onOpen={openItem}
              onToggleDone={toggleDone}
              onCreate={(date) => create(date)}
              onOpenDay={openDay}
            />
          ) : null}
          {view === "day" ? (
            <DayPanel
              date={from}
              today={today}
              occurrences={[]}
              habitDays={hidden.has("habit") ? [] : habitDaysOn(from)}
              habits={habitsById}
              busyKey={busyKey}
              showItems={false}
              onOpen={openItem}
              onToggleDone={toggleDone}
              onCreate={(date) => create(date)}
            />
          ) : null}
          {view === "week" ? (
            <WeekPlanPanel
              weekLabel={weekLabel}
              today={today}
              priorities={plan.priorities}
              review={reviewWeek(occurrencesInRange(items, weekStart, addDays(weekStart, 6)), data.habitDays, weekDays(weekStart), today)}
              templates={templates}
              busy={busyKey !== null}
              onSavePriorities={savePriorities}
              onApplyTemplate={applyTemplate}
              onSaveTemplate={() => setDialog({ type: "template" })}
              onDeleteTemplate={deleteTemplate}
            />
          ) : null}
          <div className="space-y-6">
            <OverviewPanel
              today={today}
              now={now}
              upcoming={upcoming}
              overdue={overdue}
              habitDaysToday={habitDaysOn(today)}
              busyKey={busyKey}
              onOpen={openItem}
              onToggleDone={toggleDone}
              onMoveToToday={(item) => moveOccurrence({ item, date: item.date, done: false }, { date: today, minutes: null })}
            />
            {view !== "week" ? (
              <button
                type="button"
                onClick={() => go("week", view === "month" ? selected : data.anchor)}
                className="btn btn-outline w-full gap-2"
              >
                <CalendarRange className="size-4" aria-hidden="true" />
                Plan the week of {formatShortDate(weekStartOf(view === "month" ? selected : data.anchor))}
              </button>
            ) : null}
          </div>
        </aside>
      </div>

      <Modal open={dialog !== null} onClose={closeDialog} size={dialog?.type === "template" ? "sm" : "md"}>
        {dialog?.type === "item" && (dialog.itemId === null || dialogItem) ? (
          <ItemForm
            key={dialog.itemId ?? "new"}
            item={dialogItem}
            occurrenceDate={dialog.occurrenceDate}
            done={!!dialogItem && !!dialog.occurrenceDate && dialogItem.completedDates.includes(dialog.occurrenceDate)}
            preset={dialog.preset}
            date={dialog.date}
            items={items}
            onClose={closeDialog}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onToggleDone={() => {
              if (dialogItem && dialog.occurrenceDate) {
                void toggleDone({ item: dialogItem, date: dialog.occurrenceDate, done: dialogItem.completedDates.includes(dialog.occurrenceDate) });
              }
            }}
          />
        ) : null}
        {dialog?.type === "template" ? (
          <TemplateDialog
            weekStart={weekStart}
            weekLabel={weekLabel}
            onClose={closeDialog}
            onSaved={(template) => {
              setTemplates((current) => [...current, template]);
              setDialog(null);
              tell(`Saved “${template.name}” with ${template.entries.length} item${template.entries.length === 1 ? "" : "s"}. Apply it to any week.`);
            }}
          />
        ) : null}
      </Modal>

      {/* Reminders that go off while the Calendar is open. */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end">
        {alerts.map((occurrence) => (
          <div
            key={occurrenceKey(occurrence)}
            role="status"
            className={`cal-tone-${kindOf(occurrence.item)} toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 glass p-3`}
          >
            <AlarmClock className="mt-0.5 size-5 shrink-0 text-[var(--tone)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Reminder: {occurrence.item.title}</p>
              <p className="text-xs text-muted-foreground">
                {KIND_META[kindOf(occurrence.item)].label} ·{" "}
                {occurrence.item.allDay || !occurrence.item.startTime ? "today" : formatTime(occurrence.item.startTime)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissedAlerts((current) => new Set(current).add(occurrenceKey(occurrence)))}
              aria-label={`Dismiss reminder: ${occurrence.item.title}`}
              className="btn-icon -my-1 -mr-1 shrink-0"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
