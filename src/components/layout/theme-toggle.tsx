"use client";

import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme, THEMES, type Theme } from "@/lib/theme";

// Server snapshot is "system"; the client re-reads the real value after hydration.
function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, (): Theme => "system");
}

const OPTIONS: readonly { id: Theme; label: string; description: string }[] = [
  { id: "system", label: "System", description: "Follows your device" },
  ...THEMES,
];

// A tiny real rendering: data-theme makes everything inside use that theme's tokens,
// so a new theme gets a correct preview without any extra code.
function MiniPage({ theme, className = "" }: { theme: string; className?: string }) {
  return (
    <span data-theme={theme} className={`theme-preview ${className}`}>
      <span className="surface theme-preview-card">
        <span className="theme-preview-title">Aa</span>
        <span className="theme-preview-line" />
        <span className="theme-preview-button" />
      </span>
    </span>
  );
}

function Preview({ id }: { id: Theme }) {
  if (id !== "system") return <MiniPage theme={id} className="h-full w-full" />;
  return (
    <span className="grid h-full w-full grid-cols-2">
      <MiniPage theme="light" />
      <MiniPage theme="dark" />
    </span>
  );
}

// The full picker, on the Settings page. Native radio inputs give keyboard support.
export function ThemePicker() {
  const theme = useTheme();
  return (
    <fieldset>
      <legend className="sr-only">Theme</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ id, label, description }) => (
          <label key={id} className="group block cursor-pointer">
            <input
              type="radio"
              name="theme"
              value={id}
              checked={theme === id}
              onChange={() => setTheme(id)}
              className="peer sr-only"
            />
            <span className="block overflow-hidden rounded-lg border-2 border-border transition-colors group-hover:border-input peer-checked:border-primary peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
              <span className="block h-24">
                <Preview id={id} />
              </span>
              <span className="flex items-start justify-between gap-2 p-2.5">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
                {theme === id ? <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ThemeMenuProps {
  placement?: "above" | "below";
  buttonClassName: string;
  labelClassName?: string;
}

// Quick switching from the navbar and the sidebar.
export function ThemeMenu({ placement = "below", buttonClassName, labelClassName = "sr-only" }: ThemeMenuProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title="Theme"
        className={buttonClassName}
      >
        <Palette className="size-5 shrink-0" aria-hidden="true" />
        <span className={labelClassName}>Theme</span>
      </button>

      {open ? (
        <fieldset
          className={`popover absolute z-50 w-56 space-y-0.5 p-1.5 ${
            placement === "above" ? "bottom-full left-0 mb-2 origin-bottom-left" : "right-0 top-full mt-2 origin-top-right"
          }`}
        >
          <legend className="sr-only">Theme</legend>
          {OPTIONS.map(({ id, label }) => (
            <label
              key={id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-muted has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring"
            >
              <input
                type="radio"
                name="theme-menu"
                value={id}
                checked={theme === id}
                onChange={() => setTheme(id)}
                className="sr-only"
              />
              <span aria-hidden="true" className="size-6 shrink-0 overflow-hidden rounded-full border border-border">
                <Preview id={id} />
              </span>
              <span className="flex-1">{label}</span>
              {theme === id ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
            </label>
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}
