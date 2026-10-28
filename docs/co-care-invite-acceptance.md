# Co-care invite acceptance repair

Deployed October 26, 2026 to the linked Crittr project (`slnmfelxigtlrdyogsjn`).

## Cause

The notifications screen calls `services/coCare.ts` → `acceptInvite()` →
`supabase.rpc("accept_co_care_invite", { target_invite: inviteId })`.
The client already supplies the correct named UUID parameter. The live database
had no `public.accept_co_care_invite(uuid)` function. The broader
`20261026123000_co_care_integrity.sql` migration containing its original definition
had not been deployed; its membership/acceptance triggers were also absent.

Installing just the original function would create a membership without updating
the invitation: it relied on the absent `consume_co_care_invitations` trigger.

## Repair

`supabase/migrations/20261026143000_accept_co_care_invite.sql` defines a standalone
acceptance transaction. It locks the invite, authorizes its recipient using
`auth.uid()`, checks the current pet owner and both verified Pro entitlements,
copies the saved invitation permissions into the membership, and explicitly saves
`status = 'accepted'` and `responded_at`. Retries return the same pet without
duplicating memberships; removed memberships cannot be restored using an already
accepted invite. Declined invites cannot be accepted.

Only `authenticated` receives execute permission; anonymous callers are denied.
The migration requests a [PostgREST schema refresh](https://supabase.com/kb/troubleshooting/refresh-postgrest-schema)
so the RPC becomes discoverable through the app's existing call.

`docs/sql/install-co-care-acceptance.sql` wraps the same definition in an explicit
transaction for a scoped SQL Editor/CLI deployment. It requires the existing
`account_has_verified_pro(uuid)` helper from the billing installation. It can be
rerun safely and does not apply other pending feature migrations. The earlier
integrity migration now uses `CREATE OR REPLACE` for this RPC so installing the
repair first does not prevent the later full migration rollout.

## Deployment and verification

Applied the scoped installer using the authenticated Supabase CLI. Verified the
live signature is `accept_co_care_invite(target_invite uuid)`, returning UUID,
with `SECURITY DEFINER`, authenticated execution enabled and anonymous execution
disabled. An anonymous HTTP POST with the named parameter returns HTTP 401 /
`42501` permission denied, confirming the API discovers the function instead of
returning a missing-function/schema-cache error.

Exercised an existing eligible invitation as its authenticated invitee within a
transaction and rolled back all writes. Acceptance, exact membership permissions,
the invite's accepted status/response timestamp, and retry behavior passed. After
rollback the project still had 20 pets, zero memberships, three pending invites
and one historically accepted invite. The pet/co-care policy fingerprint was
unchanged. Existing invitations remain available for users to respond to.

Local verification: all 214 tests passed (145 TypeScript tests and 69 runtime /
database tests), `npm run typecheck`, ESLint on the new regression tests,
the architecture guard, and `git diff --check`. Regression coverage reproduces
the missing function on the deployed schema, tests repeatable installation,
verifies recipient/Pro restrictions and permissions, and exercises acceptance
both before and after the full co-care integrity rollout. Device UI validation
remains a manual check; this server repair requires no app rebuild.

## Follow-up: single JSON object error

On October 26, 2026, the live inbox contained six unread invite notifications
whose invitation records had been deleted. The initial `acceptInvite()` lookup
used `.single()`, which produces PostgREST `PGRST116` for zero rows instead of
an unavailable-invitation result. The error wording and zero-row behavior are
documented in the [Supabase PostgREST error reference](https://supabase.com/docs/guides/api/rest/postgrest-error-codes).

The client now filters by the current recipient and uses `.maybeSingle()`.
Missing invitations and revocations between the lookup and acceptance transaction
produce an actionable unavailable message; the screen marks that obsolete
notification read. Network and Pro authorization errors remain errors and do
not retire the invite action. Optional owner-notification metadata failures and
post-acceptance session-refresh failures no longer report a failed acceptance
after the membership has committed; the mutation still invalidates the relevant
pet/inbox/unread-count caches. This client change is in the workspace and must
be included in the next app JS bundle.

Applied `20261026153000_retire_resolved_invite_notifications.sql` to the linked
project. It marks existing orphaned/resolved invite notifications read and adds
a trigger that retires matching inbox actions when an invitation is accepted,
declined or deleted. Existing app builds already hide Accept/Decline on read
invite rows, so refreshing Notifications receives the server-side cleanup.
Inbox history is retained. No missing invitations are recreated or accepted.

After deployment, stale unread invite actions decreased from six to zero; the
one valid pending unread invite stayed available. Invitation and membership row
fingerprints, the 20-pet count and pet/co-care policy fingerprint matched the
pre-change snapshot. Live acceptance and deletion lifecycle checks ran with
temporary invites inside a transaction and were rolled back; no email or push
messages were sent by these checks.

All 224 tests passed (145 TypeScript and 79 runtime/database), with TypeScript,
targeted ESLint, architecture and whitespace checks passing. New regression
tests exercise the real Supabase client's zero-row response handling, revocation
during acceptance, optional work failing after acceptance commits, session
refresh failure, repeatable orphan cleanup, and acceptance/decline/revoke inbox
lifecycle behavior under authenticated roles.
