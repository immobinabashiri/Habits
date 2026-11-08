# Branding: Dayfacet

Researched on 2026-11-06. The app was previously called **Gem Habits** (a working title).

## Decision

**Dayfacet**: "One facet of you, polished every day."

- **Meaning.** A gem is polished one facet at a time; you improve one day at a time. It keeps the existing gem identity: the logo, gems as the reward currency, the jewel-toned themes.
- **Fit.** It isn't tied to one activity, so it covers habits, fitness, planning and personal growth.
- **Easy to say and spell.** Two everyday English words, "day" and "facet", said "DAY-fass-it".
- **Ownable.** No existing product uses the name, and the main domains were unregistered on the day of research.

## How candidates were checked

1. **.com registration** was checked against Verisign's official registry (RDAP, `rdap.verisign.com`). This is the authoritative answer to "is it registered", unlike registrar search pages, which often show "premium" listings. Over 40 gem- and habit-themed names were checked. Most short ones are already taken, for example gemly, habitgem, gemstreak, keystreak, gemwise, gemloop, prismly and facetly.
2. **Web search** for each shortlisted name, with and without a space and with "app", looking for products, app-store listings and companies.
3. **Other domain endings** (.app, .io, .co) for the top two, through their registries' RDAP services, and `whois` for the winner.
4. **Trademarks:** see the limits below.

## The five finalists

| Name | .com (registry, 2026-11-06) | Search findings | Verdict |
|---|---|---|---|
| **Dayfacet** | Not registered; .app, .io, .co also free; whois "No match" | No product, company or app with the name. Results were unrelated uses of "date facet" in search software. | **Chosen.** Distinctive, no neighbours, keeps the gem story. |
| Steadygem | Not registered; .app, .io, .co also free | No exact match, but "Steady" is crowded in this exact category: [Steady Ember: Habit Tracker](https://play.google.com/store/apps/details?id=dev.steady.steady), [Steady: Gym Log & Planner](https://appgoblin.info/apps/6739453412), ["Steady: build habits that actually stick"](https://www.producthunt.com/products/steady-build-habits-that-actually-stick/reviews). | Strong meaning, but easily confused. Runner-up. |
| Streakgem | Not registered | No exact match, but it sits next to the well-known [Streaks](https://crm.org/news/streaks-app-review) habit app, and [Streak](https://support.streak.com/getting-started/installing-streak/installing-streaks-mobile-app) (CRM). | Confusion risk with a direct competitor. |
| Stepgem | Not registered | No exact match. "Step" reads as a step counter: [Stepogram](https://apps.apple.com/ca/app/stepogram/id1622395837), StepsApp, [STEPR](https://apps.apple.com/mx/app/stepr/id6741198432). | Too narrow (walking). |
| Habigem | Not registered | No exact match, but near other "Habi…" habit apps: [Habi](https://feedbagel.com/post/habi-calendar-integrated-habit-tracking-app-with-minimalist-design), [Habigrow](https://eliteai.tools/tool/habigrow). | Generic-sounding, crowded prefix. |

Also unregistered as .com, but not shortlisted: tendgem, habitfacet, strivegem, keepgem, ritmogem, facetfit.

## Limits of this research (please read)

- **Domains:** "not registered" was true when checked, not a reservation. Anyone can register it at any moment, and a registrar may still price it as premium. **Register dayfacet.com (and ideally .app) before announcing the name.** Nothing was purchased.
- **Trademarks:** the official databases (USPTO Trademark Search, EUIPO eSearch, WIPO Global Brand Database) are interactive search tools that couldn't be queried reliably from here. **No trademark clearance has been done.** Before public launch, search "Dayfacet" and close variants ("Day Facet", "Dayfacets") in classes 9 (software) and 41/42/44 (coaching, SaaS, wellness), or ask a trademark attorney.
- **App stores and social handles:** not checked directly. Check @dayfacet on Telegram, Instagram and X, and the App Store and Play Store, before launch.

## Identity

| Asset | File | Notes |
|---|---|---|
| Mark (master) | `public/brand/mark.svg` | Faceted gem on a rose-to-violet tile (`#b5344c` → `#8256c9`). Fills only, no strokes, so it stays sharp at 16px. |
| One-colour mark | `public/brand/mark-mono.svg` | Uses `currentColor`. |
| Favicon | `src/app/favicon.ico` (16, 32, 48), `src/app/icon.svg` | Next.js adds the `<link>` tags. The tile has its own background, so it works on light and dark tabs. |
| Apple touch icon | `src/app/apple-icon.png` (180) | Full-bleed; iOS rounds the corners itself. |
| PWA icons | `public/brand/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Listed in `src/app/manifest.ts`. |
| Social preview | `public/brand/og-image.png` (1200×630) | Open Graph and Twitter card. |
| Telegram bot photo | `public/brand/telegram-bot-avatar.png` (640×640), plus `.svg` | Full-bleed square; the gem sits inside Telegram's circular crop. |
| In-app logo | `src/components/layout/logo.tsx` | Same gem outline; follows each theme's colours. |

The name and copy live in `src/lib/brand.ts`, which both the website metadata and the Telegram bot use.

**Unchanged on purpose:** the package name (`habittracker`), the database, environment variable names, cookie and localStorage keys, and every internal identifier. The rebrand is user-facing only.

To regenerate the PNGs after changing `mark.svg`, render the SVG at each size listed above. The originals were rendered with headless Chrome and packed into the `.ico` as PNG entries.
