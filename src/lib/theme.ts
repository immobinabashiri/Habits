export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "theme";

// Runs in <head> before first paint to avoid a flash of the wrong theme.
// "system" is represented by NO data-theme attribute (CSS follows prefers-color-scheme).
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}})();`;

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
    if (event.key === THEME_KEY || event.key === null) {
      applyTheme(getTheme());
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}