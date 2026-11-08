import { jsonInit, request } from "@/lib/api/client";
import type { NotificationPrefsInput } from "@/lib/validation/notifications";
import type { MilestonesInput, PasswordInput, ProfileInput } from "@/lib/validation/settings";
import type { TelegramLinkStart, TelegramNotificationPrefs, TelegramStatus } from "@/types/notifications";
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

// GET /api/user/telegram
export async function getTelegramStatusRequest(): Promise<TelegramStatus> {
  return (await request<{ telegram: TelegramStatus }>("/api/user/telegram")).telegram;
}

// POST /api/user/telegram/link   a fresh single-use deep link
export async function startTelegramLinkRequest(): Promise<TelegramLinkStart> {
  return (await request<{ link: TelegramLinkStart }>("/api/user/telegram/link", { method: "POST" })).link;
}

// DELETE /api/user/telegram
export async function disconnectTelegramRequest(): Promise<TelegramStatus> {
  return (await request<{ telegram: TelegramStatus }>("/api/user/telegram", { method: "DELETE" })).telegram;
}

// PUT /api/user/notifications
export async function saveNotificationPrefsRequest(input: NotificationPrefsInput): Promise<TelegramNotificationPrefs> {
  return (await request<{ prefs: TelegramNotificationPrefs }>("/api/user/notifications", jsonInit("PUT", input))).prefs;
}
