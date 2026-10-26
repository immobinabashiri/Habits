export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "theme";
export const MOTION_KEY = "reduce-motion"; // "1" = reduce motion on this device

// Runs in <head> before first paint to avoid a flash of the wrong theme.
// "system" is represented by NO data-theme attribute (CSS follows prefers-color-scheme).
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}if(localStorage.getItem("${MOTION_KEY}")==="1"){document.documentElement.dataset.motion="reduce"}}catch(e){}})();`;

const listeners = new Set<() => void>();

export function getTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
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
