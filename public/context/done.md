# Implemented functionality

What exists in the code as of 2026-11-03, confirmed by reading it. It is not a dated history, because this copy has no git log, so **when** things were built is Unknown. Behaviour details are in `features.md`.

The test scripts have not been run. Main UI flows were exercised on a throwaway database during the redesign (`ui.md`), not every feature.

## Product

- [x] Landing page
- [x] Sign-up and login with email and password
- [x] Google sign-in on the server (no UI entry point, D12)
- [x] Dashboard shell: collapsible sidebar and mobile drawer
- [x] Habit create, edit, archive, restore, delete
- [x] Weekday schedules, core and bonus kinds, timed habits
- [x] Exempt days
- [x] Daily completion and same-day undo
- [x] XP and levels, with level-up banner
- [x] Gem wallet and ledger
- [x] Streaks, longest streak, 6-week calendars
- [x] Streak Freezes: buy, use, or let it break
- [x] Configurable streak bonuses
- [x] 10 achievements and the medal list
- [x] Reward shop: CRUD, favorites, purchase, history
- [x] Stats: 7, 30 and 90 day charts, weekday pattern, per-habit table
- [x] Settings: profile, time zone, streak bonuses, appearance, password
- [x] Glassmorphism redesign with five themes (light, dark, minimal, organic, kawaii) plus System; reduce motion
- [x] Dashboard loading skeleton; themed 404 and error pages
- [x] Slider and switch controls; 24 habit icons and 25 reward icons

## Engineering

- [x] Layered domain, service, API and UI structure
- [x] Shared Zod validation and unified error contract
- [x] Race protection through unique indexes and conditional updates
- [x] Accessibility conventions (see `ui.md`)
- [x] Test scripts for domain and service logic (no runner, D3 and D17)

## Schema exists, feature does not

- [ ] Savings goals (`User.goals`)
- [ ] Time log per day (`TimeLog`)
- [ ] Manual ledger adjustments (`adjustment` type)
- [ ] Account-level theme (`settings.theme`, `settings.reduceMotion`; themes are per device)
- [ ] Monthly schedules (mentioned in comments only)

## Documentation log

- 2026-11-03: Filled all context files from a full source audit. See `chat.md`.
- 2026-11-03: Full visual redesign and multi-theme system. See `ui.md`.
- 2026-11-03: Refinement pass: sliders, switches, expanded icons, remaining legacy components.
