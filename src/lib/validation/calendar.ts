import { z } from "zod";
import {
  CALENDAR_CATEGORIES,
  CALENDAR_ITEM_TYPES,
  CALENDAR_PRIORITIES,
  CALENDAR_VIEWS,
  isValidTime,
  RECURRENCE_FREQS,
  REMINDER_OPTIONS,
  timeToMinutes,
} from "@/lib/domain/calendar";
import { weekdayOf } from "@/lib/domain/dates";
import { CALENDAR_LIMITS } from "@/lib/domain/defaults";
import { dateKeySchema } from "@/lib/validation/common";
import type { Weekday } from "@/types/common";

const title = z
  .string()
  .trim()
  .min(1, "Enter a title.")
  .max(CALENDAR_LIMITS.maxTitle, `Title must be at most ${CALENDAR_LIMITS.maxTitle} characters.`);
const time = z.string().refine(isValidTime, "Use a time like 09:30.");
const weekday = z
  .number()
  .int()
  .min(0)
  .max(6)
  .transform((v) => v as Weekday);
const reminderMinutes = z
  .number()
  .refine((v) => (REMINDER_OPTIONS as readonly number[]).includes(v), "Pick one of the reminder options.")
  .nullable();

const recurrenceSchema = z.object({
  freq: z.enum(RECURRENCE_FREQS),
  interval: z
    .number("Enter how often it repeats.")
    .int("Use a whole number.")
    .min(1, "Repeat at least every 1.")
    .max(CALENDAR_LIMITS.maxInterval, `At most every ${CALENDAR_LIMITS.maxInterval}.`)
    .default(1),
  days: z
    .array(weekday)
    .max(7)
    .refine((days) => new Set(days).size === days.length, "Days must be unique.")
    .default([]),
  until: dateKeySchema.nullable().default(null),
});

// Every editable field. Create needs the required ones; an update sends any subset,
// is merged over the stored item, and the merged result is checked with the same rules.
const itemFields = {
  type: z.enum(CALENDAR_ITEM_TYPES),
  title,
  notes: z.string().trim().max(CALENDAR_LIMITS.maxNotes, "Notes are too long.").default(""),
  category: z.enum(CALENDAR_CATEGORIES).default("personal"),
  priority: z.enum(CALENDAR_PRIORITIES).default("normal"),
  date: dateKeySchema,
  allDay: z.boolean().default(true),
  startTime: time.nullable().default(null),
  endTime: time.nullable().default(null),
  recurrence: recurrenceSchema.nullable().default(null),
  reminderMinutes: reminderMinutes.default(null),
};

// Rules between fields, and the small clean-ups that keep stored items consistent.
export const calendarItemSchema = z
  .object(itemFields)
  .transform((item) => {
    // Notes and milestones belong to a day, not a time.
    const allDay = item.type === "note" || item.type === "milestone" ? true : item.allDay;
    const recurrence = item.recurrence
      ? {
          ...item.recurrence,
          // A weekly series with no days picked repeats on its own weekday.
          days:
            item.recurrence.freq !== "weekly"
              ? []
              : item.recurrence.days.length > 0
                ? [...item.recurrence.days].sort((a, b) => a - b)
                : [weekdayOf(item.date)],
        }
      : null;
    return {
      ...item,
      allDay,
      startTime: allDay ? null : item.startTime,
      endTime: allDay ? null : item.endTime,
      recurrence,
      // A reminder item reminds you by default; that is its whole point.
      reminderMinutes: item.type === "reminder" && item.reminderMinutes === null ? 0 : item.reminderMinutes,
    };
  })
  .superRefine((item, ctx) => {
    if (!item.allDay && !item.startTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Pick a start time, or make it all day." });
    }
    if (item.startTime && item.endTime && timeToMinutes(item.endTime) <= timeToMinutes(item.startTime)) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "End time must be after the start." });
    }
    if (item.recurrence?.until && item.recurrence.until < item.date) {
      ctx.addIssue({ code: "custom", path: ["recurrence", "until"], message: "The last day can't be before the first." });
    }
  });

export const createCalendarItemSchema = calendarItemSchema;

export const updateCalendarItemSchema = z
  .object({
    type: itemFields.type.optional(),
    title: title.optional(),
    notes: z.string().trim().max(CALENDAR_LIMITS.maxNotes, "Notes are too long.").optional(),
    category: z.enum(CALENDAR_CATEGORIES).optional(),
    priority: z.enum(CALENDAR_PRIORITIES).optional(),
    date: dateKeySchema.optional(),
    allDay: z.boolean().optional(),
    startTime: time.nullable().optional(),
    endTime: time.nullable().optional(),
    recurrence: recurrenceSchema.nullable().optional(),
    reminderMinutes: reminderMinutes.optional(),
    // Set when changing ONE day of a repeating series: that day is taken out of the
    // series and saved as its own item with these changes.
    occurrenceDate: dateKeySchema.optional(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "occurrenceDate"),
    "Send at least one field to change.",
  );

export const occurrenceDateSchema = z.object({ date: dateKeySchema });

export const deleteCalendarItemQuerySchema = z.object({
  // Present = remove only that day of a repeating series.
  date: dateKeySchema.optional(),
});

export const weekPlanSchema = z.object({
  priorities: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9-]{1,40}$/, "Invalid id."),
        text: z
          .string()
          .trim()
          .min(1, "Write the priority.")
          .max(CALENDAR_LIMITS.maxPriorityText, `At most ${CALENDAR_LIMITS.maxPriorityText} characters.`),
        done: z.boolean().default(false),
      }),
    )
    .max(CALENDAR_LIMITS.maxPriorities, `Keep it to ${CALENDAR_LIMITS.maxPriorities} priorities.`)
    .refine((list) => new Set(list.map((p) => p.id)).size === list.length, "Priorities must be unique."),
});

const templateName = z
  .string()
  .trim()
  .min(1, "Name the template.")
  .max(CALENDAR_LIMITS.maxTemplateName, `Name must be at most ${CALENDAR_LIMITS.maxTemplateName} characters.`);

// A template is made from a real week, so the browser only names the week.
export const createTemplateSchema = z.object({ name: templateName, weekStart: dateKeySchema });
export const renameTemplateSchema = z.object({ name: templateName });
export const applyTemplateSchema = z.object({ weekStart: dateKeySchema });

// The page URL: ?view=week&date=2026-11-06. Anything unknown falls back.
export const calendarQuerySchema = z.object({
  view: z.enum(CALENDAR_VIEWS).catch("month"),
  date: dateKeySchema.optional().catch(undefined),
});

export type CalendarItemInput = z.infer<typeof calendarItemSchema>;
export type CreateCalendarItemInput = z.input<typeof calendarItemSchema>;
export type UpdateCalendarItemInput = z.infer<typeof updateCalendarItemSchema>;
export type WeekPlanInput = z.infer<typeof weekPlanSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

