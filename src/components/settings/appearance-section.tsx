"use client";

import { useSyncExternalStore } from "react";
import { SettingsCard } from "@/components/settings/settings-card";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getReduceMotion, setReduceMotion, subscribeTheme } from "@/lib/theme";

// Both choices are kept on THIS device (browser storage), so the page can be drawn
// correctly from the first paint, before any request to the server.
export function AppearanceSection() {
  // Server snapshot is "off"; the client re-reads the real value after hydration.
  const reduce = useSyncExternalStore(subscribeTheme, getReduceMotion, () => false);

  return (
    <SettingsCard
      id="appearance"
      title="Appearance"
      description="These two choices are saved on this device only."
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">Theme</p>
          <ThemeToggle />
        </div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={reduce}
            onChange={(event) => setReduceMotion(event.target.checked)}
            className="mt-0.5 size-5 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">Reduce motion</span>
            <span className="block text-sm text-muted-foreground">
              Turns off animations and transitions. Already on if your system asks for it.
            </span>
          </span>
        </label>
      </div>
    </SettingsCard>
  );
}
