"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AchievementsPanel } from "@/components/dashboard/achievements-panel";
import { ActivityPanel } from "@/components/dashboard/activity-panel";
import { LevelCard, LevelUpBanner, StatCards } from "@/components/dashboard/level-card";
import { RewardToasts } from "@/components/dashboard/reward-toasts";
import type { ToastMessage } from "@/components/dashboard/reward-toasts";
import { FreezeShop, StreakGuard } from "@/components/dashboard/streak-panel";
import { TimezoneSync } from "@/components/dashboard/timezone-sync";
import { TodayHabits } from "@/components/dashboard/today-habits";
import { WeekOverview } from "@/components/dashboard/week-overview";
import {
  acknowledgeLevelRequest,
  buyStreakFreezesRequest,
  completeHabitRequest,
  decideMissedDayRequest,
  undoCompletionRequest,
} from "@/lib/api/dashboard-client";
import { toApiError } from "@/lib/api/habits-client";
import { formatDateKey, todayKey } from "@/lib/domain/dates";
import type { CompletionResult, DashboardData, DashboardMutation } from "@/types/dashboard";

const DAY_CHECK_MS = 60_000;

// What one completion earned, as short messages (one toast each).
function rewardMessages(result: CompletionResult): string[] {
  const parts = [`+${result.xp} XP`];
  if (result.gems > 0) parts.push(`+${result.gems} gems`);
  if (result.bonusUnits > 0) parts.push(`${result.bonusUnits} bonus`);
  return [
    parts.join(", "),
    ...result.milestones.map((m) => `${m.days}-day streak! +${m.gems} gems`),
    ...result.achievements.map((a) => `Achievement: ${a.title} (+${a.xp} XP)`),
  ];
}

export function DashboardView({ initial }: { initial: DashboardData }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [dismissedLevel, setDismissedLevel] = useState(0);
  const nextToastId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  function pushToasts(texts: string[]) {
    const created = texts.map((text) => ({ id: ++nextToastId.current, text }));
    setToasts((current) => [...current, ...created].slice(-4));
  }

  // One action at a time. Every action returns the whole fresh dashboard, so the
  // screen always shows exactly what the server calculated.
  async function run(action: () => Promise<DashboardMutation>, message: (r: CompletionResult | null) => string[]) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const mutation = await action();
      setData(mutation.dashboard);
      pushToasts(message(mutation.result));
    } catch (caught) {
      const apiError = toApiError(caught);
      if (apiError.code === "UNAUTHENTICATED") {
        router.push("/login");
        return;
      }
      setError(Object.values(apiError.fields)[0] ?? apiError.message);
    } finally {
      setBusy(false);
    }
  }

  // A tab left open past midnight: "today" has changed on the server, so reload the
  // day. (The page key changes with the day, which starts the view fresh.)
  useEffect(() => {
    function checkDay() {
      if (todayKey(data.timezone) !== data.today) router.refresh();
    }
    const timer = window.setInterval(checkDay, DAY_CHECK_MS);
    window.addEventListener("focus", checkDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkDay);
    };
  }, [data.timezone, data.today, router]);

  const levelUp = data.level.level > Math.max(data.seenLevel, dismissedLevel);
  function dismissLevelUp() {
    setDismissedLevel(data.level.level);
    acknowledgeLevelRequest().catch(() => undefined); // not critical: shown again next visit
  }

  const firstName = data.userName.split(" ")[0] || data.userName;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <TimezoneSync stored={data.timezone} />

      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hi, {firstName}</h1>
        <p className="mt-1 text-muted-foreground">{formatDateKey(data.today)}</p>
      </header>

      {levelUp ? <LevelUpBanner level={data.level.level} onDismiss={dismissLevelUp} /> : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <LevelCard data={data} />
      <StatCards data={data} />

      <StreakGuard
        items={data.habits}
        freezes={data.wallet.streakFreezes}
        busy={busy}
        onDecide={(habitId, date, decision) =>
          run(
            () => decideMissedDayRequest(habitId, date, decision),
            (result) => [
              decision === "frozen" ? "Streak saved with a freeze" : "Streak released",
              ...(result ? rewardMessages(result).slice(1) : []),
            ],
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <TodayHabits
            habits={data.habits}
            stats={data.stats}
            busy={busy}
            onComplete={(habitId, minutes) =>
              run(
                () => completeHabitRequest(habitId, minutes),
                (result) => (result ? rewardMessages(result) : []),
              )
            }
            onUndo={(habitId) =>
              run(
                () => undoCompletionRequest(habitId),
                () => ["Completion undone"],
              )
            }
          />
          <WeekOverview week={data.week} />
        </div>

        <aside className="space-y-4">
          <FreezeShop
            price={data.streakFreeze.price}
            max={data.streakFreeze.max}
            gems={data.wallet.gems}
            freezes={data.wallet.streakFreezes}
            busy={busy}
            onBuy={() =>
              run(
                () => buyStreakFreezesRequest(1),
                () => ["Streak Freeze bought"],
              )
            }
          />
          <AchievementsPanel achievements={data.achievements} />
          <ActivityPanel items={data.activity} timezone={data.timezone} />
        </aside>
      </div>

      <RewardToasts messages={toasts} onDismiss={dismissToast} />
    </div>
  );
}
