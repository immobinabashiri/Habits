"use client";

import { ArrowDown, ArrowUp, Check, Clock, Flame, Gem, GripVertical, ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HabitIcon } from "@/components/habits/habit-icons";
import { Slider } from "@/components/ui/slider";
import { useDragReorder } from "@/components/dashboard/use-drag-reorder";
import { LIMITS, MAX_BONUS_UNITS } from "@/lib/domain/defaults";
import { computeReward } from "@/lib/domain/progress";
import type { DashboardHabit, DashboardStats } from "@/types/dashboard";

interface TodayHabitsProps {
  habits: DashboardHabit[];
  stats: DashboardStats;
  busy: boolean; // a request is in flight; every row waits
  onComplete: (habitId: string, minutes?: number) => void;
  onUndo: (habitId: string) => void;
  onReorder: (dueHabitIds: string[]) => void; // the new order of the habits due today
}

interface ReorderControls {
  index: number;
  count: number;
  dragging: boolean;
  handle: ReturnType<ReturnType<typeof useDragReorder>["handleProps"]>;
  onMove: (by: -1 | 1) => void;
}

function RewardText({ xp, gems }: { xp: number; gems: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>+{xp} XP</span>
      {gems > 0 ? (
        <span className="inline-flex items-center gap-1">
          <Gem className="size-3 text-primary" aria-hidden="true" />+{gems}
        </span>
      ) : null}
    </span>
  );
}

