import Link from "next/link";

// The Dayfacet gem (same outline and facets as public/brand/mark.svg). Colours come
// from tokens, so it follows the theme.
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="8 13 48 40" className={`${className} text-primary`} aria-hidden="true">
      <path d="M20 15.5h24l10 11-22 22-22-22z" fill="currentColor" />
      <path d="M24 26.5h16l-8 22z" className="fill-primary-foreground/35" />
      <path d="M24 26.5l8-11 8 11z" className="fill-primary-foreground/20" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="brand inline-flex min-h-11 items-center gap-2 rounded-md"
    >
      <LogoMark />
      <span>Dayfacet</span>
    </Link>
  );
}