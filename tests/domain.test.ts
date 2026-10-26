import assert from "node:assert/strict";
import { computeStreak } from "@/lib/domain/streaks";
import type { FreezeChoice } from "@/lib/domain/streaks";
import { computeReward, levelFromXp, levelProgress } from "@/lib/domain/progress";
import { addDays } from "@/lib/domain/dates";

const TODAY = "2026-10-24"; // Saturday
const OPT = { today: TODAY, lookbackDays: 400, freezeWindowDays: 3 };
const habit = (over = {}) => ({ startDate: "2026-01-01", days: [0, 1, 2, 3, 4, 5, 6] as const, exemptDates: [] as string[], ...over });
const run = (h: ReturnType<typeof habit>, ago: number[], dec: [number, FreezeChoice][] = []) =>
  computeStreak(h, new Set(ago.map((n) => addDays(TODAY, -n))), new Map(dec.map(([n, c]) => [addDays(TODAY, -n), c])), OPT);
const d = (n: number) => addDays(TODAY, -n);
let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("ok -", name); };

t("empty", () => assert.equal(run(habit(), []).count, 0));
t("today open keeps yesterday's run", () => assert.equal(run(habit(), [1, 2, 3, 4, 5]).count, 5));
t("today done counts", () => assert.equal(run(habit(), [0, 1, 2]).count, 3));
t("startDate = first day of run", () => assert.equal(run(habit(), [0, 1, 2]).startDate, d(2)));
t("Mon-Fri habit skips the weekend", () => assert.equal(run(habit({ days: [1, 2, 3, 4, 5] as const }), [1, 2, 3, 4, 5, 6, 7]).count, 5));
t("exempt day never breaks", () => assert.equal(run(habit({ exemptDates: [d(2)] }), [0, 1, 3]).count, 3));
t("one missed day, streak behind -> pending (gap 1)", () => assert.deepEqual(run(habit(), [0, 2, 3, 4, 5, 6, 7]).pendingFreeze, { date: d(1), restores: 6, gap: 1 }));
t("nothing behind the miss -> no pending", () => { assert.equal(run(habit(), [0]).pendingFreeze, null); assert.equal(run(habit(), []).pendingFreeze, null); });
t("2 missed days in a row -> pending on the latest, gap 2", () => assert.deepEqual(run(habit(), [0, 3, 4, 5, 6, 7]).pendingFreeze, { date: d(1), restores: 5, gap: 2 }));
t("3 missed in a row ok, 4 is too many", () => {
  assert.equal(run(habit(), [4, 5, 6, 7, 8]).pendingFreeze?.gap, 3);
  assert.equal(run(habit(), [5, 6, 7, 8, 9]).pendingFreeze, null);
});
t("a miss exactly at the edge of the window is still offered", () => assert.deepEqual(run(habit(), [0, 1, 2, 4, 5, 6]).pendingFreeze, { date: d(3), restores: 3, gap: 1 }));
t("a miss older than the window is not offered", () => assert.equal(run(habit(), [0, 1, 2, 3, 5, 6, 7]).pendingFreeze, null));  // miss = d4
t("frozen day keeps the run, adds nothing", () => { const r = run(habit(), [0, 2, 3, 4], [[1, "frozen"]]); assert.equal(r.count, 4); assert.equal(r.pendingFreeze, null); });
t("broken decision ends it, no more prompts", () => { const r = run(habit(), [0, 2, 3, 4], [[1, "broken"]]); assert.equal(r.count, 1); assert.equal(r.pendingFreeze, null); });
t("broken day inside a gap blocks the offer", () => assert.equal(run(habit(), [0, 3, 4, 5], [[2, "broken"]]).pendingFreeze, null));
t("after freezing the latest, the earlier miss is offered", () => assert.deepEqual(run(habit(), [0, 3, 4, 5, 6, 7], [[1, "frozen"]]).pendingFreeze, { date: d(2), restores: 5, gap: 1 }));
t("both frozen -> reconnected", () => assert.equal(run(habit(), [0, 3, 4, 5, 6, 7], [[1, "frozen"], [2, "frozen"]]).count, 6));
t("startDate respected", () => assert.equal(run(habit({ startDate: d(2) }), [0, 1, 2]).count, 3));

t("reward: core xp only", () => assert.deepEqual(computeReward({ kind: "core", xp: 10, gems: 99, timed: null }, 0), { xp: 10, gems: 0, bonusUnits: 0 }));
t("reward: bonus xp+gems", () => assert.deepEqual(computeReward({ kind: "bonus", xp: 10, gems: 5, timed: null }, 0), { xp: 10, gems: 5, bonusUnits: 0 }));
const tm = { targetMinutes: 30, unitMinutes: 15, extraXpPerUnit: 2, extraGemsPerUnit: 3 };
t("reward: timed blocks", () => assert.deepEqual(computeReward({ kind: "bonus", xp: 10, gems: 5, timed: tm }, 60), { xp: 14, gems: 11, bonusUnits: 2 }));
t("reward: timed core no gems", () => assert.deepEqual(computeReward({ kind: "core", xp: 10, gems: 0, timed: tm }, 60), { xp: 14, gems: 0, bonusUnits: 2 }));
t("levels", () => { assert.equal(levelFromXp(99), 1); assert.equal(levelFromXp(100), 2); assert.equal(levelFromXp(300), 3); assert.equal(levelProgress(150).percent, 25); });
console.log(`\n${n} tests passed`);
