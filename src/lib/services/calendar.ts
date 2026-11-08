import "server-only";
import type { HydratedDocument, Types } from "mongoose";
import { CalendarItem, PlanTemplate, WeekPlan } from "@/lib/db/models/calendar";
import { Completion, FreezeDecision } from "@/lib/db/models/completion";
import { Habit } from "@/lib/db/models/habit";
import { User } from "@/lib/db/models/user";
import {
  dateInWeek,
  isCompletable,
  LOOKAHEAD_DAYS,
  occursBetween,
  occursOn,
  rangeFor,
  templateEntriesFromWeek,
  templateEntryKey,
  weekDays,
  weekStartOf,
} from "@/lib/domain/calendar";
import { addDays, todayKey } from "@/lib/domain/dates";
import { CALENDAR_LIMITS, LIMITS } from "@/lib/domain/defaults";
import { applyOrder } from "@/lib/domain/habit-order";
import { dayStatus } from "@/lib/domain/streaks";
import type { FreezeChoice } from "@/lib/domain/streaks";
import { AppError } from "@/lib/errors";
import { calendarItemSchema } from "@/lib/validation/calendar";
import type {
  CalendarItemInput,
  CreateTemplateInput,
  UpdateCalendarItemInput,
  WeekPlanInput,
} from "@/lib/validation/calendar";
import { parseOrThrow } from "@/lib/validation/parse";
import { connectDB } from "@/utils/connectDB";
import type {
  ApplyTemplateResult,
  CalendarData,
  CalendarHabit,
  CalendarHabitDay,
  CalendarItemRecord,
  CalendarView,
  OccurrenceMoveResult,
  PlanTemplateRecord,
  PublicCalendarItem,
  PublicPlanTemplate,
  PublicWeekPlan,
} from "@/types/calendar";
import type { DateKey } from "@/types/common";

type ItemDoc = HydratedDocument<CalendarItemRecord>;

