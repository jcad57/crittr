# Medical record upload audit — October 28, 2026

The upload, record list, record detail, private Storage policies, authenticated file-serving function, deletion paths, and native viewer were audited and updated locally. No hosted database changes, Edge deployments, scheduler changes, purchases, or real record uploads were performed.

## Access and paywall

The list already displayed the records Pro card for free accounts; Add files already used the contextual Pro gate. Both creation and additional uploads now check entitlement again at submission, so a subscription that expires while the picker is open returns the user to the upgrade flow. The upload modal fully dismisses before another screen or sheet opens on iOS.

The subscription reliability migration's restrictive database and Storage policies enforce Pro independently of the client. PostgreSQL tests verify denial for free/expired accounts and view-only co-carers. Owners retain read access to existing uploads after downgrade, matching the existing data-retention policy. Additional pets can become read-only after downgrade under the existing subscription rules.

## Findings and changes

| Finding | Result |
| --- | --- |
| Closing during download could reopen the viewer when the request completed. | Preview requests are fenced on Close, record changes, newer selections, and unmount. Close also handles Android Back and remains enabled during loading. |
| Save/share controls were absent for renderable images and PDFs. | The viewer has a filename, a persistent Close button, and persistent Save/Share actions. Its modal measures its own safe area. Image/render failures offer an explicit native open action. |
| Android WebView could present a blank PDF. | Android PDFs use an explicit Open in another app action; the Crittr viewer remains available on return. iOS PDFs and images preview inside Crittr. No third-party document-rendering service receives the file. |
| HTML attachments could run in a broadly permitted local WebView. | HTML uses the external fallback. Inline previews disable JavaScript and restrict navigation/read access to the downloaded document. |
| Retrying a partial upload could create another record and duplicate successful attachments. | Record and picker file IDs stay stable during retries. Completed files leave the pending list; retries reconcile committed rows, including lost HTTP responses. Partial records stay visible after failure. Cancelling a failed upload may leave a named record with zero files, which can be completed or deleted. |
| Picker size hints could be saved instead of the actual uploaded size. Unknown formats fell back to JPEG. | Actual file size is checked before any upload; MIME fallback is application/octet-stream. Files are limited to 25 MiB (shown as 25 MB), with the same bucket limit. |
| Native upload/download requests bypassed the Supabase fetch timeout. | Native tasks have a 150-second timeout and cancellation; downloads reject incomplete copies and account changes. |
| Repeated list requests downloaded every file ID to count attachments. | One relational request returns records and aggregate counts; detail retrieval also uses one relational request. Batch mutations refresh queries once on settlement, including partial failure. |
| Export actions need the same bytes and a readable filename as the preview. | Viewer Save/Share reuse the loaded local copy and retain a readable original filename. Android saves in bounded chunks to the user-selected folder; iOS exposes Save to Files in its system sheet. |
| Security-scoped/cloud picker files could become unreadable after dismissal. | DocumentPicker copies selected files into its cache while it has permission. Import errors are visible. |
| Removing Storage bytes before deleting metadata could break a still-listed record. Cascades could leave orphan bytes. | Database deletion queues cleanup transactionally before best-effort Storage removal. A private worker retries file, record, pet, and account cleanup. New unlinked uploads get a 24-hour grace period, then become eligible for cleanup. Linked files are excluded by the worker. |
| Attachment metadata could reference a different record/pet path. | New attachment paths must match pet/record/file IDs and an existing private object. Record identity and attachment rows cannot be retargeted. Legacy paths remain readable. |
| Account cleanup queried the retired pet_medical_record_uploads table. | It now queries the grouped file relation. Cascading account deletion also enters the durable cleanup queue. |
| Downloaded previews accumulated in the general cache. | Previews have isolated directories, expire after 24 hours when subsequent downloads prune the cache, and are cleared when account/session state is cleared. |

## Validation

- `npm test`: passes. Includes service, viewer-control, stale-download, native-transfer timeout, Android bounded-save, authenticated streaming, worker retry, and real PostgreSQL/RLS tests.
- `npm run check`: passes type checking, lint with warnings, and architecture checks.
- `git diff --check`: passes.
- Database tests cover attachment binding, the size ceiling, Pro denial, retained reads, unrelated accounts, co-carer permissions, delayed abandoned-upload cleanup, pet/account cascades, and safe migration reruns.
- Native simulator UI was unavailable through the enabled computer-use surface. iOS/Android system share sheets, Files/document providers, safe areas, and Android PDF handoff still need a device smoke test. Automated native API mocks do not establish visual correctness.
- An additional standalone `tsc -p supabase/functions/tsconfig.json` check is not a usable Deno gate in this repository: existing ambient Supabase declarations infer `never`, Deno/JSR imports are unresolved, and `.ts` imports are not enabled. Edge handlers are exercised by isolated request tests; run `deno check` against the deployed entry points in the deployment environment.

## Deployment order

1. Confirm the hosted subscription reliability policies from `20261026120000_subscription_reliability.sql` are installed. The repository notes that historical migration history may differ from production; review the target before applying SQL. Do not run an unreviewed blanket database push.
2. Apply `supabase/migrations/20261028150000_medical_record_integrity.sql`. It is rerunnable, preserves existing files, validates new attachment paths, and creates the cleanup outbox. Deploy this before releasing the updated deletion client.
3. Deploy `serve-medical-record-file`, `delete-account`, and `cleanup-medical-record-storage` with the supplied function config.
4. Provision a random server-only `MEDICAL_RECORD_CLEANUP_AUTH` Edge secret. Save the same value in Vault as `crittr_medical_record_cleanup_auth`; save the project base URL as `crittr_medical_record_project_url`. Run `docs/sql/schedule-medical-record-cleanup.sql`. It processes up to 100 due objects every five minutes. Monitor overdue rows and failed HTTP runs. Cleanup requires this scheduler, even when no app is open.
5. Release the app changes and perform the device checks below.

Objects orphaned before the new migration are not automatically backfilled. Use `docs/sql/audit-medical-record-storage.sql` for a read-only inventory of historical unlinked or missing objects before deciding on repair/cleanup. Never delete Storage metadata rows directly; use the Storage API to remove bytes.

## Device smoke test

1. On a free account, open Medical Records and use Add files from an existing record. Confirm the upgrade flow and verify no picker/upload opens. Repeat after Pro expires with an already-open picker.
2. On Pro, create a record with a PDF, several photos, and a document. Check names/counts after refresh/relaunch. Import from iCloud/Files and Android document providers. Verify zero-byte and oversized files are rejected.
3. Open each supported preview. Close immediately during a slow download, then open another file. Confirm no late result reopens or replaces the viewer. Check small screens, a notched iPhone, iPad, Android Back, and large accessibility text.
4. From the viewer, share and save; cancel each system sheet as well. Verify the exported filename and bytes. On Android, open a PDF externally and return to the Crittr viewer.
5. Interrupt the second upload in a batch, reconnect, and retry. Confirm only missing files upload into the same record. Delete a file/record while Storage is unavailable, then confirm the scheduled retry empties the due queue without removing linked files.

The optional Crittr AI scan remains disabled by its existing feature flag. Its separate 10 MB/file parser limit and extraction/review behavior were not changed by this upload/viewer work.

Platform behavior references: [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/), [Expo legacy FileSystem / SAF](https://docs.expo.dev/versions/latest/sdk/filesystem-legacy/), and [React Native WebView reference](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md). The installed SDK source was also checked when implementing the Android file operations.
