"use client";

import { Check, Clock, Flame, Gem, ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HabitIcon } from "@/components/habits/habit-icons";
import { LIMITS } from "@/lib/domain/defaults";
import { computeReward } from "@/lib/domain/progress";
import type { DashboardHabit, DashboardStats } from "@/types/dashboard";

interface TodayHabitsProps {
  habits: DashboardHabit[];
  stats: DashboardStats;
  busy: boolean; // a request is in flight; every row waits
  onComplete: (habitId: string, minutes?: number) => void;
  onUndo: (habitId: string) => void;
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
}: {
  item: DashboardHabit;
  busy: boolean;
  onComplete: TodayHabitsProps["onComplete"];
  onUndo: TodayHabitsProps["onUndo"];
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

  const circleClass = `inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-60 ${
    completedToday
      ? "border-success bg-success-soft text-success"
      : "border-input bg-card text-transparent hover:border-primary"
  }`;

  return (
    <li
      className={`rounded-lg border p-3 ${
        completedToday ? "border-success/40 bg-success-soft/25" : "border-border bg-card"
      } ${locked ? "opacity-70" : ""}`}
    >
      <div className="flex items-center gap-3">
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
            <Check className="size-5" aria-hidden="true" />
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
      </div>

      {timed && !completedToday && !locked ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="mt-3 flex flex-wrap items-start gap-3 pl-14"
        >
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
                className="block min-h-11 w-24 rounded-md border border-input bg-card px-3 text-base text-card-foreground disabled:opacity-60 aria-[invalid=true]:border-destructive"
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
            className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Complete
          </button>
        </form>
      ) : null}
    </li>
  );
}

export function TodayHabits({ habits, stats, busy, onComplete, onUndo }: TodayHabitsProps) {
  const due = habits.filter((item) => item.scheduledToday);
  const offToday = habits.filter((item) => !item.scheduledToday);
  const percent = stats.todayTotal === 0 ? 0 : Math.round((stats.todayDone / stats.todayTotal) * 100);

  if (habits.length === 0) {
    return (
      <section aria-labelledby="today-title" className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <span
          aria-hidden="true"
          className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
        >
          <ListChecks className="size-7" />
        </span>
        <h2 id="today-title" className="mt-4 text-lg font-semibold">
          No habits yet
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-muted-foreground">
          Create your first habit and it will show up here on the days it is scheduled.
        </p>
        <Link
          href="/dashboard/habits"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
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
        <h2 id="today-title" className="text-lg font-bold tracking-tight">
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
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-success transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}

      {due.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
          None of your habits are scheduled today. Enjoy the break.
        </p>
      ) : (
        <ul className="space-y-3">
          {due.map((item) => (
            <HabitRow
              key={item.habit.id}
              item={item}
              busy={busy}
              onComplete={onComplete}
              onUndo={onUndo}
            />
          ))}
        </ul>
      )}

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
