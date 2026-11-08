import { AppearanceSection } from "@/components/settings/appearance-section";
import { MilestonesSection } from "@/components/settings/milestones-section";
import { PasswordSection } from "@/components/settings/password-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { TelegramSection } from "@/components/settings/telegram-section";
import { TimezoneSection } from "@/components/settings/timezone-section";
import type { SettingsData } from "@/lib/services/settings";
import type { TelegramStatus } from "@/types/notifications";

interface SettingsViewProps {
  settings: SettingsData;
  timezones: string[];
  canChangePassword: boolean; // false for accounts that sign in with Google
  telegram: TelegramStatus;
}

export function SettingsView({ settings, timezones, canChangePassword, telegram }: SettingsViewProps) {
  return (
    <div className="page page-narrow">
      <h1 className="type-h1">Settings</h1>
      <p className="mt-1 text-muted-foreground">Make Dayfacet work the way you do.</p>

      <div className="mt-8 space-y-6">
        <ProfileSection name={settings.name} email={settings.email} />
        <TimezoneSection timezone={settings.timezone} options={timezones} />
        <TelegramSection initial={telegram} />
        <MilestonesSection milestones={settings.milestones} />
        <AppearanceSection />
        {canChangePassword ? <PasswordSection /> : null}
      </div>
    </div>
  );
}
