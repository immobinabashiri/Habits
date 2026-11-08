// The theme registry. Everything else (the picker, the menu, the first-paint
// script) reads from this list. To add a theme: add one entry here and one CSS file
// in src/styles/themes/, imported from globals.css. Components need no changes.
export const THEMES = [
  { id: "light", label: "Light", description: "Warm cream glass" },
  { id: "dark", label: "Dark", description: "Soft night glass" },
  { id: "minimal", label: "Minimal", description: "Quiet and distraction-free" },
  { id: "organic", label: "Organic", description: "Flowing lagoon waves" },
  { id: "kawaii", label: "Kawaii", description: "Cute pastel charm" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type Theme = "system" | ThemeId; // "system" follows the device's light or dark setting

export const THEME_KEY = "theme";
export const MOTION_KEY = "reduce-motion"; // "1" = reduce motion on this device

const THEME_IDS: readonly string[] = THEMES.map((theme) => theme.id);
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Runs in <head> before first paint to avoid a flash of the wrong theme. It always
// sets a concrete data-theme: "system" is resolved to light or dark here, and again
// whenever the device setting changes.
export const themeInitScript = `(function(){var d=document.documentElement,q=matchMedia(${JSON.stringify(DARK_QUERY)}),v=${JSON.stringify(THEME_IDS)};function s(k){try{return localStorage.getItem(k)}catch(e){return null}}function a(){var t=s(${JSON.stringify(THEME_KEY)});d.dataset.theme=v.indexOf(t)>=0?t:q.matches?"dark":"light"}a();q.addEventListener("change",a);if(s(${JSON.stringify(MOTION_KEY)})==="1"){d.dataset.motion="reduce"}})();`;

const listeners = new Set<() => void>();

function isThemeId(value: string | null): value is ThemeId {
  return value !== null && THEME_IDS.includes(value);
}

export function getTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isThemeId(value) ? value : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? (matchMedia(DARK_QUERY).matches ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
}

export function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage unavailable (private mode, etc.): still apply for this session.
  }
  applyTheme(theme);
  listeners.forEach((notify) => notify());
}

// Subscribe function for useSyncExternalStore. Also keeps other tabs in sync.
export function subscribeTheme(notify: () => void) {
  listeners.add(notify);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === MOTION_KEY || event.key === null) {
      applyTheme(getTheme());
      applyMotion(getReduceMotion());
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

// ---- Reduce motion (kept on this device, like the theme) ----
export function getReduceMotion(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) === "1";
  } catch {
    return false;
  }
}

function applyMotion(reduce: boolean) {
  const root = document.documentElement;
  if (reduce) root.dataset.motion = "reduce";
  else delete root.dataset.motion;
}

export function setReduceMotion(reduce: boolean) {
  try {
    if (reduce) localStorage.setItem(MOTION_KEY, "1");
    else localStorage.removeItem(MOTION_KEY);
  } catch {
    // Storage unavailable: still apply for this session.
  }
  applyMotion(reduce);
  listeners.forEach((notify) => notify());
}
