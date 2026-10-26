import { jsonInit, request } from "@/lib/api/client";
import type { MilestonesInput, PasswordInput, ProfileInput } from "@/lib/validation/settings";
import type { StreakMilestone } from "@/types/user";

// PATCH /api/user/profile
export async function updateProfileRequest(input: ProfileInput): Promise<string> {
  return (await request<{ name: string }>("/api/user/profile", jsonInit("PATCH", input))).name;
}

// PUT /api/user/milestones
export async function saveMilestonesRequest(input: MilestonesInput): Promise<StreakMilestone[]> {
  return (await request<{ milestones: StreakMilestone[] }>("/api/user/milestones", jsonInit("PUT", input)))
    .milestones;
}

// POST /api/user/password
export async function changePasswordRequest(input: PasswordInput): Promise<void> {
  await request<{ ok: true }>("/api/user/password", jsonInit("POST", input));
}
