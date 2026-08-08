# Architecture

Crittr is an Expo / React Native app on Supabase, with TanStack Query for
server state, Zustand for client state, RevenueCat for subscriptions, and
AdMob for ads.

This document says where code goes and why. It describes the codebase as it is,
including the parts that do not yet follow the rules — those are listed at the
end rather than quietly omitted.

## The one rule

**Dependencies point downwards.** Each layer may import from layers at or below
its own level of abstraction, never above.

```
app/          routes — Expo Router owns this directory
  ↓
components/   presentation
  ↓
hooks/        React glue: queries, mutations, controllers
  ↓
services/     data access — everything that talks to Supabase
  ↓
lib/          infrastructure with no domain knowledge
  ↓
utils/        pure functions
  ↓
types/  theme/  config/  content/
```

`stores/` sits beside `hooks/`: it may use services, lib and utils, and both
`app/` and `components/` may read from it.

This is enforced, not aspirational — see [Enforcement](#enforcement).

## Where things go

### `app/` — routes only

Expo Router treats every file here as a route, so nothing else can live here.
A route should read like a table of contents: pull data from hooks, hand it to
components, wire up navigation. When a route grows a large `useMemo`, that
logic belongs in `utils/` (if pure) or a hook (if it needs React).

Because non-route files are impossible here, a screen that outgrows an inline
stylesheet puts it in `screen-styles/` instead of next to itself.

### `components/` — presentation

Grouped by domain (`activity/`, `medical/`, `onboarding/`, …), with
`components/ui/` for anything shared across domains. If a component is used by
more than one domain, it belongs in `ui/` — a shared control filed inside a
feature folder is how you end up with two of them.

`components/ui/form/` holds the form controls (`FormInput`, `DropdownSelect`,
`AutocompleteInput`, `TagInput`, `ExpiryDateField`).
`components/ui/ScreenHeader.tsx` is the single nav header for stack screens;
do not hand-roll another one.

### `hooks/`

- `hooks/queries/` — one hook per read, wrapping `useQuery`
- `hooks/mutations/` — one hook per write, owning its cache invalidation
- `hooks/*.ts` — everything else: navigation guards, responsive helpers,
  permission checks

### `services/` — the only layer that talks to Supabase

One module per domain. A service takes and returns plain data; it does not know
about React, navigation or components.

Services that outgrow a single file become a directory with an `index.ts` that
re-exports the public API, so callers keep importing `@/services/<domain>`:

```
services/activities/   queries · log · update · weighIn · vetVisitMirror
services/pets/         createPet · queries · updates · activePet · lifecycle
services/schedule/     queries · plan · reconcile · warm · resyncForward ·
                       complete · activitySync
```

Modules inside those directories sometimes export more than the `index`
re-exports. Those extras are for sibling modules; import them from outside the
directory and the architecture check will not stop you, but you are reaching
into someone's internals.

### `lib/` — infrastructure

Supabase client, query client and persistence, auth session plumbing, IAP,
notifications. No domain knowledge. If it fetches pets, it is a service.

`lib/query/` holds the query client, cache persistence, focus manager and the
key factory (`lib/query/keys.ts`). Query keys should come from there rather
than being written as array literals at the call site, so that a key and the
invalidations that target it cannot drift apart.

### `stores/` — client state only

Four Zustand stores: `authStore`, `petStore`, `onboardingStore`,
`activityFormStore`. Server data belongs in React Query, not here. Stores
delegate all network calls to services.

### `utils/` — pure functions

No React, no Supabase, no navigation. This is where derivation logic lives so
it can be reasoned about without mounting a screen.

### `theme/` · `config/` · `content/` · `constants/`

- `theme/` — colours, typography, fonts, gradients
- `config/` — build-time configuration and feature flags
- `content/` — long-form copy (privacy policy, terms, FAQs)
- `constants/` — domain data that is neither of the above: icon maps, form
  option lists, pricing fallbacks

### `types/`

`types/database.ts` mirrors Supabase rows and the form shapes that map onto
them. `types/ui.ts` holds view-model types shared between components.

## Conventions

**Naming.** Components and their files are `PascalCase`. Hooks are
`useThing.ts`. Everything else is `camelCase.ts`. Directories are `camelCase`,
except Expo Router's `(group)` and `[param]` segments.

**File size is a symptom, not a rule.** There is no line limit, but a file past
roughly 400 lines is usually doing more than one job. Split along the seams
that are already there — the concerns that have their own private helpers —
rather than by arbitrary size.

**Splitting a file should not change it.** When a split is meant to be a pure
move, verify that: compare the old and new content with imports, ordering and
whitespace normalised away. Every split in this codebase was checked that way.

**Comments explain why.** The code already says what it does.

## Enforcement

```bash
npm run check        # typecheck + lint + architecture
npm run check:arch   # architecture only
```

`scripts/check-architecture.js` builds the import graph, verifies the
dependency direction above, and fails on import cycles.

Pre-existing violations live in `scripts/architecture-baseline.json` so the
check can gate CI today. **The baseline may shrink but never grow.**
`--update-baseline` refuses to add entries; `--force` overrides that and exists
for exactly one case — a rename that moves a known violation to a new path —
and prints every added entry so it is visible in review.

When you fix a baseline entry the check tells you, and you lock the improvement
in with `npm run check:arch -- --update-baseline`.

## Known debt

Honest list of what does not yet follow the above.

**19 layer violations** remain in the baseline. The themes:

- `lib/prefetchSessionData.ts` reaches into services, stores and a query hook.
  It is session-bootstrap orchestration with no correct home under the current
  layering — it needs both services and stores, and services may not use
  stores.
- Several `utils/` modules import services, stores or components
  (`petProfileMapping` and `petProfileNavItems` import component prop types;
  `manageActivityFormHelpers` and `petFoodFormHelpers` call services). These
  are mostly a matter of moving a type or lifting a call to the caller.
- `constants/proPricingFallback.ts` imports a service for a type.

**Duplicated code that was deliberately left alone.** In each case the two
copies have diverged in ways that make unifying them a behaviour change rather
than a refactor:

- `PetFoodMealScheduleSection` and `PetFoodTypeToggle` exist in both
  `components/onboarding/petFood/` and `components/petScreens/food/`, differing
  by 159 and 43 lines respectively.
- The dashboard builds `MedicationSummary[]` inline while
  `utils/petProfileMapping.ts` has `toMedicationSummaries` doing the same
  mapping with a different frequency fallback (`"Daily"` vs `""`).

**Large files that were left as they are:**

- `stores/authStore.ts` (676 lines) coordinates one session lifecycle through
  shared closure state and single-flight guards. Splitting it into slices would
  tangle that coordination rather than clarify it, on the app's most critical
  path. Its backend calls have been moved to `services/auth.ts`; what remains
  is genuinely one job.
- `types/database.ts` (788 lines) is almost entirely type declarations.

**11 query keys are still written as array literals** at the call site instead
of coming from `lib/query/keys.ts` — mostly single-segment invalidation
prefixes such as `["todayActivities"]`. They work, but nothing ties them to the
keys they are meant to match.

**`screen-styles/` is inconsistently applied** — 14 stylesheets for 69 routes.
The directory itself is justified (see `app/` above), but most routes still
keep styles inline.

**Feature-based structure was considered and deferred.** Moving the ~450 files
in `components/`, `hooks/` and `services/` into `features/<domain>/` would
produce an enormous diff without fixing any of the problems listed above. The
targeted fixes came first. `scripts/check-architecture.js` already understands
`features/` — including the rule that cross-feature imports must go through a
feature's `index.ts` — so the move can happen later without changing the guard.
