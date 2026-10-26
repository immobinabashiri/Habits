import { AppearanceSection } from "@/components/settings/appearance-section";
import { MilestonesSection } from "@/components/settings/milestones-section";
import { PasswordSection } from "@/components/settings/password-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { TimezoneSection } from "@/components/settings/timezone-section";
import type { SettingsData } from "@/lib/services/settings";

interface SettingsViewProps {
  settings: SettingsData;
  timezones: string[];
  canChangePassword: boolean; // false for accounts that sign in with Google
}

export function SettingsView({ settings, timezones, canChangePassword }: SettingsViewProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-muted-foreground">Make Gem Habits work the way you do.</p>

      <div className="mt-8 space-y-6">
        <ProfileSection name={settings.name} email={settings.email} />
        <TimezoneSection timezone={settings.timezone} options={timezones} />
        <MilestonesSection milestones={settings.milestones} />
        <AppearanceSection />
        {canChangePassword ? <PasswordSection /> : null}
      </div>
    </div>
  );
}
