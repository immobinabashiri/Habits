import Link from "next/link";
import { Logo } from "./logo";

// Server Component. Auth-aware links (Dashboard when logged in) come in a later phase.
export function Navbar() {
  return (
    <header className="glass sticky top-0 z-40 border-x-0 border-t-0">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6"
      >
        <Logo />

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-4"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-4"
          >
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  );
}