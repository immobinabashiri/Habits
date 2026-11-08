// The product identity in one place: the website metadata and the Telegram bot both
// read it. Internal identifiers (package name, database, env variable names) are
// deliberately unchanged. See docs/BRANDING.md for how the name was chosen.
export const BRAND = {
  name: "Dayfacet",
  tagline: "One facet of you, polished every day.",
  description:
    "Dayfacet is a habit tracker that turns daily routines into a rewarding game: plan your days, keep your streaks, earn gems and treat yourself.",
  shortDescription: "Build habits, earn gems, treat yourself.",
  // The brand colours behind the logo tile (also in public/brand/*.svg).
  colors: { from: "#b5344c", to: "#8256c9", ink: "#16151c", paper: "#f7f2ea" },
} as const;

// The public address of the site, for absolute links (SEO, messages). Empty when not
// configured; callers fall back to relative links or plain text.
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";
  try {
    return raw ? new URL(raw).origin : "";
  } catch {
    return "";
  }
}
