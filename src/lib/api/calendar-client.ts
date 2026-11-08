import { jsonInit, request } from "@/lib/api/client";
import type { CreateCalendarItemInput, UpdateCalendarItemInput } from "@/lib/validation/calendar";
import type {
  ApplyTemplateResult,
  OccurrenceMoveResult,
  PublicCalendarItem,
  PublicPlanTemplate,
  PublicWeekPlan,
  WeekPriority,
} from "@/types/calendar";
import type { DateKey } from "@/types/common";

const itemUrl = (id: string) => `/api/calendar/items/${encodeURIComponent(id)}`;
const templateUrl = (id: string) => `/api/calendar/templates/${encodeURIComponent(id)}`;

// POST /api/calendar/items
export async function createCalendarItemRequest(input: CreateCalendarItemInput): Promise<PublicCalendarItem> {
  const data = await request<{ item: PublicCalendarItem }>("/api/calendar/items", jsonInit("POST", input));
  return data.item;
}

// PATCH /api/calendar/items/:id   (occurrenceDate = change only that day of a series)
export function updateCalendarItemRequest(id: string, input: UpdateCalendarItemInput): Promise<OccurrenceMoveResult> {
  return request<OccurrenceMoveResult>(itemUrl(id), jsonInit("PATCH", input));
}

// DELETE /api/calendar/items/:id[?date=]   returns the remaining series, or null
export async function deleteCalendarItemRequest(id: string, date?: DateKey): Promise<PublicCalendarItem | null> {
  const url = date ? `${itemUrl(id)}?date=${encodeURIComponent(date)}` : itemUrl(id);
  const data = await request<{ item: PublicCalendarItem } | undefined>(url, { method: "DELETE" });
  return data?.item ?? null;
}

// POST / DELETE /api/calendar/items/:id/completion
export async function setItemCompletionRequest(id: string, date: DateKey, done: boolean): Promise<PublicCalendarItem> {
  const url = `${itemUrl(id)}/completion`;
  const data = await request<{ item: PublicCalendarItem }>(
    done ? url : `${url}?date=${encodeURIComponent(date)}`,
    done ? jsonInit("POST", { date }) : { method: "DELETE" },
  );
  return data.item;
}

// PUT /api/calendar/week-plans/:weekStart
export async function saveWeekPlanRequest(weekStart: DateKey, priorities: WeekPriority[]): Promise<PublicWeekPlan> {
  const data = await request<{ weekPlan: PublicWeekPlan }>(
    `/api/calendar/week-plans/${encodeURIComponent(weekStart)}`,
    jsonInit("PUT", { priorities }),
  );
  return data.weekPlan;
}

// POST /api/calendar/templates
export async function createTemplateRequest(name: string, weekStart: DateKey): Promise<PublicPlanTemplate> {
  const data = await request<{ template: PublicPlanTemplate }>(
    "/api/calendar/templates",
    jsonInit("POST", { name, weekStart }),
  );
  return data.template;
}

// DELETE /api/calendar/templates/:id
export async function deleteTemplateRequest(id: string): Promise<void> {
  await request<void>(templateUrl(id), { method: "DELETE" });
}

// POST /api/calendar/templates/:id/apply
export function applyTemplateRequest(id: string, weekStart: DateKey): Promise<ApplyTemplateResult> {
  return request<ApplyTemplateResult>(`${templateUrl(id)}/apply`, jsonInit("POST", { weekStart }));
}
