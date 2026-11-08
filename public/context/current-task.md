# Current task

**Status: no feature work in progress.** The onboarding audit, the full visual redesign and its refinement pass all finished on 2026-11-03. These changes touched only UI and styling; services, domain, models, validation, auth and API routes are byte-identical to before it. The next task has not been defined.

Update this file when work starts: goal, scope, files involved, decisions, and what remains.

**Latest finished work (2026-11-06):** Dayfacet branding and Telegram notifications; manual steps are in `docs/TELEGRAM_SETUP_TODO.md`. Before that: the Calendar and planning system (`chat.md`, `features.md` → Calendar). Open follow-ups: in-app reminders only (no push), the Habits page still uses creation order, and committing `.claude/` is still undecided.

## Needs the owner's decision

Listed by urgency, none of them started. Details are in the debt register in `architecture.md`.

1. **D2:** `.env` is now git-ignored (2026-11-06). Still to do: rotate secrets if this code was ever pushed with it.
2. **D1:** move `public/context/` out of `public/` before any deployment.
3. **D3:** add a safety guard to `tests/service.test.ts`, or point it only at a disposable database.
4. **D4, D5:** decide on auth rate limiting and on closing the raw error-code email leak.

## Open product questions

- Is exempting a *past* missed day for free intended, given Streak Freezes cost gems? (D8)
- Should a completed day that is later exempted count toward the streak? Screens currently disagree. (D7)
- Should Google sign-in get a button, or be removed? (D12)
- What is the intended test command? (`stack.md`)
- Is the app deployed anywhere?
