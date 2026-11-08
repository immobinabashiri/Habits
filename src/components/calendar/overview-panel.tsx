"use client";

import { AlarmClock, ArrowRight, Bell, CalendarCheck2, CalendarX2, Sparkles } from "lucide-react";
import Link from "next/link";
import { ItemRow } from "@/components/calendar/calendar-items";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  blockRange,
  formatShortDate,
  formatTime,
  minutesToTime,
  reminderAt,
} from "@/lib/domain/calendar";
import type { Occurrence } from "@/lib/domain/calendar";
import { addDays } from "@/lib/domain/dates";
import type { CalendarHabitDay, PublicCalendarItem } from "@/types/calendar";
import type { DateKey } from "@/types/common";

const UP_NEXT = 4;
const REMINDERS = 5;

// "What do I need to do next?": the always-on panel beside every view.
export function OverviewPanel({
  today,
  now,
  upcoming,
  overdue,
  habitDaysToday,
  busyKey,
  onOpen,
  onToggleDone,
  onMoveToToday,
}: {
  today: DateKey;
  now: { date: DateKey; minutes: number } | null;
  upcoming: Occurrence[]; // today and the next week, already filtered
  overdue: PublicCalendarItem[];
  habitDaysToday: CalendarHabitDay[];
  busyKey: string | null;
  onOpen: (occurrence: Occurrence) => void;
  onToggleDone: (occurrence: Occurrence) => void;
  onMoveToToday: (item: PublicCalendarItem) => void;
}) {
  // Before the clock is known (first paint), treat the whole of today as ahead.
  const minuteNow = now && now.date === today ? now.minutes : 0;
  const isAhead = (o: Occurrence) =>
    o.date > today || o.item.allDay || !o.item.startTime || blockRange(o.item).end > minuteNow;
  const next = upcoming.filter((o) => !o.done && o.item.type !== "note" && isAhead(o)).slice(0, UP_NEXT);

  const reminders = upcoming
    .map((o) => ({ occurrence: o, at: reminderAt(o.item, o.date) }))
    .filter(
      (r): r is { occurrence: Occurrence; at: { date: DateKey; minutes: number } } =>
        r.at !== null && !r.occurrence.done && (r.at.date > today || (r.at.date === today && r.at.minutes >= minuteNow)),
    )
    .sort((a, b) => a.at.date.localeCompare(b.at.date) || a.at.minutes - b.at.minutes)
    .slice(0, REMINDERS);

  const habitsDue = habitDaysToday.filter((h) => h.status !== "exempt");
  const habitsDone = habitsDue.filter((h) => h.status === "done").length;

  const when = (date: DateKey) => (date === today ? "Today" : date === addDays(today, 1) ? "Tomorrow" : formatShortDate(date));

  return (
    <section aria-labelledby="overview-title" className="panel space-y-5 p-4">
      <h2 id="overview-title" className="type-h3 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        Your next steps
      </h2>

      {habitsDue.length > 0 ? (
        <div>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">Today&apos;s habits</span>
            <span className="tabular-nums text-muted-foreground">
              {habitsDone} of {habitsDue.length}
            </span>
          </div>
          <ProgressBar value={habitsDone / habitsDue.length} label="Today's habits done" className="mt-2" />
          {habitsDone < habitsDue.length ? (
            <Link href="/dashboard" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline">
              Check them off on the Dashboard
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">All done for today. Nice work.</p>
          )}
        </div>
      ) : null}

      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <CalendarCheck2 className="size-3.5" aria-hidden="true" />
          Up next
        </h3>
        {next.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {next.map((occurrence) => (
              <ItemRow
                key={`${occurrence.item.id}-${occurrence.date}`}
                occurrence={occurrence}
                onOpen={onOpen}
                onToggleDone={onToggleDone}
                busy={busyKey === `${occurrence.item.id}-${occurrence.date}`}
                showDate={occurrence.date !== today}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Nothing else planned for the next 7 days.</p>
        )}
      </div>

      {overdue.length > 0 ? (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-destructive uppercase">
            <CalendarX2 className="size-3.5" aria-hidden="true" />
            Overdue · {overdue.length}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {overdue.map((item) => {
              const occurrence = { item, date: item.date, done: false };
              return (
                <ItemRow
                  key={item.id}
                  occurrence={occurrence}
                  onOpen={onOpen}
                  onToggleDone={onToggleDone}
                  busy={busyKey === `${item.id}-${item.date}`}
                  showDate
                  extra={
                    <button
                      type="button"
                      onClick={() => onMoveToToday(item)}
                      disabled={busyKey === `${item.id}-${item.date}`}
                      className="btn btn-quiet min-h-11 shrink-0 px-2 text-xs"
                      aria-label={`Move ${item.title} to today`}
                    >
                      To today
                    </button>
                  }
                />
              );
            })}
          </ul>
        </div>
      ) : null}

      {reminders.length > 0 ? (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Bell className="size-3.5" aria-hidden="true" />
            Reminders
          </h3>
          <ul className="mt-2 space-y-1">
            {reminders.map(({ occurrence, at }) => (
              <li key={`${occurrence.item.id}-${occurrence.date}`}>
                <button
                  type="button"
                  onClick={() => onOpen(occurrence)}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm hover:bg-muted"
                >
                  <AlarmClock className="size-4 shrink-0 text-[var(--cal-reminder)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{occurrence.item.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {when(at.date)} {formatTime(minutesToTime(at.minutes))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
