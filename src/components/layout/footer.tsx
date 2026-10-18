import { LogoMark } from "./logo";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span className="font-medium text-foreground">Gem Habits</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Gem Habits. All rights reserved.</p>
      </div>
    </footer>
  );
}