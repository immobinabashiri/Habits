import "server-only";
import { model, models, Schema } from "mongoose";
import type { Model } from "mongoose";
import {
  CALENDAR_CATEGORIES,
  CALENDAR_ITEM_TYPES,
  CALENDAR_PRIORITIES,
  isValidTime,
  RECURRENCE_FREQS,
  REMINDER_OPTIONS,
} from "@/lib/domain/calendar";
import { CALENDAR_LIMITS } from "@/lib/domain/defaults";
import { dateKey, isInteger, ownerField } from "@/lib/db/schema-helpers";
import type {
  CalendarItemRecord,
  PlanTemplateEntry,
  PlanTemplateRecord,
  Recurrence,
  WeekPlanRecord,
  WeekPriority,
} from "@/types/calendar";

// The Zod schemas in lib/validation/calendar.ts are the real gate. These repeat the
// core constraints as a last line of defence.

const time = {
  type: String,
  default: null,
  validate: { validator: (v: string | null) => v === null || isValidTime(v), message: "{PATH} must be HH:MM" },
};
const weekday = { type: Number, min: 0, max: 6, validate: isInteger };
const reminder = {
  type: Number,
  default: null,
  validate: {
    validator: (v: number | null) => v === null || (REMINDER_OPTIONS as readonly number[]).includes(v),
    message: "{PATH} is not a reminder option",
  },
};
// Mongoose runs custom validators on null too, so an optional date says so.
const optionalDateKey = {
  validator: (v: string | null) => v === null || dateKey.validator(v),
  message: dateKey.message,
};
const dateList = {
  type: [{ type: String, validate: dateKey }],
  default: [],
  validate: {
    validator: (v: string[]) => v.length <= CALENDAR_LIMITS.maxItemDates,
    message: "Too many dates",
  },
};

const recurrenceSchema = new Schema<Recurrence>(
  {
    freq: { type: String, enum: RECURRENCE_FREQS, required: true },
    interval: { type: Number, default: 1, min: 1, max: CALENDAR_LIMITS.maxInterval, validate: isInteger },
    days: { type: [weekday], default: [] },
    until: { type: String, default: null, validate: optionalDateKey },
  },
  { _id: false },
);

const calendarItemSchema = new Schema<CalendarItemRecord>(
  {
    userId: ownerField,
    type: { type: String, enum: CALENDAR_ITEM_TYPES, required: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: CALENDAR_LIMITS.maxTitle },
    notes: { type: String, trim: true, maxlength: CALENDAR_LIMITS.maxNotes, default: "" },
    category: { type: String, enum: CALENDAR_CATEGORIES, default: "personal" },
    priority: { type: String, enum: CALENDAR_PRIORITIES, default: "normal" },
    date: { type: String, required: true, validate: dateKey },
    allDay: { type: Boolean, default: true },
    startTime: time,
    endTime: time,
    recurrence: { type: recurrenceSchema, default: null },
    reminderMinutes: reminder,
    completedDates: dateList,
    skippedDates: dateList,
    templateId: { type: Schema.Types.ObjectId, ref: "PlanTemplate", default: null },
  },
  { timestamps: true },
);

// Every calendar read is "this user's items up to a date".
calendarItemSchema.index({ userId: 1, date: 1 });

const prioritySchema = new Schema<WeekPriority>(
  {
    id: { type: String, required: true, maxlength: 40 },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: CALENDAR_LIMITS.maxPriorityText },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const weekPlanSchema = new Schema<WeekPlanRecord>(
  {
    userId: ownerField,
    weekStart: { type: String, required: true, validate: dateKey },
    priorities: {
      type: [prioritySchema],
      default: [],
      validate: {
        validator: (v: WeekPriority[]) => v.length <= CALENDAR_LIMITS.maxPriorities,
        message: "Too many priorities",
      },
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

// One plan per user per week; the upsert relies on it.
weekPlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

const templateEntrySchema = new Schema<PlanTemplateEntry>(
  {
    weekday: { ...weekday, required: true },
    type: { type: String, enum: ["event", "task", "reminder"], required: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: CALENDAR_LIMITS.maxTitle },
    category: { type: String, enum: CALENDAR_CATEGORIES, default: "personal" },
    priority: { type: String, enum: CALENDAR_PRIORITIES, default: "normal" },
    allDay: { type: Boolean, default: true },
    startTime: time,
    endTime: time,
    reminderMinutes: reminder,
  },
  { _id: false },
);

const planTemplateSchema = new Schema<PlanTemplateRecord>(
  {
    userId: ownerField,
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: CALENDAR_LIMITS.maxTemplateName },
    entries: {
      type: [templateEntrySchema],
      default: [],
      validate: {
        validator: (v: PlanTemplateEntry[]) => v.length >= 1 && v.length <= CALENDAR_LIMITS.maxTemplateEntries,
        message: "A template needs between 1 and 60 entries",
      },
    },
  },
  { timestamps: true },
);

planTemplateSchema.index({ userId: 1, createdAt: 1 });

export const CalendarItem: Model<CalendarItemRecord> =
  (models.CalendarItem as Model<CalendarItemRecord> | undefined) ??
  model<CalendarItemRecord>("CalendarItem", calendarItemSchema);

export const WeekPlan: Model<WeekPlanRecord> =
  (models.WeekPlan as Model<WeekPlanRecord> | undefined) ??
  model<WeekPlanRecord>("WeekPlan", weekPlanSchema);

export const PlanTemplate: Model<PlanTemplateRecord> =
  (models.PlanTemplate as Model<PlanTemplateRecord> | undefined) ??
  model<PlanTemplateRecord>("PlanTemplate", planTemplateSchema);