function HabitRow({
  item,
  busy,
  onComplete,
  onUndo,
  reorder,
}: {
  item: DashboardHabit;
  busy: boolean;
  onComplete: TodayHabitsProps["onComplete"];
  onUndo: TodayHabitsProps["onUndo"];
  reorder: ReorderControls | null; // null when there is nothing to reorder
}) {
  const { habit, completedToday, exemptToday, streak, todayReward, nextMilestone } = item;
  const { timed } = habit;
  const [minutes, setMinutes] = useState(String(timed?.targetMinutes ?? ""));
  const [error, setError] = useState<string | null>(null);

  // A habit exempted after it was already completed can still be undone.
  const locked = exemptToday && !completedToday;
  const parsed = /^\d+$/.test(minutes.trim()) ? Number(minutes) : Number.NaN;
  const minutesOk =
    timed !== null && parsed >= timed.targetMinutes && parsed <= LIMITS.maxMinutesPerDay;
  const preview = timed && minutesOk ? computeReward(habit, parsed) : null;
  // The slider covers the range that can still earn more. Typing allows any longer time.
  const sliderMax = timed
    ? Math.min(LIMITS.maxMinutesPerDay, timed.targetMinutes + MAX_BONUS_UNITS * timed.unitMinutes)
    : 0;
  const bonusTicks = timed
    ? Array.from({ length: MAX_BONUS_UNITS }, (_, i) => timed.targetMinutes + (i + 1) * timed.unitMinutes).filter(
        (tick) => tick < sliderMax,
      )
    : [];

  function submit() {
    if (timed) {
      if (!minutesOk) {
        setError(`Enter ${timed.targetMinutes} to ${LIMITS.maxMinutesPerDay} minutes.`);
        return;
      }
      setError(null);
      onComplete(habit.id, parsed);
      return;
    }
    onComplete(habit.id);
  }

  const circleClass = `inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-[color,background-color,border-color,transform] duration-150 active:scale-95 disabled:opacity-60 ${
    completedToday
      ? "border-success bg-success-soft text-success"
      : "border-input bg-field text-success hover:border-primary"
  }`;

  return (
    <li
      data-reorder-id={habit.id}
      className={`surface p-3 ${
        completedToday ? "border-success/40 bg-success-soft/25" : ""
      } ${locked ? "opacity-70" : ""} ${reorder?.dragging ? "reorder-dragging" : ""}`}
    >
      <div className="flex items-center gap-3">
        {reorder ? (
          // Pointer-only handle. Keyboard and screen reader users get the Move buttons.
          <span aria-hidden="true" title="Drag to reorder" className="reorder-handle" {...reorder.handle}>
            <GripVertical className="size-4" />
          </span>
        ) : null}
        {timed && !completedToday ? (
          // Timed habits are completed from the minutes form below.
          <span aria-hidden="true" className={circleClass} />
        ) : (
          <button
            type="button"
            role="checkbox"
            aria-checked={completedToday}
            aria-label={`${completedToday ? "Undo" : "Complete"}: ${habit.name}`}
            disabled={busy || locked}
            onClick={completedToday ? () => onUndo(habit.id) : submit}
            className={circleClass}
          >
            <Check className="check-mark size-5" aria-hidden="true" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <HabitIcon name={habit.icon} className="size-4 shrink-0 text-muted-foreground" />
            <span className={`truncate ${completedToday ? "text-muted-foreground" : ""}`}>
              {habit.name}
            </span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {locked ? (
              "Day off"
            ) : completedToday && todayReward ? (
              <>
                Earned <RewardText xp={todayReward.xp} gems={todayReward.gems} />
                {todayReward.minutes > 0 ? ` · ${todayReward.minutes} min` : ""}
              </>
            ) : (
              <>
                <RewardText xp={habit.xp} gems={habit.kind === "bonus" ? habit.gems : 0} />
                {timed ? ` · min ${timed.targetMinutes} min` : ""}
                {nextMilestone
                  ? ` · ${nextMilestone.days - streak} to ${nextMilestone.days}-day bonus`
                  : ""}
              </>
            )}
          </p>
        </div>

        {streak > 0 ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-reward px-2.5 py-1 text-sm font-semibold text-reward-foreground"
            title={`${streak}-day streak`}
          >
            <Flame className="size-4" aria-hidden="true" />
            {streak}
            <span className="sr-only">-day streak</span>
          </span>
        ) : null}

        {reorder ? (
          <div className="reorder-keys">
            <button
              type="button"
              onClick={() => reorder.onMove(-1)}
              disabled={reorder.index === 0}
              aria-label={`Move ${habit.name} up`}
              className="btn-icon"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => reorder.onMove(1)}
              disabled={reorder.index === reorder.count - 1}
              aria-label={`Move ${habit.name} down`}
              className="btn-icon"
            >
              <ArrowDown className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {timed && !completedToday && !locked ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className={`mt-3 flex flex-wrap items-start gap-3 ${reorder ? "sm:pl-[5.75rem]" : "sm:pl-14"}`}
        >
          {sliderMax > timed.targetMinutes ? (
            <div className="w-full">
              <Slider
                label={`Minutes for ${habit.name}`}
                unit="min"
                min={timed.targetMinutes}
                max={sliderMax}
                ticks={bonusTicks}
                value={Number.isNaN(parsed) ? timed.targetMinutes : parsed}
                disabled={busy}
                onChange={(value) => {
                  setMinutes(String(value));
                  setError(null);
                }}
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <label htmlFor={`minutes-${habit.id}`} className="sr-only">
              Minutes for {habit.name}
            </label>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
              <input
                id={`minutes-${habit.id}`}
                type="number"
                inputMode="numeric"
                min={timed.targetMinutes}
                max={LIMITS.maxMinutesPerDay}
                value={minutes}
                onChange={(event) => {
                  setMinutes(event.target.value);
                  setError(null);
                }}
                disabled={busy}
                aria-invalid={error ? true : undefined}
                aria-describedby={`minutes-hint-${habit.id}`}
                className="field block min-h-11 w-24"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
            <p
              id={`minutes-hint-${habit.id}`}
              role={error ? "alert" : undefined}
              className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}
            >
              {error ??
                (preview ? (
                  <>
                    You will earn <RewardText xp={preview.xp} gems={preview.gems} />
                    {preview.bonusUnits > 0 ? ` (${preview.bonusUnits} bonus)` : ""}
                  </>
                ) : (
                  `At least ${timed.targetMinutes} minutes`
                ))}
            </p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary px-4"
          >
            Complete
          </button>
        </form>
      ) : null}
    </li>
  );
}

export function TodayHabits({ habits, stats, busy, onComplete, onUndo, onReorder }: TodayHabitsProps) {
  const due = habits.filter((item) => item.scheduledToday);
  const dueIds = due.map((item) => item.habit.id);
  const [announcement, setAnnouncement] = useState("");
  const { listRef, draggingId, slot, handleProps, move } = useDragReorder({
    ids: dueIds,
    disabled: busy,
    onReorder(next, movedId) {
      const name = due.find((item) => item.habit.id === movedId)?.habit.name ?? "Habit";
      setAnnouncement(`${name} moved to position ${next.indexOf(movedId) + 1} of ${next.length}.`);
      onReorder(next);
    },
  });
  const offToday = habits.filter((item) => !item.scheduledToday);
  const percent = stats.todayTotal === 0 ? 0 : Math.round((stats.todayDone / stats.todayTotal) * 100);

  if (habits.length === 0) {
    return (
      <section aria-labelledby="today-title" className="empty-box px-6 py-12 text-center">
        <span
          aria-hidden="true"
          className="mx-auto inline-flex size-14 items-center justify-center icon-bubble"
        >
          <ListChecks className="size-7" />
        </span>
        <h2 id="today-title" className="mt-4 type-h2">
          No habits yet
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-muted-foreground">
          Create your first habit and it will show up here on the days it is scheduled.
        </p>
        <Link
          href="/dashboard/habits"
          className="btn btn-primary mt-5 gap-2 px-4"
        >
          <Plus className="size-5" aria-hidden="true" />
          Add a habit
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="today-title" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 id="today-title" className="type-h2">
          Today
        </h2>
        <p className="text-sm text-muted-foreground">
          {stats.todayTotal === 0 ? "Nothing due" : `${stats.todayDone} of ${stats.todayTotal} done`}
        </p>
      </div>

      {stats.todayTotal > 0 ? (
        <div
          role="progressbar"
          aria-label="Habits completed today"
          aria-valuemin={0}
          aria-valuemax={stats.todayTotal}
          aria-valuenow={stats.todayDone}
          className="progress-track h-2 w-full"
        >
          <div
            className="progress-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}

      {due.length === 0 ? (
        <p className="empty-box px-4 py-8 text-center text-muted-foreground">
          None of your habits are scheduled today. Enjoy the break.
        </p>
      ) : (
        <div className="relative">
        <ul ref={listRef} aria-label="Habits due today" className="space-y-3">
          {due.map((item, index) => (
            <HabitRow
              key={item.habit.id}
              item={item}
              busy={busy}
              onComplete={onComplete}
              onUndo={onUndo}
              reorder={
                due.length > 1
                  ? {
                      index,
                      count: due.length,
                      dragging: draggingId === item.habit.id,
                      handle: handleProps(index),
                      onMove: (by) => move(index, by),
                    }
                  : null
              }
            />
          ))}
        </ul>
        {/* Where the dragged habit will land. Outside the list, so it never shifts the layout. */}
        {slot ? (
          <div
            aria-hidden="true"
            className="reorder-slot"
            style={{ top: slot.top, height: slot.height }}
          />
        ) : null}
        </div>
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {offToday.length > 0 ? (
        <div className="pt-1">
          <h3 className="text-sm font-medium text-muted-foreground">Not scheduled today</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {offToday.map(({ habit, streak }) => (
              <li
                key={habit.id}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground"
              >
                <HabitIcon name={habit.icon} className="size-3.5" />
                {habit.name}
                {streak > 0 ? (
                  <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                    <Flame className="size-3.5" aria-hidden="true" />
                    {streak}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
