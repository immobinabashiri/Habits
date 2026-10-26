import assert from "node:assert/strict";
import mongoose, { Types } from "mongoose";
import { connectDB } from "@/utils/connectDB";
import { User } from "@/lib/db/models/user";
import { Transaction } from "@/lib/db/models/transaction";
import { Completion } from "@/lib/db/models/completion";
import { createHabit } from "@/lib/services/habits";
import { completeHabit, undoCompletion } from "@/lib/services/completions";
import { buyStreakFreezes, decideMissedDay } from "@/lib/services/streak-freezes";
import { getDashboard } from "@/lib/services/dashboard";
import { addDays, todayKey } from "@/lib/domain/dates";
import { AppError } from "@/lib/errors";

const today = todayKey("UTC");
const d = (n: number) => addDays(today, -n);
const ALL = [0, 1, 2, 3, 4, 5, 6];
let n = 0;
const t = async (name: string, fn: () => Promise<void>) => { try { await fn(); n++; console.log("ok   -", name); } catch (e) { console.log("FAIL -", name, "\n      ", (e as Error).message.split("\n").slice(0, 6).join("\n       ")); failed++; } };
let failed = 0;
const code = async (p: Promise<unknown>) => { try { await p; return "no error"; } catch (e) { return e instanceof AppError ? e.code : String(e); } };

async function newUser() {
  const u = await User.create({ email: `u${Math.random().toString(36).slice(2)}@t.dev`, name: "Test User", passwordHash: "x" });
  return u._id as Types.ObjectId;
}
const wallet = async (id: Types.ObjectId) => (await User.findById(id))!.wallet;
const mk = (id: Types.ObjectId, over: Record<string, unknown> = {}) =>
  createHabit(id, { name: "Read", schedule: { kind: "weekdays", days: [...ALL] }, startDate: d(20), ...over } as never);
const oid = (s: string) => new Types.ObjectId(s);
const done = (u: Types.ObjectId, h: string, ...ago: number[]) =>   // history written straight to the DB
  Completion.insertMany(ago.map((n) => ({ userId: u, habitId: oid(h), date: d(n), minutes: 0, xp: 10, gems: 0, habitName: "Read",
    rewardSnapshot: { xp: 10, gems: 0, timed: null }, completedAt: new Date(), reversedAt: null })));
const entry = async (u: Types.ObjectId, h: string) => (await getDashboard(u)).habits.find((x) => x.habit.id === h)!;

