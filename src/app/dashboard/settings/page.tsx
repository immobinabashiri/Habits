import { Types } from "mongoose";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";
import { authOptions } from "@/lib/auth/auth";
import { AppError } from "@/lib/errors";
import { getSettings } from "@/lib/services/settings";
import type { SettingsData } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) redirect("/login");

  let settings: SettingsData;
  try {
    settings = await getSettings(new Types.ObjectId(id));
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") redirect("/login");
    throw error;
  }

  // Computed here (not in the browser) so the server render and hydration agree.
  // "UTC" is not part of the platform list, and the saved zone must always be selectable.
  const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  const timezones = [...new Set(["UTC", settings.timezone, ...supported])].sort();

  return (
    <SettingsView
      settings={settings}
      timezones={timezones}
      // Google accounts have no password of their own. Sessions from before this
      // flag existed have no provider and keep the form (the server still checks).
      canChangePassword={session?.user?.provider !== "google"}
    />
  );
}
