# Coding standards and conventions

Follow established conventions unless there is a documented reason to deviate. Evidence labels are defined in `project.md`. D-numbers refer to `architecture.md`.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `habit-card.tsx`, `streak-overview.ts` |
| Components | PascalCase named exports | `export function HabitCard` |
| Page view | `<area>-view.tsx`, `<Area>View` | `RewardsView` |
| Form draft module | `<area>-draft.ts` | `reward-draft.ts` |
| Browser API function | `<verb><Noun>Request` | `completeHabitRequest` |
| Service | plain verb | `completeHabit`, `getDashboard` |
| Stored type | `<Name>Record` | `HabitRecord` |
| Browser-safe type | `Public<Name>` | `PublicHabit` |
| DTO mapper | `toPublic<Name>` | `toPublicHabit` |
| Constants | `SCREAMING_SNAKE`; grouped in `LIMITS` | `MAX_BONUS_UNITS` |
| Zod schemas | `<verb><Noun>Schema`; inferred types `<Verb><Noun>Input` | `createHabitSchema` |
| Mongo fields | camelCase | `exemptDates` |
| Booleans in props | plain | `busy`, `pending`, `collapsed` |

Default exports only where Next requires them (pages, layouts).

## Formatting and imports

- 2 spaces, double quotes, semicolons, trailing commas. No Prettier config is present.
- `@/` alias for imports across folders. A few same-folder relative imports exist in `components/layout/`.
- Order: external packages, then `@/` modules, then types. Use separate `import type` lines.
- Prefer `null` for "no value" in data; `undefined` for omitted optional props.

## TypeScript

- `strict`. Avoid `any`: none was seen in application code; casts are limited.
- Shared types in `src/types/`. Pure domain types live next to their logic in `lib/domain/`.
- `as const satisfies` for catalogues (`APP_ERRORS`).
- `.lean<RowType[]>()` with a local row interface for read queries.
- Derive input types from Zod with `z.infer`.

## Comments

Short, and explain **why**, such as a constraint or a past bug, not what. `// HTML: x` comments map to the old app. Route handlers start with a method, path and body comment. JSDoc is rare.

## API routes

Follow this shape exactly:

```ts
type Context = { params: Promise<{ id: string }> };

// POST /api/things/:id   body: { "field": ... }
export function POST(request: Request, { params }: Context) {
  return respond(async () => {
    const userId = await requireUserId();
    const thingId = parseObjectId((await params).id);
    const input = parseOrThrow(thingSchema, await readJson(request));
    return NextResponse.json({ thing: await doThing(userId, thingId, input) }, { status: 201 });
  });
}
```

Routes hold no business logic. Status codes: 201 on create or purchase, 204 on delete, otherwise 200. Wrap entity responses by name (`{ habit }`).

## Services

- Start with `import "server-only"`, then `await connectDB()`.
- **Every query filters by `userId`.** A record owned by someone else must look like `NOT_FOUND`.
- `userId` and ids arrive as `Types.ObjectId`.
- Throw `AppError(code, fields?)`; never return error values. Add new codes to `APP_ERRORS`.
- Return `Public*` DTOs, never documents.
- Spending: one conditional atomic update. Awards: rely on a unique index.
- Pure rules belong in `lib/domain/`, without I/O.
- Limits go in `lib/domain/defaults.ts`.

## Validation

- Zod schemas in `lib/validation/`, shared by client and server. The server is the final judge.
- Mongoose schemas repeat the core constraints as a last line of defence.
- Field error keys are dot paths (`timed.targetMinutes`), so client and server errors render through the same code.

## React

- Server page: check session, call service, render `<XView>`. The auth check block is repeated verbatim per page:

  ```ts
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !Types.ObjectId.isValid(id)) redirect("/login");
  ```

- Add `"use client"` only where needed. Keep display-only pieces as server components.
- Keep number inputs as strings while typing; parse on submit.
- Store ids in dialog state, not objects, so dialogs read the latest data (`DialogState`).
- `useEffect` only for browser integration: timers, listeners, `<dialog>`. Do not derive state in effects. The React Compiler is on, and no manual memoisation is the norm (`useCallback` appears once, for a toast dismiss).
- No component definitions during render; icon lookups are components (`HabitIcon`).

### Standard catch block

```ts
const apiError = toApiError(caught);
if (apiError.code === "UNAUTHENTICATED") {
  router.push("/login");
  return;
}
setError(apiError.message); // or map apiError.fields to inputs
```

## Styling

Tailwind utilities plus the shared classes in `src/styles/components.css` (`panel`, `surface`, `btn btn-primary`, `field`, `type-h1`, ...). Use those before writing new class strings, and add new shared CSS inside `@layer components`. No CSS modules, per-theme components, hardcoded colours or `dark:` utilities. Inline `style` only for computed sizes and backdrop placement. Colours go in `src/styles/themes/`. See `ui.md`.

## Dates

Use `lib/domain/dates.ts`. DateKeys are strings, comparable lexically. Weekdays are `0 = Sunday`; **display order** comes from `WEEK_ORDER`, Monday first. Get "today" from the server in the user's zone.

## How to add a feature

1. Rules and constants: `lib/domain/`, `defaults.ts`. Add tests for pure logic.
2. Data: a model in `lib/db/models/` with `ownerField`, indexes and the `models.X ??` guard. Add record and public types in `types/`.
3. Validation: `lib/validation/`.
4. Service: `lib/services/`.
5. API: route handler in the shape above, plus a `*Request` wrapper in `lib/api/*-client.ts`.
6. Page: `app/dashboard/<area>/page.tsx` with `metadata`, the session check and the `UNAUTHENTICATED` catch.
7. UI: `components/<area>/<area>-view.tsx`, reusing `Modal`, `FormField`, `ProgressBar`, and including empty, error and pending states.
8. Navigation: add to `NAV_ITEMS` in `components/dashboard/nav-items.ts`.
9. Update these context files.

## Established versus inconsistent

| Topic | Follow this | Exceptions, do not copy |
|---|---|---|
| Client validation | Shared Zod schema (`reward-draft.ts`, settings) | `habit-draft.ts` re-implements the rules by hand |
| Importing `toApiError` | `@/lib/api/client` (newest code) | Many files import it through the `habits-client` re-export, even for rewards |
| Error handling in forms | `toApiError` | `habit-form.tsx` uses `instanceof ApiClientError` |
| Session page guard | With `UNAUTHENTICATED` catch | `dashboard/page.tsx` and `habits/page.tsx` omit it (D15) |
| Style in utilities | 2-space ES exports | `utils/auth.ts` uses tabs, JSDoc and a bottom `export {}` |
| Type-only imports | `import type` | `models/habit.ts`, `services/habits.ts`, `defaults.ts` |
| Layout function name | PascalCase | `dashboard/layout.tsx` exports lowercase `layout` |

## Patterns not to replicate

- Copying a UI helper instead of sharing it. Existing duplicates: `Stat` (3 versions: `level-card`, `streaks-view`, `stats-view`); `IconButton` and `ActionButton`; `chipFace` (2); `formatWhen` (2); inline `role="progressbar"` in `level-card` and `today-habits` instead of `ProgressBar`; dismissible alert markup; delete dialogs; the page guard.
- Redefining rules. See D10.
- Adding a wallet change without a ledger entry.
- Reading the user id from a request.
- Sending a date for "today" from the client.
- Adding a route without `respond()` and `requireUserId()`.
- Renumbering achievements or changing key formats.

**Inferred:** duplicates can be folded into `components/ui/` when next touched, but no such plan exists, and these docs do not authorise refactoring.
