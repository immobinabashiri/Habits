"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggle() {
  // Server snapshot is "system"; the client re-reads the real value after hydration.
  const theme = useSyncExternalStore(
    subscribeTheme,
    getTheme,
    (): Theme => "system",
  );

  return (
    <div
      role="group"
      aria-label="Theme"
      className="glass inline-flex rounded-full p-1"
    >
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            theme === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}