# Free and Pro tiers — October 28, 2026

This change is implemented in the local source. It has not been deployed to Supabase or released to the stores.

## Agreed feature matrix

| Feature | Free | Crittr Pro |
| --- | --- | --- |
| Owned pets | 3 total, including memorialized and archived pets | Unlimited |
| Co-carers | 1 per pet, based on the owner's tier | Unlimited per pet |
| Accepting a co-care invitation | Available; recipient does not need Pro | Available |
| Activity log items and history | Unlimited | Unlimited |
| Saved foods, medications, vaccinations | Unlimited | Unlimited |
| Medical and insurance document uploads | Upgrade required | Available, subject to pet permissions |
| CrittrAI | Upgrade required | Available |

Shared pets do not consume an invitee's owned-pet allowance. Pending invitations reserve a co-carer slot; declining or revoking an invitation frees it. The owner can manage permissions and remove co-carers on Free. Existing documents remain readable after downgrade under the existing retention policy. Document uploads still require the uploading account to have Pro and the relevant pet permission.

## Before this change

The dashboard and Pets screen gated the second living owned pet, excluding memorialized pets. Co-care was Pro-only for both owner and invitee at acceptance, with invite notifications directing Free invitees to upgrade. Additional saved foods, medications and vaccinations had client-side paywalls. Medical uploads and CrittrAI already required Pro. Activity logging had no count cap.

## Paywall entry points

- **Dashboard and My pets:** check a fresh count of all owned pets; open the contextual pet paywall when a Free user attempts pet four.
- **Add pet route:** repeat the check for direct navigation. Save-time server denials open the upgrade screen without discarding the form.
- **Pet profile → Co-carers:** available on Free, including permission management, removal and invitation revocation.
- **Co-carers → Invite:** check current per-pet capacity and show the contextual co-care paywall when the Free slot is occupied or reserved.
- **Invite route and send action:** repeat the capacity check for direct navigation and changes while the form is open. Server capacity errors route the owner to upgrade.
- **Medical records:** retain the existing Pro checks before record creation, file picking and submission, including additional files on record details.
- **Insurance documents:** add Pro checks before file picking/capture and again before uploading; text-only insurance details remain available on Free.
- **CrittrAI:** retain screen/navigation and Edge Function Pro verification.
- **Foods, medications and vaccinations:** remove list, direct-route and dashboard restrictions. These features no longer show a Pro paywall.
- **Upgrade screen and contextual messaging:** state the revised allowances and the four Pro benefits. Pro setup no longer presents additional medications as a paid feature.
- **Invitation notifications and onboarding acceptance:** Free recipients can accept normally. Pending legacy upgrade-only notifications are converted to actionable invitations by the migration; the client also handles the legacy type.

## Database enforcement and downgrade behavior

`20261028160000_revised_free_pro_tiers.sql` updates the pet creation trigger, access helpers, invitation preflight, invitation and membership guards, acceptance RPC, notifications and push-access helper. Pet and co-care creation use transaction-scoped advisory locks to serialize limit checks. Invitation identity, replay and permission protections remain enforced.

Downgrades retain all pets, memberships, invitations and files. The oldest three owned pets remain writable on Free, including memorialized/archived pets in the count. The oldest valid co-carer membership per eligible pet remains enabled. Additional pets remain readable by their owner; excess memberships are retained and reactivate with the owner's Pro renewal. No automatic deletion is introduced.

Apply the migration after the subscription reliability and co-care integrity migrations (and the rest of the current migration set), before distributing the updated app. Older standalone repair scripts contain the previous tier definitions; applying them later requires reapplying this migration last. Validate Free, Pro, expired Pro and Free invitees in staging before release.

## Validation

`npm test` covers pet four, memorialized pet counting, independent per-pet co-care slots, pending reservations, Free invitee acceptance, permission boundaries, unrestricted saved care/activity counts, Pro expansion and reversible downgrades. It also exercises the existing billing, medical-record, notification, storage and migration suites.

`npm run check` runs TypeScript, ESLint and architecture validation. ESLint currently reports repository warnings; no errors are permitted by this check.

## Design exploration

The proposed subscription redesign is documented separately in `design/subscription-flow-v1/README.md`. Those mockups are iteration artifacts; this code change updates tier behavior and copy without implementing the proposed redesign.
