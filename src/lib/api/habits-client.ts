import { ApiClientError, jsonInit, request, toApiError } from "@/lib/api/client";
import type { CreateHabitInput, UpdateHabitInput } from "@/lib/validation/habit";
import type { PublicHabit } from "@/types/habits";

// Components import these from here, as before.
export { ApiClientError, toApiError };

const habitUrl = (id: string) => `/api/habits/${encodeURIComponent(id)}`;

// POST /api/habits
export async function createHabitRequest(input: CreateHabitInput): Promise<PublicHabit> {
  const data = await request<{ habit: PublicHabit }>("/api/habits", jsonInit("POST", input));
  return data.habit;
}

// PATCH /api/habits/:id
export async function updateHabitRequest(id: string, input: UpdateHabitInput): Promise<PublicHabit> {
  const data = await request<{ habit: PublicHabit }>(habitUrl(id), jsonInit("PATCH", input));
  return data.habit;
}

// PATCH /api/habits/:id/archive
export async function setArchivedRequest(id: string, archived: boolean): Promise<PublicHabit> {
  const data = await request<{ habit: PublicHabit }>(
    `${habitUrl(id)}/archive`,
    jsonInit("PATCH", { archived }),
  );
  return data.habit;
}

// DELETE /api/habits/:id   (permanent)
export async function deleteHabitRequest(id: string): Promise<void> {
  await request<void>(habitUrl(id), { method: "DELETE" });
}

// POST /api/habits/:id/exempt
export async function addExemptDateRequest(id: string, date: string): Promise<PublicHabit> {
  const data = await request<{ habit: PublicHabit }>(
    `${habitUrl(id)}/exempt`,
    jsonInit("POST", { date }),
  );
  return data.habit;
}

// DELETE /api/habits/:id/exempt?date=YYYY-MM-DD
export async function removeExemptDateRequest(id: string, date: string): Promise<PublicHabit> {
  const data = await request<{ habit: PublicHabit }>(
    `${habitUrl(id)}/exempt?date=${encodeURIComponent(date)}`,
    { method: "DELETE" },
  );
  return data.habit;
}
