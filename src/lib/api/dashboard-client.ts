import { jsonInit, request } from "@/lib/api/client";
import type { DateKey } from "@/types/common";
import type { DashboardMutation } from "@/types/dashboard";

const habitUrl = (id: string) => `/api/habits/${encodeURIComponent(id)}`;

// POST /api/habits/:id/completion   body: { minutes? }
export function completeHabitRequest(id: string, minutes?: number): Promise<DashboardMutation> {
  return request<DashboardMutation>(
    `${habitUrl(id)}/completion`,
    jsonInit("POST", minutes === undefined ? {} : { minutes }),
  );
}

// DELETE /api/habits/:id/completion   (undo today's completion)
export function undoCompletionRequest(id: string): Promise<DashboardMutation> {
  return request<DashboardMutation>(`${habitUrl(id)}/completion`, { method: "DELETE" });
}

// POST /api/habits/:id/freeze   body: { date, decision }
export function decideMissedDayRequest(
  id: string,
  date: DateKey,
  decision: "frozen" | "broken",
): Promise<DashboardMutation> {
  return request<DashboardMutation>(`${habitUrl(id)}/freeze`, jsonInit("POST", { date, decision }));
}

// POST /api/streak-freezes   body: { quantity }
export function buyStreakFreezesRequest(quantity: number): Promise<DashboardMutation> {
  return request<DashboardMutation>("/api/streak-freezes", jsonInit("POST", { quantity }));
}

// POST /api/user/seen-level
export async function acknowledgeLevelRequest(): Promise<void> {
  await request<{ ok: true }>("/api/user/seen-level", jsonInit("POST", {}));
}

// POST /api/user/timezone
export async function syncTimezoneRequest(timezone: string): Promise<void> {
  await request<{ ok: true }>("/api/user/timezone", jsonInit("POST", { timezone }));
}
