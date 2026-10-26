"use client";

import { Flame, ListChecks, Trophy, X, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { FreezeShop, StreakGuard } from "@/components/dashboard/streak-panel";
import { HabitStreakCard } from "@/components/streaks/habit-streak-card";
import { HistoryLegend } from "@/components/streaks/history-grid";
import { MilestonesPanel } from "@/components/streaks/milestones-panel";
import { toApiError } from "@/lib/api/client";
import { buyStreakFreezesRequest, decideMissedDayRequest } from "@/lib/api/dashboard-client";
import type { DashboardMutation } from "@/types/dashboard";
import type { StreaksData } from "@/types/streaks";

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        {icon}
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

// The page is a pure view of what the server calculated: after an action the server
// page renders again (router.refresh), so streaks and the calendar can never drift.
export function StreaksView({ data }: { data: StreaksData }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = working || refreshing;

  async function run(action: () => Promise<DashboardMutation>, success: string) {
    if (busy) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const { result } = await action();
      const extra = result?.milestones.map((m) => `${m.days}-day streak bonus: +${m.gems} gems.`) ?? [];
      setNotice([success, ...extra].join(" "));
      startTransition(() => router.refresh());
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      setError(Object.values(apiError.fields)[0] ?? apiError.message);
    } finally {
      setWorking(false);
    }
  }

  const { summary, habits } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Streaks</h1>
      <p className="mt-1 text-muted-foreground">
        Days in a row you did a habit. Days it is not scheduled, and skip days, never break a streak.
      </p>

      {error ? (
        <div role="alert" className="mt-6 flex items-start justify-between gap-3 rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
          <p className="py-1.5">{error}</p>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="-my-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-destructive/10">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="mt-6 flex items-start justify-between gap-3 rounded-md border border-success/50 bg-success-soft/40 px-3 py-2 text-sm">
          <p className="py-1.5">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="-my-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-muted">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="mt-6">
        <StreakGuard
          items={habits}
          freezes={data.wallet.streakFreezes}
          busy={busy}
          onDecide={(habitId, date, decision) =>
            run(
              () => decideMissedDayRequest(habitId, date, decision),
              decision === "frozen" ? "Streak saved with a freeze." : "Streak released.",
            )
          }
        />
      </div>

      {habits.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <span aria-hidden="true" className="inline-flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Flame className="size-7" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">No streaks yet</h2>
            <p className="mt-1 max-w-sm text-muted-foreground">Create a habit and complete it a few days in a row to see your streaks grow here.</p>
          </div>
          <Link href="/dashboard/habits" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <ListChecks className="size-5" aria-hidden="true" />
            Go to Habits
          </Link>
        </div>
      ) : (
        <>
          <section aria-label="Streak summary" className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat icon={<Flame className="size-5" />} label="Active streaks" value={String(summary.activeStreaks)} />
            <Stat icon={<Zap className="size-5" />} label="Best right now" value={days(summary.bestCurrent)} />
            <Stat icon={<Trophy className="size-5" />} label="Longest ever" value={days(summary.bestEver)} />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section aria-labelledby="habit-streaks-title">
              <h2 id="habit-streaks-title" className="sr-only">
                Streak of each habit
              </h2>
              <HistoryLegend />
              <ul className="mt-4 grid gap-4 xl:grid-cols-2">
                {habits.map((item) => (
                  <HabitStreakCard key={item.habit.id} item={item} days={data.days} hasMilestones={data.milestones.length > 0} />
                ))}
              </ul>
            </section>

            <aside className="space-y-4">
              <FreezeShop
                price={data.streakFreeze.price}
                max={data.streakFreeze.max}
                gems={data.wallet.gems}
                freezes={data.wallet.streakFreezes}
                busy={busy}
                onBuy={() => run(() => buyStreakFreezesRequest(1), "Streak Freeze bought.")}
              />
              <MilestonesPanel milestones={data.milestones} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