export function toPublicCalendarItem(item: ItemDoc): PublicCalendarItem {
  return {
    id: item._id.toString(),
    type: item.type,
    title: item.title,
    notes: item.notes,
    category: item.category,
    priority: item.priority,
    date: item.date,
    allDay: item.allDay,
    startTime: item.startTime,
    endTime: item.endTime,
    recurrence: item.recurrence
      ? {
          freq: item.recurrence.freq,
          interval: item.recurrence.interval,
          days: [...item.recurrence.days],
          until: item.recurrence.until,
        }
      : null,
    reminderMinutes: item.reminderMinutes,
    completedDates: [...item.completedDates].sort(),
    skippedDates: [...item.skippedDates].sort(),
    templateId: item.templateId ? item.templateId.toString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function toPublicTemplate(template: HydratedDocument<PlanTemplateRecord>): PublicPlanTemplate {
  return {
    id: template._id.toString(),
    name: template.name,
    entries: template.entries.map((entry) => ({
      weekday: entry.weekday,
      type: entry.type,
      title: entry.title,
      category: entry.category,
      priority: entry.priority,
      allDay: entry.allDay,
      startTime: entry.startTime,
      endTime: entry.endTime,
      reminderMinutes: entry.reminderMinutes,
    })),
    createdAt: template.createdAt.toISOString(),
  };
}

// The stored fields of an item, in the shape the validation schema accepts, so an
// update can be merged over them and checked with the very same rules as a create.
function editableFields(doc: ItemDoc) {
  const item = toPublicCalendarItem(doc);
  return {
    type: item.type,
    title: item.title,
    notes: item.notes,
    category: item.category,
    priority: item.priority,
    date: item.date,
    allDay: item.allDay,
    startTime: item.startTime,
    endTime: item.endTime,
    recurrence: item.recurrence,
    reminderMinutes: item.reminderMinutes,
  };
}

// A record that belongs to someone else behaves exactly like one that does not exist.
async function findOwnedItem(userId: Types.ObjectId, itemId: Types.ObjectId): Promise<ItemDoc> {
  const item = await CalendarItem.findOne({ _id: itemId, userId });
  if (!item) throw new AppError("NOT_FOUND");
  return item;
}

async function getUserContext(userId: Types.ObjectId) {
  const user = await User.findById(userId).select("settings.timezone habitOrder");
  if (!user) throw new AppError("UNAUTHENTICATED");
  return { timezone: user.settings.timezone, habitOrder: user.habitOrder.map(String) };
}

async function assertRoomFor(userId: Types.ObjectId, count: number) {
  const existing = await CalendarItem.countDocuments({ userId });
  if (existing + count > CALENDAR_LIMITS.maxItems) throw new AppError("LIMIT_REACHED");
}

// Years far outside any real plan only produce empty grids; send them back to today.
function sensibleAnchor(anchor: DateKey | undefined, today: DateKey): DateKey {
  if (!anchor || anchor < "1970-01-01" || anchor > "2199-12-31") return today;
  return anchor;
}

interface HabitDayRow {
  habitId: Types.ObjectId;
  date: DateKey;
}
interface DecisionRow extends HabitDayRow {
  decision: FreezeChoice;
}

// Everything the calendar page needs for one view, in one round trip.
export async function getCalendarData(
  userId: Types.ObjectId,
  view: CalendarView,
  requestedAnchor: DateKey | undefined,
): Promise<CalendarData> {
  await connectDB();
  const { timezone, habitOrder } = await getUserContext(userId);
  const today = todayKey(timezone);
  const anchor = sensibleAnchor(requestedAnchor, today);
  const { from, to } = rangeFor(view, anchor);
  // The overview (reminders, what's next) always covers today and the next week,
  // whatever range is on screen.
  const aheadTo = addDays(today, LOOKAHEAD_DAYS);
  const windows: [DateKey, DateKey][] = [
    [from, to],
    [today, aheadTo],
  ];
  const earliest = from < today ? from : today;
  const latest = to > aheadTo ? to : aheadTo;
  const weekStart = weekStartOf(anchor);

  const [candidates, overdue, habitDocs, completions, decisions, plan, templates] = await Promise.all([
    CalendarItem.find({
      userId,
      date: { $lte: latest },
      $or: [
        { recurrence: null, $or: windows.map(([a, b]) => ({ date: { $gte: a, $lte: b } })) },
        { recurrence: { $ne: null }, "recurrence.until": null },
        { recurrence: { $ne: null }, "recurrence.until": { $gte: earliest } },
      ],
    }).limit(CALENDAR_LIMITS.maxItems),
    // Unfinished single tasks and goals from before today.
    CalendarItem.find({
      userId,
      recurrence: null,
      type: { $in: ["task", "milestone"] },
      date: { $lt: today },
      completedDates: { $size: 0 },
    })
      .sort({ date: -1 })
      .limit(CALENDAR_LIMITS.maxOverdue),
    Habit.find({ userId, archivedAt: null }).sort({ createdAt: 1 }).limit(LIMITS.maxHabits),
    Completion.find({
      userId,
      reversedAt: null,
      $or: windows.map(([a, b]) => ({ date: { $gte: a, $lte: b } })),
    })
      .select("habitId date")
      .lean<HabitDayRow[]>(),
    FreezeDecision.find({ userId, $or: windows.map(([a, b]) => ({ date: { $gte: a, $lte: b } })) })
      .select("habitId date decision")
      .lean<DecisionRow[]>(),
    WeekPlan.findOne({ userId, weekStart }),
    PlanTemplate.find({ userId }).sort({ createdAt: 1 }).limit(CALENDAR_LIMITS.maxTemplates),
  ]);

  const byId = new Map<string, PublicCalendarItem>();
  for (const doc of candidates) {
    const item = toPublicCalendarItem(doc);
    if (windows.some(([a, b]) => occursBetween(item, a, b))) byId.set(item.id, item);
  }
  for (const doc of overdue) byId.set(doc._id.toString(), toPublicCalendarItem(doc));

  // Habits come from the habit system as they are: same schedule, same exempt days,
  // same completions and the same day rule the Streaks page uses.
  const done = new Map<string, Set<DateKey>>();
  for (const row of completions) {
    const key = row.habitId.toString();
    done.set(key, (done.get(key) ?? new Set()).add(row.date));
  }
  const decided = new Map<string, Map<DateKey, FreezeChoice>>();
  for (const row of decisions) {
    const key = row.habitId.toString();
    decided.set(key, (decided.get(key) ?? new Map()).set(row.date, row.decision));
  }

  const days = new Set<DateKey>();
  for (const [a, b] of windows) {
    for (let offset = 0; ; offset += 1) {
      const day = addDays(a, offset);
      if (day > b) break;
      days.add(day);
    }
  }

  const ordered = applyOrder(habitDocs, habitOrder, (doc) => doc._id.toString());
  const habits: CalendarHabit[] = [];
  const habitDays: CalendarHabitDay[] = [];
  for (const doc of ordered) {
    const id = doc._id.toString();
    habits.push({ id, name: doc.name, icon: doc.icon, timed: doc.timed !== null });
    const spec = { startDate: doc.startDate, days: doc.schedule.days, exemptDates: doc.exemptDates };
    const completed = done.get(id) ?? new Set<DateKey>();
    const choices = decided.get(id) ?? new Map<DateKey, FreezeChoice>();
    for (const day of [...days].sort()) {
      const status = dayStatus(spec, completed, choices, day, today);
      if (status === "off") continue;
      // dayStatus only knows the past and today; a later scheduled day is upcoming.
      habitDays.push({ habitId: id, date: day, status: day > today && status !== "exempt" ? "upcoming" : status });
    }
  }

  return {
    view,
    anchor,
    from,
    to,
    today,
    timezone,
    items: [...byId.values()],
    habits,
    habitDays,
    weekPlan: {
      weekStart,
      priorities: plan ? plan.priorities.map((p) => ({ id: p.id, text: p.text, done: p.done })) : [],
    },
    templates: templates.map(toPublicTemplate),
  };
}

export async function createCalendarItem(
  userId: Types.ObjectId,
  input: CalendarItemInput,
): Promise<PublicCalendarItem> {
  await connectDB();
  await assertRoomFor(userId, 1);
  const item = await CalendarItem.create({ ...input, userId });
  return toPublicCalendarItem(item);
}

// Changes a single item or a whole series. With `occurrenceDate` on a series, only
// that day changes: it is taken out of the series and saved as its own item.
export async function updateCalendarItem(
  userId: Types.ObjectId,
  itemId: Types.ObjectId,
  input: UpdateCalendarItemInput,
): Promise<OccurrenceMoveResult> {
  await connectDB();
  const item = await findOwnedItem(userId, itemId);
  const { occurrenceDate, ...changes } = input;

  if (occurrenceDate && item.recurrence) {
    if (!occursOn(toPublicCalendarItem(item), occurrenceDate)) {
      throw new AppError("VALIDATION_FAILED", { occurrenceDate: "This item doesn't happen on that day." });
    }
    const single = parseOrThrow(calendarItemSchema, {
      ...editableFields(item),
      date: occurrenceDate,
      ...changes,
      recurrence: null, // the detached day never repeats
    });
    await assertRoomFor(userId, 1);
    const wasDone = item.completedDates.includes(occurrenceDate);
    const created = await CalendarItem.create({
      ...single,
      userId,
      completedDates: wasDone ? [single.date] : [],
    });
    const series = await CalendarItem.findOneAndUpdate(
      { _id: itemId, userId },
      { $addToSet: { skippedDates: occurrenceDate }, $pull: { completedDates: occurrenceDate } },
      { new: true },
    );
    if (!series) throw new AppError("NOT_FOUND");
    return { item: toPublicCalendarItem(series), occurrence: toPublicCalendarItem(created) };
  }

  const merged = parseOrThrow(calendarItemSchema, { ...editableFields(item), ...changes });
  // A single item that moves to another day keeps its check mark.
  if (!item.recurrence && !merged.recurrence && merged.date !== item.date) {
    item.completedDates = item.completedDates.includes(item.date) ? [merged.date] : [];
  }
  item.set(merged);
  await item.save();
  return { item: toPublicCalendarItem(item), occurrence: null };
}

// With `date` on a series: removes only that day. Otherwise deletes the item.
// Returns the series that remains, or null when the item is gone.
export async function deleteCalendarItem(
  userId: Types.ObjectId,
  itemId: Types.ObjectId,
  date: DateKey | undefined,
): Promise<PublicCalendarItem | null> {
  await connectDB();
  const item = await findOwnedItem(userId, itemId);
  if (date && item.recurrence) {
    if (item.skippedDates.length >= CALENDAR_LIMITS.maxItemDates) throw new AppError("LIMIT_REACHED");
    const series = await CalendarItem.findOneAndUpdate(
      { _id: itemId, userId },
      { $addToSet: { skippedDates: date }, $pull: { completedDates: date } },
      { new: true },
    );
    if (!series) throw new AppError("NOT_FOUND");
    return toPublicCalendarItem(series);
  }
  await CalendarItem.deleteOne({ _id: itemId, userId });
  return null;
}

// Checks off (or un-checks) one occurrence of a task, goal or workout.
export async function setItemCompletion(
  userId: Types.ObjectId,
  itemId: Types.ObjectId,
  date: DateKey,
  done: boolean,
): Promise<PublicCalendarItem> {
  await connectDB();
  const item = await findOwnedItem(userId, itemId);
  const current = toPublicCalendarItem(item);
  if (!isCompletable(current)) {
    throw new AppError("VALIDATION_FAILED", { form: "Only tasks, goals and workouts can be checked off." });
  }
  if (!occursOn(current, date)) {
    throw new AppError("VALIDATION_FAILED", { date: "This item doesn't happen on that day." });
  }
  if (done && item.completedDates.length >= CALENDAR_LIMITS.maxItemDates) throw new AppError("LIMIT_REACHED");
  const updated = await CalendarItem.findOneAndUpdate(
    { _id: itemId, userId },
    done ? { $addToSet: { completedDates: date } } : { $pull: { completedDates: date } },
    { new: true },
  );
  if (!updated) throw new AppError("NOT_FOUND");
  return toPublicCalendarItem(updated);
}

// ---- Weekly planning ----

export async function saveWeekPlan(
  userId: Types.ObjectId,
  weekStart: DateKey,
  input: WeekPlanInput,
): Promise<PublicWeekPlan> {
  await connectDB();
  const start = weekStartOf(weekStart); // any day of the week names that week
  // Upsert on the unique (userId, weekStart) index, so two saves never make two plans.
  const plan = await WeekPlan.findOneAndUpdate(
    { userId, weekStart: start },
    { $set: { priorities: input.priorities } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return { weekStart: start, priorities: plan.priorities.map((p) => ({ id: p.id, text: p.text, done: p.done })) };
}

// A template is a snapshot of a real week's single events, tasks and reminders.
export async function createTemplate(
  userId: Types.ObjectId,
  input: CreateTemplateInput,
): Promise<PublicPlanTemplate> {
  await connectDB();
  if ((await PlanTemplate.countDocuments({ userId })) >= CALENDAR_LIMITS.maxTemplates) {
    throw new AppError("LIMIT_REACHED");
  }
  const start = weekStartOf(input.weekStart);
  const days = weekDays(start);
  const docs = await CalendarItem.find({
    userId,
    recurrence: null,
    type: { $in: ["event", "task", "reminder"] },
    date: { $gte: days[0], $lte: days[6] },
  }).limit(CALENDAR_LIMITS.maxTemplateEntries);
  const entries = templateEntriesFromWeek(docs.map(toPublicCalendarItem), start);
  if (entries.length === 0) {
    throw new AppError("VALIDATION_FAILED", {
      form: "This week has no single events, tasks or reminders to save. Repeating items already come back every week.",
    });
  }
  const template = await PlanTemplate.create({ userId, name: input.name, entries });
  return toPublicTemplate(template);
}

export async function renameTemplate(
  userId: Types.ObjectId,
  templateId: Types.ObjectId,
  name: string,
): Promise<PublicPlanTemplate> {
  await connectDB();
  const template = await PlanTemplate.findOneAndUpdate(
    { _id: templateId, userId },
    { $set: { name } },
    { new: true, runValidators: true },
  );
  if (!template) throw new AppError("NOT_FOUND");
  return toPublicTemplate(template);
}

// Items already made from a template keep existing; they are ordinary items now.
export async function deleteTemplate(userId: Types.ObjectId, templateId: Types.ObjectId): Promise<void> {
  await connectDB();
  const result = await PlanTemplate.deleteOne({ _id: templateId, userId });
  if (result.deletedCount === 0) throw new AppError("NOT_FOUND");
}

// Copies a template into a week. Lines already on the calendar that week (same day,
// time and title) are skipped, so applying twice never doubles the week.
export async function applyTemplate(
  userId: Types.ObjectId,
  templateId: Types.ObjectId,
  weekStart: DateKey,
): Promise<ApplyTemplateResult> {
  await connectDB();
  const template = await PlanTemplate.findOne({ _id: templateId, userId });
  if (!template) throw new AppError("NOT_FOUND");
  const start = weekStartOf(weekStart);
  const days = weekDays(start);
  const existing = await CalendarItem.find({ userId, recurrence: null, date: { $gte: days[0], $lte: days[6] } })
    .select("title startTime date")
    .lean<{ title: string; startTime: string | null; date: DateKey }[]>();
  const taken = new Set(existing.map((item) => templateEntryKey(item, item.date)));

  const fresh = template.entries
    .map((entry) => ({ entry, date: dateInWeek(start, entry.weekday) }))
    .filter(({ entry, date }) => {
      const key = templateEntryKey(entry, date);
      if (taken.has(key)) return false;
      taken.add(key);
      return true;
    });
  if (fresh.length > 0) await assertRoomFor(userId, fresh.length);

  const created = fresh.length
    ? await CalendarItem.insertMany(
        fresh.map(({ entry, date }) => ({
          userId,
          type: entry.type,
          title: entry.title,
          notes: "",
          category: entry.category,
          priority: entry.priority,
          date,
          allDay: entry.allDay,
          startTime: entry.startTime,
          endTime: entry.endTime,
          recurrence: null,
          reminderMinutes: entry.reminderMinutes,
          templateId: template._id,
        })),
      )
    : [];
  return {
    created: created.map((doc) => toPublicCalendarItem(doc as unknown as ItemDoc)),
    skipped: template.entries.length - fresh.length,
  };
}
