import Link from "next/link";

// Simple diamond mark. Colors come from tokens, so it follows the theme.
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} text-primary`}
      aria-hidden="true"
    >
      <path d="M6 3h12l4 6-10 12L2 9z" fill="currentColor" />
      <path d="M12 21 8 9h8z" className="fill-primary-foreground/35" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-md font-bold tracking-tight"
    >
      <LogoMark />
      <span>Gem Habits</span>
    </Link>
  );
}