async function main() {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  await t("core habit pays XP only + 'First step'", async () => {
    const u = await newUser(); const h = await mk(u);
    const r = await completeHabit(u, oid(h.id), {});
    assert.equal(r.result!.xp, 10); assert.equal(r.result!.gems, 0);
    assert.deepEqual(r.result!.achievements.map((a) => a.title), ["First step"]);
    const w = await wallet(u); assert.equal(w.xp, 20); assert.equal(w.gems, 0);
  });

  await t("twice -> ALREADY_COMPLETED, paid once", async () => {
    const u = await newUser(); const h = await mk(u);
    await completeHabit(u, oid(h.id), {});
    assert.equal(await code(completeHabit(u, oid(h.id), {})), "ALREADY_COMPLETED");
    assert.equal((await wallet(u)).xp, 20);
  });

  await t("undo + redo; ledger sum == balance", async () => {
    const u = await newUser(); const h = await mk(u, { kind: "bonus", gems: 5 });
    await completeHabit(u, oid(h.id), {});
    await undoCompletion(u, oid(h.id));
    let w = await wallet(u); assert.equal(w.gems, 0); assert.equal(w.xp, 10);
    await completeHabit(u, oid(h.id), {});
    w = await wallet(u); assert.equal(w.gems, 5);
    assert.equal((await Transaction.find({ userId: u })).reduce((a, x) => a + x.amount, 0), w.gems);
    assert.equal(w.totalGemsEarned, 5);
  });

  await t("20 parallel ticks -> paid exactly once", async () => {
    const u = await newUser(); const h = await mk(u, { kind: "bonus", gems: 7 });
    const r = await Promise.all(Array.from({ length: 20 }, () => code(completeHabit(u, oid(h.id), {}))));
    assert.equal(r.filter((x) => x === "no error").length, 1);
    assert.equal((await wallet(u)).gems, 7); assert.equal(await Completion.countDocuments({ userId: u }), 1);
  });

  await t("parallel undo -> taken back once", async () => {
    const u = await newUser(); const h = await mk(u, { kind: "bonus", gems: 7 });
    await completeHabit(u, oid(h.id), {});
    const r = await Promise.all(Array.from({ length: 10 }, () => code(undoCompletion(u, oid(h.id)))));
    assert.equal(r.filter((x) => x === "no error").length, 1);
    assert.equal((await wallet(u)).gems, 0);
  });

  await t("not scheduled / archived / exempt / foreign -> rejected", async () => {
    const u = await newUser();
    const otherDay = (new Date(`${today}T00:00:00Z`).getUTCDay() + 1) % 7;
    const off = await mk(u, { schedule: { kind: "weekdays", days: [otherDay] } });
    assert.equal(await code(completeHabit(u, oid(off.id), {})), "NOT_AVAILABLE_TODAY");
    const h = await mk(u);
    assert.equal(await code(completeHabit(await newUser(), oid(h.id), {})), "NOT_FOUND");
  });

  await t("timed: needs minutes >= minimum, pays bonus blocks, capped", async () => {
    const u = await newUser();
    const h = await mk(u, { kind: "bonus", gems: 5, xp: 10, timed: { targetMinutes: 30, unitMinutes: 15, extraXpPerUnit: 2, extraGemsPerUnit: 3 } });
    assert.equal(await code(completeHabit(u, oid(h.id), {})), "VALIDATION_FAILED");
    assert.equal(await code(completeHabit(u, oid(h.id), { minutes: 29 })), "VALIDATION_FAILED");
    const r = await completeHabit(u, oid(h.id), { minutes: 60 });
    assert.deepEqual([r.result!.xp, r.result!.gems, r.result!.bonusUnits], [14, 11, 2]);
    const u2 = await newUser(); const h2 = await mk(u2, { kind: "bonus", gems: 5, timed: { targetMinutes: 30, unitMinutes: 15, extraXpPerUnit: 2, extraGemsPerUnit: 3 } });
    assert.equal((await completeHabit(u2, oid(h2.id), { minutes: 1000 })).result!.bonusUnits, 4);
  });

  await t("7-day streak pays 50 gems once; undo+redo never pays twice", async () => {
    const u = await newUser(); const h = await mk(u);
    await done(u, h.id, 6, 5, 4, 3, 2, 1);
    let r = await completeHabit(u, oid(h.id), {});
    assert.deepEqual(r.result!.milestones, [{ days: 7, gems: 50 }]);
    assert.equal((await wallet(u)).gems, 50);
    await undoCompletion(u, oid(h.id));
    r = await completeHabit(u, oid(h.id), {});
    assert.deepEqual(r.result!.milestones, []); assert.equal((await wallet(u)).gems, 50);
  });

  await t("undo is blocked once the gems were spent", async () => {
    const u = await newUser(); const h = await mk(u, { kind: "bonus", gems: 5 });
    await completeHabit(u, oid(h.id), {});
    await User.updateOne({ _id: u }, { $set: { "wallet.gems": 2 } });
    assert.equal(await code(undoCompletion(u, oid(h.id))), "UNDO_BLOCKED");
    assert.equal((await entry(u, h.id)).completedToday, true);          // rolled back, still done
    assert.equal((await wallet(u)).xp, 20);
  });

  await t("freeze: offered, needs a freeze, spends exactly one, parallel-safe", async () => {
    const u = await newUser(); const h = await mk(u);
    await done(u, h.id, 6, 5, 4, 3, 2);                               // yesterday (d1) missed
    assert.deepEqual((await entry(u, h.id)).pendingFreeze, { date: d(1), restores: 5, gap: 1 });
    assert.equal(await code(decideMissedDay(u, oid(h.id), d(1), "frozen")), "FREEZE_UNAVAILABLE");
    assert.equal(await code(decideMissedDay(u, oid(h.id), d(3), "frozen")), "VALIDATION_FAILED");
    await User.updateOne({ _id: u }, { $set: { "wallet.streakFreezes": 5 } });
    const r = await Promise.all(Array.from({ length: 6 }, () => code(decideMissedDay(u, oid(h.id), d(1), "frozen"))));
    assert.equal(r.filter((x) => x === "no error").length, 1);
    assert.equal((await wallet(u)).streakFreezes, 4);
    const e = await entry(u, h.id); assert.equal(e.streak, 5); assert.equal(e.pendingFreeze, null);
  });

  await t("'let it break' stops the prompt", async () => {
    const u = await newUser(); const h = await mk(u);
    await done(u, h.id, 6, 5, 4, 3, 2);
    await decideMissedDay(u, oid(h.id), d(1), "broken");
    const e = await entry(u, h.id); assert.equal(e.pendingFreeze, null); assert.equal(e.streak, 0);
  });

  await t("buy freeze: gems, cap, parallel-safe, ledger", async () => {
    const u = await newUser();
    assert.equal(await code(buyStreakFreezes(u, 1)), "INSUFFICIENT_GEMS");
    await User.updateOne({ _id: u }, { $set: { "wallet.gems": 120 } });
    const r = await Promise.all([1, 2, 3].map(() => code(buyStreakFreezes(u, 1))));   // 120 gems / 50 = 2
    assert.equal(r.filter((x) => x === "no error").length, 2);
    const w = await wallet(u); assert.equal(w.gems, 20); assert.equal(w.streakFreezes, 2);
    assert.equal(await Transaction.countDocuments({ userId: u, type: "purchase" }), 2);
    await User.updateOne({ _id: u }, { $set: { "wallet.gems": 1000, "wallet.streakFreezes": 5 } });
    assert.equal(await code(buyStreakFreezes(u, 1)), "LIMIT_REACHED");
  });

  // ---- two situations a real user hits ----
  await t("IMPROVE: freezing reconnects a streak -> milestone is paid at that moment", async () => {
    const u = await newUser(); const h = await mk(u);
    await done(u, h.id, 8, 7, 6, 5, 4, 3, 1);                          // 6 days, missed d2, then d1
    await User.updateOne({ _id: u }, { $set: { "wallet.streakFreezes": 1 } });
    assert.equal((await entry(u, h.id)).streak, 1);
    await decideMissedDay(u, oid(h.id), d(2), "frozen");
    assert.equal((await entry(u, h.id)).streak, 7);
    assert.equal((await wallet(u)).gems, 50);                          // the 7-day bonus
  });

  await t("IMPROVE: 2 missed days in a row can still be saved (one freeze each)", async () => {
    const u = await newUser(); const h = await mk(u);
    await done(u, h.id, 7, 6, 5, 4, 3);                                // missed d2 and d1
    const p = (await entry(u, h.id)).pendingFreeze;
    assert.ok(p, "pending freeze expected for a 2-day gap");
    assert.equal(p!.date, d(1)); assert.equal(p!.restores, 5);
    await User.updateOne({ _id: u }, { $set: { "wallet.streakFreezes": 2 } });
    await decideMissedDay(u, oid(h.id), d(1), "frozen");
    assert.equal((await entry(u, h.id)).pendingFreeze?.date, d(2));
    await decideMissedDay(u, oid(h.id), d(2), "frozen");
    assert.equal((await entry(u, h.id)).streak, 5);
  });

  await t("dashboard: archived hidden, no password hash, week has 7 days", async () => {
    const u = await newUser(); const h = await mk(u); const gone = await mk(u, { name: "Old" });
    const { Habit } = await import("@/lib/db/models/habit");
    await Habit.updateOne({ _id: gone.id }, { $set: { archivedAt: new Date() } });
    await completeHabit(u, oid(h.id), {});
    const dash = await getDashboard(u);
    assert.equal(dash.habits.length, 1); assert.equal(dash.week.length, 7);
    assert.equal(dash.week[6].done, 1); assert.equal(dash.stats.todayDone, 1);
    assert.equal(JSON.stringify(dash).includes("passwordHash"), false);
  });

  console.log(`\n${n} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
