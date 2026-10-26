import { CheckCircle2, Flame, Gem, Snowflake, Sparkles, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardData } from "@/types/dashboard";

export function LevelCard({ data }: { data: DashboardData }) {
  const { level, wallet } = data;
  return (
    <section
      aria-label="Level and gems"
      className="glass flex flex-col gap-5 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          aria-hidden="true"
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
        >
          {level.level}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Level {level.level}</p>
          <div
            role="progressbar"
            aria-label="Progress to the next level"
            aria-valuemin={0}
            aria-valuemax={level.needed}
            aria-valuenow={level.into}
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${level.percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {level.into} / {level.needed} XP to level {level.level + 1}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-reward px-4 font-semibold text-reward-foreground">
          <Gem className="size-5" aria-hidden="true" />
          <span>
            {wallet.gems.toLocaleString("en-US")}
            <span className="sr-only"> gems</span>
          </span>
        </span>
        <span
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium"
          title="Streak Freezes you own"
        >
          <Snowflake className="size-4 text-accent-foreground" aria-hidden="true" />
          {wallet.streakFreezes}
          <span className="sr-only"> Streak Freezes</span>
        </span>
      </div>
    </section>
  );
}

function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden="true">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StatCards({ data }: { data: DashboardData }) {
  const { stats, wallet } = data;
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  return (
    <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        icon={<CheckCircle2 className="size-4" />}
        label="Done today"
        value={`${stats.todayDone}/${stats.todayTotal}`}
        hint={stats.todayTotal === 0 ? "Nothing scheduled" : undefined}
      />
      <Stat
        icon={<Flame className="size-4" />}
        label="Best streak"
        value={`${stats.bestStreak} ${plural(stats.bestStreak, "day", "days")}`}
        hint={`${stats.activeStreaks} active ${plural(stats.activeStreaks, "streak", "streaks")}`}
      />
      <Stat
        icon={<Gem className="size-4" />}
        label="Gems earned"
        value={wallet.totalGemsEarned.toLocaleString("en-US")}
        hint={`${wallet.totalGemsSpent.toLocaleString("en-US")} spent`}
      />
      <Stat
        icon={<Trophy className="size-4" />}
        label="Completions"
        value={stats.totalCompletions.toLocaleString("en-US")}
        hint={`${wallet.xp.toLocaleString("en-US")} XP total`}
      />
    </section>
  );
}

export function LevelUpBanner({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-reward px-4 py-3 text-reward-foreground"
    >
      <p className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-5" aria-hidden="true" />
        You reached level {level}!
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-11 rounded-md px-4 text-sm font-semibold hover:bg-foreground/10"
      >
        Nice
      </button>
    </div>
  );
}
