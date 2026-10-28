# Care notification audit — October 28, 2026

Status: backend deployed and activated in the linked Crittr Supabase project
(`slnmfelxigtlrdyogsjn`) after explicit user approval. The migration compatibility
check first passed against the hosted schema inside a transaction that rolled
back. Activity sender version 11 and dispatcher version 3 are active. The replay
cutoff is `2026-10-28T20:13:57.567Z`. The authenticated minute Cron job is active,
and a direct authenticated worker check returned HTTP 200 with no runtime errors.
No synthetic alerts or test recipients were created.

All 255 automated tests passed, along with TypeScript, ESLint (existing project
warnings), architecture checks and Deno checking. Shared early completion and
per-device activation guards also passed targeted database regression tests.
At activation, zero owners/devices had completed the new care setup; mobile
source changes must be shipped or reloaded and opened before devices use the
new reminder system. Physical iOS/Android presentation remains unverified.

## Agreed behavior

| Category | Timing | Preference |
| --- | --- | --- |
| Meals and treats | Each saved feeding slot, at its task time | Meals & treats |
| Exercise | Each saved exercise slot, on its selected weekdays | Exercise & co-care activities |
| Medication | Each dose slot at its task time, on its due dates | Medications |
| Vet appointments | 24 hours and 1 hour before the appointment | Vet visits |
| Vaccinations | 9 AM seven calendar days before expiration and on expiration day | Vaccinations |

Shared schedules use the owner's saved IANA care time zone. The owner's first
updated app session initializes it; another phone or travel does not silently
change it. The database projects it onto pets so carers select the same schedule
date, including near midnight. Vet appointments retain their absolute instant.
Completed shared tasks are suppressed for everyone. A completion update names
the actor and goes to the other eligible carers, subject to their preferences.

## Confirmed defects

- Feeding used one consolidated reminder after the latest feeding time. It did
  not register morning and evening portions separately.
- Exercise used a generic 3 PM check-in, and vaccinations had no scheduling path.
- Native repeating requests did not check shared completions before firing.
- Schedule checkmarks were saved before a background JS activity insert. App
  suspension could leave a completed checkmark without its activity or alerts.
- The deployed activity endpoint sent directly to one legacy token. Its Cron
  worker processed invitations only. A read-only hosted check found 27 activity
  jobs never attempted by that queue, including 20 younger than 24 hours. These
  rows cannot prove whether the separate direct sender delivered their alerts.

## Implementation

The authenticated minute worker uses the same schedule planner as the mobile
schedule. It converts owner wall-clock times to absolute instants, including
DST gaps and overlaps, and materializes due occurrences with a one-hour expiry.
It catches up brief worker interruptions without replaying a day's old care.
Each task/occurrence, recipient and registered device has a stable unique job.

The database checks shared completion state when enqueueing and again when
claiming a delivery. It checks the current preference, device owner, pet access,
and source fingerprint. Edits, deletions, memorialization, access removal and
renewed vaccination records invalidate stale reminders. Delivery keeps Expo
tickets for receipt checks and bounded retry timing. Invalid tokens are removed
from both registration tables. The app reports setup errors and missing owner
time zones, and rechecks foreground alerts against the current account/prefs.
Adding the vaccination category preserves an existing All off preference.

`set_pet_schedule_item_completed` commits the checkmark, activity, inbox alert
and delivery jobs in one transaction. Repeated completion requests reuse the
activity. Undo removes its completion alerts and queued jobs. Vet calendar
mirrors remain separate from explicit completion events.

Native devices opt into server care delivery only after removing legacy local
reminders. Older app versions remain in local mode and are excluded from server
care reminders. Every recipient needs the updated build for shared completion
suppression; a closed, older installed app cannot have its existing native
requests remotely canceled by this rollout.
Each device also records its server activation instant. Events due before that
instant are excluded so an upgrade cannot replay a reminder already delivered
by the previous local scheduler.

## Rollout order

1. Deploy the audited `push-co-carer-activity` endpoint first. Record its hosted
   `updated_at` timestamp. It wakes the existing durable queue for the specified
   activity and is compatible with the currently installed queue schema.
2. In one transaction apply only the four `20261028*` migrations, in filename
   order. Do not run a blanket `supabase db push`: hosted migration history does
   not match the repository's older migrations.
3. Set `care_reminder_config.activity_queue_since` to the endpoint deployment
   timestamp. This includes new activity jobs whose originating app closes;
   historical direct-send jobs without tickets are excluded from replay.
   Already accepted tickets remain eligible for receipts, and expired jobs can
   retire without sending. The care reminder feature initially stays disabled.
4. Deploy `dispatch-notification-pushes` with its function-specific `deno.json`.
   Confirm the existing authenticated Cron job is active every minute, then set
   `care_reminder_config.enabled=true`.
5. Ship/install the updated mobile bundle/build and refresh notification setup
   on the owner and carers' devices. Owner time zones are never guessed from
   pet addresses or assigned UTC as a fallback.

The staged migrations are rerunnable and tested against both the repository's
full schema and its older deployed billing/access schema. Activation requires
the existing service-only dispatcher secret; it is never embedded in the app.

## Verification and limits

Automated tests exercise per-portion/dose events, weekday plans, explicit next
due dates, owner time zones, DST, brief worker outages, per-device deduplication,
shared early completion, completion after enqueue, opt-outs, stale source
fingerprints, permissions, token rotation, account fencing, atomic rollback and
cursor paging beyond 100 pets. TypeScript, architecture checking, ESLint and
Deno function checking are also run.

Cron dispatch has minute granularity. Network/provider outages and device Focus,
notification permissions and OS policies can still delay presentation. A push
already handed to APNs/FCM cannot be recalled when someone completes a task.
Provider receipt success confirms handoff, not a visible banner. Ambiguous
provider/network responses can still have at-least-once delivery semantics.

Physical iOS and Android checks remain required: foreground/background/terminated
apps, both carers completing early, multiple devices, opt-out, offline/reconnect,
reboot, and cold-launch navigation. No synthetic alerts are sent to real users
as part of automated tests. Monitor queue age, failed receipts and worker Cron
responses; alert on a stale worker or a backlog approaching the one-hour care
expiry. At scale, increase worker throughput and monitor materialization runtime.

References: [Expo notifications](https://docs.expo.dev/versions/latest/sdk/notifications/),
[Expo delivery and receipts](https://docs.expo.dev/push-notifications/sending-notifications/),
[Supabase function dependencies](https://supabase.com/docs/guides/functions/dependencies).
