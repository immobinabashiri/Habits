import { Flame } from "lucide-react";
import { HabitIcon } from "@/components/habits/habit-icons";
import { HistoryGrid } from "@/components/streaks/history-grid";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDateKey } from "@/lib/domain/dates";
import { describeSchedule } from "@/lib/domain/weekdays";
import type { DateKey } from "@/types/common";
import type { HabitStreakDetail } from "@/types/streaks";

const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

export function HabitStreakCard({
  item,
  days: window,
  hasMilestones,
}: {
  item: HabitStreakDetail;
  days: DateKey[];
  hasMilestones: boolean;
}) {
  const { habit, streak, longest, nextMilestone, history, counts } = item;
  const active = streak > 0;
  const left = nextMilestone ? nextMilestone.days - streak : 0;

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
        >
          <HabitIcon name={habit.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{habit.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{describeSchedule(habit.schedule.days)}</p>
        </div>
        <p
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-lg font-bold ${
            active ? "bg-secondary text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <Flame className="size-5" aria-hidden="true" />
          <span aria-label={`${days(streak)} streak`}>{streak}</span>
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Longest</dt>
          <dd className="font-semibold">{days(longest)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Current run began</dt>
          <dd className="font-semibold">{item.streakStart ? formatDateKey(item.streakStart) : "No active run"}</dd>
        </div>
      </dl>

      <div>
        {nextMilestone ? (
          <>
            <ProgressBar
              value={streak / nextMilestone.days}
              label={`Progress to the ${nextMilestone.days}-day bonus`}
            />
            <p className="mt-1.5 text-sm text-muted-foreground">
              {days(left)} to the {nextMilestone.days}-day bonus
              {nextMilestone.gems > 0 ? ` (+${nextMilestone.gems} gems)` : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {hasMilestones ? "You are past every streak bonus. Keep going." : "No streak bonuses are set."}
          </p>
        )}
        {!active ? (
          <p className="mt-1 text-sm text-muted-foreground">No streak right now. Complete this habit to start one.</p>
        ) : null}
      </div>

      <div className="flex justify-center sm:justify-start">
        <HistoryGrid
          days={window}
          history={history}
          summary={`Last ${window.length / 7} weeks for ${habit.name}: ${counts.done} done, ${counts.missed} missed, ${counts.frozen} frozen.`}
        />
      </div>
    </li>
  );
}
