import "server-only";
import type { HydratedDocument, Types } from "mongoose";
import { FreezeDecision, TimeLog } from "@/lib/db/models/completion";
import { Habit } from "@/lib/db/models/habit";
import { User } from "@/lib/db/models/user";
import { addDays, todayKey } from "@/lib/domain/dates";
import { LIMITS } from "@/lib/domain/defaults";
import { AppError } from "@/lib/errors";
import { connectDB } from "@/utils/connectDB";
import type { CreateHabitInput, UpdateHabitInput } from "@/lib/validation/habit";
import type { HabitRecord, PublicHabit } from "@/types/habit";

export type HabitStatus = "active" | "archived" | "all";

function toPublicHabit(habit: HydratedDocument<HabitRecord>): PublicHabit {
  return {
    id: habit._id.toString(),
    name: habit.name,
    icon: habit.icon,
    category: habit.category,
    description: habit.description,
    kind: habit.kind,
    schedule: { kind: habit.schedule.kind, days: [...habit.schedule.days] },
    xp: habit.xp,
    gems: habit.gems,
    timed: habit.timed
      ? {
          targetMinutes: habit.timed.targetMinutes,
          unitMinutes: habit.timed.unitMinutes,
          extraXpPerUnit: habit.timed.extraXpPerUnit,
          extraGemsPerUnit: habit.timed.extraGemsPerUnit,
        }
      : null,
    startDate: habit.startDate,
    exemptDates: [...habit.exemptDates].sort(),
    archivedAt: habit.archivedAt ? habit.archivedAt.toISOString() : null,
    createdAt: habit.createdAt.toISOString(),
    updatedAt: habit.updatedAt.toISOString(),
  };
}

// Every lookup filters by userId, so a habit that belongs to someone else
// behaves exactly like a habit that does not exist.
async function findOwnedHabit(userId: Types.ObjectId, habitId: Types.ObjectId) {
  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) throw new AppError("NOT_FOUND");
  return habit;
}

async function getUserTimeZone(userId: Types.ObjectId): Promise<string> {
  const user = await User.findById(userId).select("settings.timezone");
  if (!user) throw new AppError("UNAUTHENTICATED");
  return user.settings.timezone;
}

export async function listHabits(
  userId: Types.ObjectId,
  status: HabitStatus,
): Promise<PublicHabit[]> {
  await connectDB();
  const filter: Record<string, unknown> = { userId };
  if (status === "active") filter.archivedAt = null;
  if (status === "archived") filter.archivedAt = { $ne: null };

  const habits = await Habit.find(filter)
    .sort({ createdAt: 1 })
    .limit(LIMITS.maxHabits);
  return habits.map((habit) => toPublicHabit(habit));
}

export async function getHabit(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
): Promise<PublicHabit> {
  await connectDB();
  return toPublicHabit(await findOwnedHabit(userId, habitId));
}

export async function createHabit(
  userId: Types.ObjectId,
  input: CreateHabitInput,
): Promise<PublicHabit> {
  await connectDB();

  // Two simultaneous requests could exceed the limit by one. That is acceptable here.
  if ((await Habit.countDocuments({ userId })) >= LIMITS.maxHabits) {
    throw new AppError("LIMIT_REACHED");
  }

  const kind = input.kind ?? "core";
  const startDate = input.startDate ?? todayKey(await getUserTimeZone(userId));

  const habit = await Habit.create({
    userId,
    name: input.name,
    icon: input.icon ?? "star",
    category: input.category ?? "Other",
    description: input.description ?? "",
    kind,
    schedule: input.schedule,
    xp: input.xp ?? 10,
    gems: kind === "core" ? 0 : (input.gems ?? 0), // only bonus habits award gems
    timed: input.timed ?? null,
    startDate,
  });
  return toPublicHabit(habit);
}

export async function updateHabit(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
  input: UpdateHabitInput,
): Promise<PublicHabit> {
  await connectDB();
  const habit = await findOwnedHabit(userId, habitId);

  if (input.name !== undefined) habit.name = input.name;
  if (input.icon !== undefined) habit.icon = input.icon;
  if (input.category !== undefined) habit.category = input.category;
  if (input.description !== undefined) habit.description = input.description;
  if (input.schedule !== undefined) habit.schedule = input.schedule;
  if (input.xp !== undefined) habit.xp = input.xp;
  if (input.timed !== undefined) habit.timed = input.timed;

  // Rule: core habits never award gems, whichever field changed.
  const kind = input.kind ?? habit.kind;
  habit.kind = kind;
  habit.gems = kind === "core" ? 0 : (input.gems ?? habit.gems);

  await habit.save(); // schema validators run here
  return toPublicHabit(habit);
}

export async function setArchived(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
  archived: boolean,
): Promise<PublicHabit> {
  await connectDB();
  const habit = await findOwnedHabit(userId, habitId);

  if (archived && !habit.archivedAt) habit.archivedAt = new Date();
  if (!archived) habit.archivedAt = null;

  await habit.save();
  return toPublicHabit(habit);
}

// Removes the habit and its per-day helper records. Completions are kept on
// purpose: they hold the habit name and reward snapshot, so history, XP and
// gems stay consistent.
export async function deleteHabit(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
): Promise<void> {
  await connectDB();
  const deleted = await Habit.findOneAndDelete({ _id: habitId, userId });
  if (!deleted) throw new AppError("NOT_FOUND");

  await Promise.all([
    TimeLog.deleteMany({ userId, habitId }),
    FreezeDecision.deleteMany({ userId, habitId }),
  ]);
}

export async function addExemptDate(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
  date: string,
): Promise<PublicHabit> {
  await connectDB();
  const habit = await findOwnedHabit(userId, habitId);

  if (date < habit.startDate) {
    throw new AppError("VALIDATION_FAILED", {
      date: "This date is before the habit started.",
    });
  }
  const latest = addDays(todayKey(await getUserTimeZone(userId)), 366);
  if (date > latest) {
    throw new AppError("VALIDATION_FAILED", {
      date: "This date is too far in the future.",
    });
  }
  if (
    !habit.exemptDates.includes(date) &&
    habit.exemptDates.length >= LIMITS.maxExemptDates
  ) {
    throw new AppError("LIMIT_REACHED");
  }

  // $addToSet makes repeating the request harmless.
  const updated = await Habit.findOneAndUpdate(
    { _id: habitId, userId },
    { $addToSet: { exemptDates: date } },
    { new: true },
  );
  if (!updated) throw new AppError("NOT_FOUND");
  return toPublicHabit(updated);
}

export async function removeExemptDate(
  userId: Types.ObjectId,
  habitId: Types.ObjectId,
  date: string,
): Promise<PublicHabit> {
  await connectDB();
  const updated = await Habit.findOneAndUpdate(
    { _id: habitId, userId },
    { $pull: { exemptDates: date } },
    { new: true },
  );
  if (!updated) throw new AppError("NOT_FOUND");
  return toPublicHabit(updated);
}