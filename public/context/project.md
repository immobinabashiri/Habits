# Project overview

Start here. Audited against the source on 2026-11-03.

> **WARNING: this folder is inside `public/`.** Next.js serves everything in `public/`, so once deployed these files are readable by anyone at `/context/<file>.md`. No middleware or rewrite blocks that path. They contain no secrets, but they do describe known weaknesses (see `architecture.md`). Move the folder out of `public/` before deploying. See D1.

## Evidence labels used in all context files

- **Verified** (the default for anything unlabelled): confirmed directly in source or config.
- **Inferred**: strongly suggested by the implementation, not explicitly confirmed.
- **Unknown**: cannot be established from this codebase.

## What the application is

**Dayfacet**, formerly the working title Gem Habits (`package.json` name: `habittracker`; see `docs/BRANDING.md`), is a multi-user, gamified habit tracker. Users define habits on weekly schedules, complete them daily to earn XP and gems, build streaks, unlock achievements, and spend gems in a personal reward shop they define themselves. Tagline: "Build habits. Earn gems. Treat yourself." (`src/app/layout.tsx`).

Economy values are largely self-set (habit XP and gems, milestone bonuses, reward prices), within caps. **Inferred:** this is a self-motivation tool, not a competitive economy, so "cheating" only affects the user's own account.

**Inferred:** the app is a port of an earlier single-file HTML app. Many comments map fields to it (`HTML: S.comp`, `HTML: dur, unit, xb`). That app is not in this repository.

## Glossary

| Term | Meaning |
|---|---|
| Core habit | Earns XP only. Gems are forced to 0 |
| Bonus habit | Earns XP and gems |
| Timed habit | Completed by logging minutes; extra blocks earn a bonus |
| DateKey | `YYYY-MM-DD` string for a calendar day in the user's time zone. Never a `Date` |
| Exempt day / skip day | A date that does not count for a habit. UI uses both "Exempt days" and "Skip day" |
| Streak | Consecutive scheduled days completed. Computed, never stored |
| Streak Freeze | Item bought with gems that rescues a recently missed day |
| Milestone / streak bonus / medal | Gems paid when a streak reaches a set length. Code says milestone, UI says streak bonus, the achievements data says medal |
| Wallet | Cached balances on the user: gems, XP, totals, freezes |
| Ledger | Append-only `Transaction` collection recording gem changes |

## Directory map

```
src/app/              Routes: public pages, /dashboard/*, /api/* route handlers
src/components/<area>/ UI per feature: dashboard, habits, rewards, streaks, stats,
                      achievements, settings, auth, layout, ui
src/lib/domain/       Pure business rules, no I/O. Safe on client and server
src/lib/services/     Business operations using the database. Server only
src/lib/db/           Mongoose models and schema helpers. Server only
src/lib/validation/   Zod schemas shared by client and server
src/lib/api/          http.ts = server route helpers; *-client.ts = browser fetch wrappers
src/lib/auth/         NextAuth options, session helper, auth rules and messages
src/lib/errors.ts     Error catalogue shared by client and server
src/lib/theme.ts      Theme registry and reduce-motion state (localStorage)
src/styles/           Theme tokens, shared visual primitives, backdrop
src/lib/sidebar.ts    Sidebar cookie name
src/types/            Shared TypeScript types (records, public DTOs, page data)
src/utils/            connectDB (server only), bcrypt helpers
tests/                Two hand-rolled test scripts. See stack.md for the danger note
public/               Default Next.js SVGs (unreferenced) and this context folder
```

The folders match the real dependencies, checked by tracing imports. One caveat: `src/lib/api/` mixes server (`http.ts`) and browser (`*-client.ts`, `client.ts`) code.

## Where to read next

| File | Contents |
|---|---|
| `stack.md` | Versions, configuration, env vars, scripts, tests, workflow |
| `architecture.md` | Layers, data flow, data model, API, auth, risky areas, technical debt register (D-numbers) |
| `features.md` | What each feature does and its exact business rules |
| `ui.md` | Design system, five themes, how to add a theme |
| `rules.md` | Coding conventions and how to add features |
| `done.md` | Implemented functionality checklist |
| `current-task.md` | Current work state |
| `chat.md` | Session hand-off log |
| `prompt.md` | The onboarding prompt that produced these files |

## Unknown

- Whether the app is deployed, and where. No deployment config exists.
- Project history. This copy is not a git repository and has no changelog.
- Roadmap, beyond code comments mentioning a future monthly schedule kind.
- Usage, scale and backup arrangements of the database.
