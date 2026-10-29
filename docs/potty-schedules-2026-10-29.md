# Exercise & Potty — October 29, 2026

The pet-profile section and onboarding step are titled **Exercise & Potty**. An optional potty schedule sits beneath exercise activities. Add potty time opens the existing time-picker modal; rows can be edited or removed, repeat daily, and respect the user's 12/24-hour display preference. Read-only co-carers can view the times.

## Persistence and scheduling

- `pets.potty_times` stores distinct, minute-precision local times; existing pets receive an empty schedule. `potty_schedule_updated_at` prevents a newly added time from generating a late reminder for a break that already passed. Unrelated edits preserve that timestamp.
- `save_pet_exercise_and_potty` atomically saves energy level, exercise entries and potty times. Existing exercise IDs survive so changing potty times does not reset their completion history. Existing pet permissions and write restrictions apply.
- Potty slots appear each day in the schedule using stable `potty / pet ID / HH:mm` source identities. Completing one asks for pee, poo, or both; cancelling does not mark it done. `complete_pet_potty_schedule_item` commits the actual outcome, activity and completion together. Repeat completions are idempotent and the existing undo function removes the linked activity.
- `notify_potty_breaks` is independent of exercise/co-care notifications and is included in All. The migration and client normalization preserve an earlier All off choice.
- The existing server reminder dispatcher uses the owner's care time zone, including DST, and rechecks preferences, source edits and completed tasks before sending. Editing/removing times invalidates stale reminders. No new OS notification permission or separate scheduling service was introduced.

The Share feedback screen also now uses only safe-area bottom padding below Send feedback, removing the extra scroll clearance.

## Deployment and validation

Applied `20261029160000_potty_schedules.sql` in a transaction on `slnmfelxigtlrdyogsjn`; no existing routines were deleted or default potty times created. Deployed `dispatch-notification-pushes` version **4**, ACTIVE, from an isolated staging directory. The existing dispatcher remains enabled with one active per-minute cron job.

Production validation exercised save, preservation of exercise entries, potty completion, idempotent completion, undo and the preference update in a separate rolled-back transaction. Confirmed no test activities or schedule rows remained. Anonymous users cannot execute the new RPCs; the worker rejects missing and invalid authorization with HTTP 401.

The downloaded deployed entrypoint and four shared modules matched staged source by SHA-256. CLI readback stopped when it encountered repository-level utility paths, so it did not independently verify those dependencies. The staged dependency graph passed Deno checking and deployment uploaded those dependencies successfully.

- `npm test`: **370 passed** (147 TypeScript and 223 runtime/database tests).
- `npm run check`: TypeScript, ESLint (zero errors; 169 advisory warnings), and architecture guard passed.
- iOS JavaScript/Hermes export and `git diff --check` passed.

The mobile changes require a new native app build. Physical-device APNs/FCM presentation was not exercised during this change; validate a saved potty reminder in foreground/background and the off toggle on the installed build. No manual push dispatch was initiated.
