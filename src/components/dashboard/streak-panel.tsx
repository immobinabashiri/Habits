import { Flame, Snowflake } from "lucide-react";
import { HabitIcon } from "@/components/habits/habit-icons";
import { formatDateKey } from "@/lib/domain/dates";
import type { PendingFreeze } from "@/types/dashboard";
import type { PublicHabit } from "@/types/habits";

export interface AtRiskItem {
  habit: PublicHabit;
  pendingFreeze: PendingFreeze | null;
}

interface StreakGuardProps {
  items: readonly AtRiskItem[]; // every active habit; only the ones at risk are shown
  freezes: number; // Streak Freezes the user owns
  busy: boolean;
  onDecide: (habitId: string, date: string, decision: "frozen" | "broken") => void;
}

// Missed days that can still be rescued. Shown only when something is at stake.
export function StreakGuard({ items, freezes, busy, onDecide }: StreakGuardProps) {
  const pending = items.filter((item) => item.pendingFreeze !== null);
  if (pending.length === 0) return null;

  return (
    <section
      aria-labelledby="guard-title"
      className="space-y-3 rounded-xl border border-warning/50 bg-card p-4"
    >
      <div>
        <h2 id="guard-title" className="flex items-center gap-2 font-bold tracking-tight">
          <Flame className="size-5 text-warning" aria-hidden="true" />
          Streaks at risk
        </h2>
        <p className="text-sm text-muted-foreground">
          You missed a day. Use a Streak Freeze to keep the streak, or let it break.
          {freezes === 0 ? " You have no freezes left. Buy one below." : ""}
        </p>
      </div>
      <ul className="space-y-3">
        {pending.map(({ habit, pendingFreeze }) =>
          pendingFreeze ? (
            <li key={habit.id} className="rounded-lg border border-border p-3">
              <p className="flex items-center gap-2 font-semibold">
                <HabitIcon name={habit.icon} className="size-4 text-muted-foreground" />
                {habit.name}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {pendingFreeze.gap > 1
                  ? `You missed ${pendingFreeze.gap} days in a row. Each one needs a freeze; start with ${formatDateKey(pendingFreeze.date)}. `
                  : `Missed ${formatDateKey(pendingFreeze.date)}. `}
                Freezing brings back {pendingFreeze.restores} earlier{" "}
                {pendingFreeze.restores === 1 ? "day" : "days"} of streak.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || freezes === 0}
                  onClick={() => onDecide(habit.id, pendingFreeze.date, "frozen")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Snowflake className="size-4" aria-hidden="true" />
                  Use a freeze ({freezes} left)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDecide(habit.id, pendingFreeze.date, "broken")}
                  className="min-h-11 rounded-md px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  Let it break
                </button>
              </div>
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}

export function FreezeShop({
  price,
  max,
  gems,
  freezes,
  busy,
  onBuy,
}: {
  price: number;
  max: number;
  gems: number;
  freezes: number; // owned
  busy: boolean;
  onBuy: () => void;
}) {
  const full = freezes >= max;
  const poor = gems < price;

  return (
    <section aria-labelledby="freeze-title" className="rounded-xl border border-border bg-card p-4">
      <h2 id="freeze-title" className="flex items-center gap-2 font-bold tracking-tight">
        <Snowflake className="size-5 text-accent-foreground" aria-hidden="true" />
        Streak Freeze
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Saves a streak after one missed day. You own {freezes} of {max}.
      </p>
      <button
        type="button"
        onClick={onBuy}
        disabled={busy || full || poor}
        className="mt-3 min-h-11 w-full rounded-md bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {full ? "You have the maximum" : `Buy for ${price} gems`}
      </button>
      {poor && !full ? (
        <p className="mt-2 text-xs text-muted-foreground">
          You need {price - gems} more {price - gems === 1 ? "gem" : "gems"}.
        </p>
      ) : null}
    </section>
  );
}
