**Crittr — detailed feature inventory**

Reviewed October 12, 2026. This description is based on the repository's app screens, components, services, data types, database migrations, backend functions, and product notes. It describes what the current source implements; it does not verify deployment, store availability, or operation against a live backend. Planning notes are distinguished from features exposed in the app.

**A description you can share**

Crittr is a mobile pet-care organizer for people caring for dogs and cats. It brings each pet's profile, feeding routine, exercise goals, medication schedule, vaccinations, vet appointments, weight history, and daily care logs into one place. Its dashboard shows the care logged so far and the tasks that still need attention. Free includes three owned pets and one co-carer per pet. Crittr Pro adds unlimited pets and co-carers, medical-document uploads, and an AI assistant that uses saved pet information to answer care questions.

**1. Accounts and guided setup**

- Create an account with first name, last name, email, and password.
- Confirm an email address with an emailed verification code; request another code if necessary.
- Sign in with email and password, with saved sessions for returning users.
- Build a caregiver profile with a photo, optional home address, optional phone number, and short bio.
- Follow a guided setup covering pet type, pet details, food, veterinarian, identification and insurance details, medications, and vaccinations.
- Skip optional veterinarian, identification, medication, and vaccination steps when the information is unavailable or unnecessary.
- Set household litter-maintenance goals when setting up the first cat.
- Review and edit the pet setup before saving it.
- Resume incomplete onboarding at an appropriate step.
- Review pending shared-care invitations during onboarding. An eligible user who accepts an invitation can proceed with a shared pet without creating their own pet profile.
- Receive an optional Pro upgrade offer after setup and a notification-permission prompt on the dashboard.

Google authentication has an implementation, but its sign-in and sign-up buttons are currently disabled. Apple and Facebook sign-in are not current exposed features.

**2. Detailed pet profiles**

- Set up new profiles for dogs and cats.
- Save a pet's photo, name, breed, coat color, sex, spay/neuter status, and short description.
- Enter a birthday or an approximate age in years and months during setup.
- Record weight in pounds or kilograms.
- Record energy level and a target number of exercise activities per day.
- Add allergies using suggestions or custom entries.
- Save the primary vet clinic and its address.
- Record microchip status and microchip number.
- Record insurance status, insurer, and policy/member number.
- Keep food, medication, vaccination, identification, insurance, document, and activity information connected to the same pet.
- Edit the pet's photo, name, breed, core details, exercise target, identification, and insurance through dedicated screens.

The profile acts as the pet's central reference page. It displays weight, birthday, sex, care details, feeding routines, active medications, vaccination attention items, and links to records and history. Some attributes gathered during onboarding do not have equivalent dedicated editing controls later.

**3. Multiple pets and pet switching**

- Browse pets in a dedicated My pets screen.
- Open a pet's profile from its card or the caregiver's profile.
- Switch the active pet on the dashboard, activity screen, and many pet-related screens.
- Keep each pet's activity history and care records separate.
- View owned pets and pets shared through co-care, with role distinctions.
- Add up to three owned pets on Free, or unlimited pets through the guided flow with Crittr Pro.

Free includes three owned pets total, including memorialized pets; Pro includes unlimited pets. Shared pets do not consume the owned-pet limit. The data model also includes other species, but new-pet setup currently exposes dogs and cats only.

**4. Dashboard and care progress**

- See a personalized home screen with pet switching and a notification badge.
- Track the selected pet's logged care against configured goals with progress rings.
- For dogs, see exercise, meals, treats, and medications.
- For cats, see exercise, meals, litter maintenance, and medications.
- Derive feeding goals from saved food routines and scheduled portions.
- Derive medication progress from saved schedules and dose logs.
- See a completion state when configured progress categories are fulfilled.
- Review today's activity feed and open entries to manage them.
- Start a new activity log directly from the dashboard.
- Review medication status, vaccination attention items, and upcoming vet appointments.
- Open household maintenance settings when cats are present.
- Pull to refresh dashboard information.

Exercise progress counts logged exercise sessions against the target number of activities; it does not automatically measure movement or infer completed care.

**5. Activity logging**

Crittr supports the following care entries:

| Entry | Information a caregiver can record |
|---|---|
| Exercise | Label, duration, optional distance in miles, optional location, time, and notes. Dog options include Walk, Run, Dog Park, Home Playtime, and a custom Other type. Cat exercise omits the dog-oriented type selector. |
| Meal or treat | Label, meal/treat selection, saved food or a custom food not listed, amount, cups/ounces/pieces, time, and notes. |
| Medication administration | Saved medication, amount, dosage form, time, and notes such as how it was given. |
| Training | Optional title, required location and duration in minutes, time, and notes. Exposed for dogs. |
| Potty | Pee, poo, or both, time, optional location, and notes. Exposed for dogs. |
| Maintenance | What was done, time, and notes, such as scooping or changing litter. Exposed for cats. |
| Weigh-in | Positive weight, pounds/kilograms, time, optional label, and notes. |
| Vet visit | Appointment title, scheduled date/time, clinic or other location, and notes through the dedicated visit flow. Scheduled visits appear in activity history on the day of the appointment. |

- Activity entries record the pet, the caregiver who logged them, and a timestamp.
- When adding an activity, choose a time on the current day or let the save time be used.
- Log an exercise event for multiple pets using the same details.
- Log meals or treats for multiple pets with individual food choices and portions, while sharing the event context.
- The medication flow also offers an option to log the same medication and dose for additional pets.
- Reopen entries to change their details or delete them, subject to the app's access rules.
- Notes are indicated in history so caregivers can spot entries containing additional information.

Location and exercise distance are entered manually. The source does not implement GPS route recording or automatic activity tracking. Activity-time editing varies by type; exercise, food, and medication update services preserve the original timestamp, while newer entry types support time updates.

**6. History and weekly summaries**

- Browse a pet's recorded activities across days, grouped into dated sections.
- See entry type, title, recorded time, caregiver attribution, relevant amounts/duration, and note indicators.
- Filter by exercise, meals, treats, medications, vet visits, and weigh-ins.
- Use additional training and potty filters for dogs, or maintenance for cats.
- Sort history newest first or oldest first.
- Filter to one calendar date and clear the date filter to return to broader history.
- Review a Week at a glance summary.
- Compare weekly exercise and meal counts with the preceding week.
- See weekly treats for dogs or maintenance counts for cats.
- Open a pet-specific history page from its profile.

The week begins Monday. The dog weekly treat summary currently uses a fixed reference value of five; this is not a personalized veterinary recommendation or a configurable weekly treat allowance.

**7. Feeding routines**

- Save foods by brand/name and identify each as a meal or treat.
- For meal foods, add multiple feeding times and portions, with an amount and unit for each scheduled serving.
- Add, edit, or remove individual scheduled portions.
- For treats, record portion information and a frequency of one to eight times per day.
- Keep feeding notes alongside each food.
- Edit and remove saved foods through the food manager.
- Select saved foods when logging an actual meal or treat.
- Log a custom food through Other without adding it to the normal feeding routine.
- Use saved routines to determine dashboard meal and treat targets.

The distinction between a routine and a log is useful: the routine describes intended care, and the activity log records what a person actually did.

**8. Medication management**

- Save medication name, dosage, dosage form, condition, and notes.
- Choose Tablet, Injection, Liquid, Topical, Chewable, or Other as the dosage form.
- Configure doses per day, week, or month.
- Configure custom intervals such as every several days, weeks, or months.
- Set one or multiple reminder times.
- Record the date the medication was last given.
- See due-today, due-soon, upcoming-date, and completion information derived from the saved schedule and logs.
- See dose progress and last administration information.
- Log a dose from the activity flow or use the Health screen's quick action for the next outstanding medication.
- Add, edit, and remove medication records.

Crittr records the caregiver's medication plan and administrations. It does not prescribe medication or decide treatment.

**9. Vaccinations and veterinarian appointments**

- Store vaccine name, date administered, expiry/next-due date, administering vet/clinic, lot number, and notes.
- Add, edit, and remove vaccination records.
- Show Current, Exp. soon, and Overdue vaccine status.
- Highlight vaccinations expiring within 60 days or already overdue.
- Schedule a future veterinarian appointment with a title, date/time, saved primary clinic or other location, and notes.
- Edit or delete scheduled visits.
- Surface upcoming appointments on the dashboard and Health screen.
- Mirror a scheduled visit into activity history on the appointment's local calendar day.

These are appointments recorded by the user. No clinic booking service or direct veterinarian integration is implemented.

**10. Health hub and weight history**

- Use the Health screen to review the selected pet's medications, vaccination records, and upcoming appointments.
- See an action-needed banner for outstanding medication care and record the next dose with a quick action.
- Navigate to medication/vaccination management, medical documents, and microchip details.
- Log weigh-ins that also update the pet's current weight and create an activity entry.
- View a weight trend chart over one week, one month, three months, six months, one year, or all history.
- See the latest reading in the selected range, change across that range, high and low readings, and number of entries.
- View all recorded weigh-ins in a dated list.
- Normalize mixed pound/kilogram entries to the displayed unit.
- Delete a weigh-in and its linked activity entry; the stored pet weight is updated from remaining readings when available.

Weight history is reached from the pet profile's weight chip. The current Health screen itself focuses on medications, vaccinations, appointments, and record links.

**11. Medical records, microchips, and insurance documents**

- With Pro, create named medical records containing one or several attachments.
- Choose documents from the device's file picker, select photos from the library, or take a photo of paperwork.
- Upload multiple files/photos in a selection.
- View uploaded records and attachment counts.
- Rename a record, add more files, remove individual files, or delete the whole record.
- Preview supported files with persistent Close, Save, and Share actions. Android PDFs offer an explicit native open action; iOS saves through Save to Files and Android saves to a selected folder.
- Store microchip status and its identification number.
- Store insurance status, provider, and policy/member number.
- Attach insurance policy files or photos, open them, and remove them.
- Apply pet-specific access controls to private document storage.

Insurance attachments require Pro and profile-edit permissions, with checks before file picking and upload and matching server policies. Medical-record creation and additional uploads are gated through the Pro upgrade flow at entry and submission. Existing medical records remain readable after downgrade. Uploads support retrying the remaining files in the same record and a 25 MB per-file limit. The From your vet area currently has an empty data source; it does not receive records automatically from clinics.

**12. Shared care with co-carers**

- Invite someone by email to care for a specific pet.
- Send registered users an in-app invitation and invite people without accounts by email.
- Allow Free invitees to receive and accept shared-care invitations.
- Include one co-carer per pet on Free; the owner needs Pro to add more. Pending invitations reserve a slot.
- Choose the co-carer's permissions before sending the invitation.
- Allow shared viewing of the pet profile and records, with separately controlled editing/contribution abilities.
- Control seven permissions: log activities, edit the pet profile, manage food, manage medications, manage vaccinations, manage vet visits, and manage medical files.
- By default, allow activity logging while leaving management/edit permissions off.
- View pending invites, revoke them, and view accepted co-carers.
- Change an existing co-carer's permissions or remove them.
- Let a co-carer leave voluntarily.
- Show shared pets alongside a caregiver's own pets.
- Attribute activity entries to the person who recorded them.
- Show read-only views when a co-carer lacks a particular management permission.
- Notify caregivers about acceptance, removal, departure, and shared-pet activity.

Co-care provides a common care record for households, family members, and sitters. It does not include a caregiver-to-caregiver chat or sitter marketplace.

**13. Notifications and reminders**

- Ask for notification permission after setup and show current system-permission status in settings.
- Toggle all notification categories together or change meals/treats, medications, vet visits, and co-care activities individually.
- Open device settings when system notifications are blocked.
- Schedule one consolidated daily feeding reminder per pet after the latest configured feeding time; treats without times use an evening fallback.
- Schedule medication reminders about five minutes before configured times, batching medications due at the same time.
- Use scheduled due dates for interval medications rather than reminding daily.
- Schedule veterinarian appointment reminders about one hour beforehand.
- Schedule a 3 p.m. exercise check-in when exercise goals remain unfulfilled at the scheduling check.
- Deliver remote push alerts when another caregiver logs care for a shared pet, where permissions and backend configuration allow.
- Provide an in-app notification inbox with unread counts, Read all, and invitation Accept/Decline actions.
- Open a related activity from shared-care alerts carrying the relevant navigation link.
- Refresh reminder schedules on relevant data/preference changes, app foregrounding, and day changes.

The implemented scheduler and notification settings do not currently check Pro status, despite product notes describing reminders as a Pro benefit. Vaccination expiry attention is implemented visually; the supplied reminder scheduler does not schedule vaccine-expiry push alerts. Local reminder payloads also do not consistently carry the route used by the notification navigation listener, so not every reminder supports a specific-screen destination. Scheduled nudges depend on the data available when schedules are rebuilt.

**14. CrittrAI — Pro**

- Ask pet-care questions in a conversational chat.
- Receive help with routines, behavior, enrichment, basic training, and general wellness.
- Ground responses in a fresh snapshot of owned and co-cared pets.
- Include pet identity, age, weight, sex, coat, bio, allergies, energy/exercise targets, veterinarian, identification, insurance, feeding routines, medications, vaccinations, and up to five latest scheduled vet-visit records per pet in that snapshot.
- Keep a saved conversation and reload its history when returning to the chat.
- Display formatted responses with Markdown and a typing reveal.
- Start a new conversation by clearing existing chat history after confirmation.
- Use a backend call to Anthropic/Claude, rather than exposing the model API key in the app.
- Instruct the assistant to avoid diagnosis, prescribing, or medication changes and direct medical decisions to a veterinarian.

The current context builder does not fetch the general exercise/food/potty activity history, weight-history series, or uploaded document contents. Therefore, describe CrittrAI as informed by saved pet profiles and care records, rather than as analyzing all logged behavior or every medical document. There is no implemented live-web research tool in the chat backend.

**15. Membership and subscriptions**

- Compare Free and Pro benefits in an upgrade screen.
- Select monthly or annual billing.
- Use native Apple App Store or Google Play purchase flows through RevenueCat.
- Present a seven-day trial offer where eligible; actual trial and localized pricing depend on the store's product configuration.
- Activate Pro access after purchase and provide retry controls if activation needs another attempt.
- Restore purchases from checkout or subscription management.
- Review plan, store, subscription status, price, renewal/access dates, trial details, and cancellation state.
- Open Apple/Google subscription settings to manage billing or cancel.
- Recognize shared Apple subscription ownership in the subscription display when RevenueCat reports it.
- Remove ads for Pro members; Free includes configured banner and full-screen ad placements.
- Personalize the Pro profile banner/crown with Slate, Gold, or Royal purple themes.

The repository contains fallback display prices of $4.99 monthly and $39.99 annually. These are not verified live prices and should not be treated as a fixed public pricing promise.

**16. Profile, settings, support, and lifecycle**

- View and update the caregiver's profile photo and bio.
- View account identity and member-since information.
- Edit first name, last name, address, and phone number.
- Display the account email; the current Edit account screen does not expose email editing.
- Reset a password with an emailed code and set a new password.
- Allow an existing OAuth-only account to add an email/password sign-in credential.
- Choose 12-hour or 24-hour clocks and month-first or day-first date formats.
- Browse expandable Help center FAQs grouped by category.
- Submit general feedback, bug reports, or feature ideas with an optional subject and message.
- Read in-app Privacy policy and Terms of Service screens.
- Sign out or permanently delete the account and associated pet/care data through a confirmation flow.
- Memorialize a pet while retaining its profile in My pets and removing it from active dashboards and care pickers.
- Restore a memorialized pet to active use.
- Permanently delete a pet when the owner chooses to remove its data.

**Free and Pro: what the current implementation supports**

| Capability | Free | Pro |
|---|---|---|
| Owned pets | 3 total, including memorialized pets | Unlimited |
| Activity logging/history | Unlimited | Unlimited |
| Saved meals/treats | Unlimited | Unlimited |
| Saved medications | Unlimited | Unlimited |
| Saved vaccinations | Unlimited | Unlimited |
| Medical-record uploads | Upgrade required | Available |
| Co-care | 1 co-carer per pet; invitees may be Free | Unlimited co-carers; invitees may be Free |
| CrittrAI | Upgrade required | Available |
| Advertising | Currently paused in feature flags | Ad-free |
| Reminder settings/scheduling | No Pro gate found | Available |
| Insurance attachments | Upgrade required for uploads | Available |
| Pro banner themes | Unavailable | Available |

Tier rules and paywalls were revised October 28, 2026. See `revised-free-pro-tiers.md` for the agreed limits, entry points, downgrade policy and rollout requirements. These source changes require the corresponding database migration before release.

**Implemented or described in the repository, but not a current available feature**

- **AI medical-record extraction:** A backend parser and review UI can extract medications and vaccinations from images/PDFs, detect probable duplicates, and offer Skip/Add/Update choices. The record-upload screen currently sets `ENABLE_MEDICAL_RECORD_CRITTR_AI_SCAN = false`, so this workflow is not exposed. The parser code supports up to 12 files per scan and a 10 MB per-file ceiling.
- **Additional species:** Fish, birds, reptiles, and small mammals appear in data types and planning notes; the new-pet picker exposes dogs and cats.
- **Google sign-in:** Implemented but hidden by the authentication UI feature flag.
- **Apple/Facebook sign-in:** Mentioned in initial planning, without current exposed implementations.
- **PDF care-report export:** Described in initial product notes; no implemented report-generation workflow was found. Sharing an uploaded file is available.
- **Learn/articles:** Planned in the More feature notes; the current More screen exposes CrittrAI and Profile.
- **Automatic clinic record delivery:** The From your vet list currently receives no rows.
- **Automatic veterinary booking, GPS routes, and offline write synchronization:** No implemented user flows were found.

**Material lifecycle details to resolve before publishing product promises**

- Pro expiration retains all pet data and memberships. The oldest three owned pets and one valid co-carer per eligible pet remain usable on Free; excess access reactivates on renewal.
- Account-deletion UI says a Pro subscription will be cancelled, but the deletion backend explicitly states that deleting the RevenueCat subscriber does not cancel an Apple/Google subscription. Store subscription management is a separate action.
- Privacy policy and Terms source files identify their content as mock/draft text. Their presence is a feature, but their contents should not be described as a finalized legal policy.
- Server deployment, provider configuration, store offerings, notification permissions, and OS behavior affect features such as AI, email feedback/invitations, purchases, and push delivery. This inventory verifies source behavior, not those operational prerequisites.

**Selected implementation references**

- [Pet types and current picker options](/Users/jcadeichmann/Desktop/Pegasys/crittr/constants/petTypeIcons.ts)
- [Dashboard](/Users/jcadeichmann/Desktop/Pegasys/crittr/app/(logged-in)/(tabs)/dashboard.tsx)
- [Activity logging](/Users/jcadeichmann/Desktop/Pegasys/crittr/app/(logged-in)/add-activity.tsx)
- [Activity history](/Users/jcadeichmann/Desktop/Pegasys/crittr/data/activityHistory.ts)
- [Co-care permissions](/Users/jcadeichmann/Desktop/Pegasys/crittr/constants/coCarePermissionRows.ts)
- [Shared-care invitation and access logic](/Users/jcadeichmann/Desktop/Pegasys/crittr/services/coCare.ts)
- [Reminder scheduling](/Users/jcadeichmann/Desktop/Pegasys/crittr/lib/reminderNotificationSchedule.ts)
- [CrittrAI pet context](/Users/jcadeichmann/Desktop/Pegasys/crittr/supabase/functions/_shared/crittrAiPetContext.ts)
- [Medical-record screen and disabled scan flag](/Users/jcadeichmann/Desktop/Pegasys/crittr/app/(logged-in)/pet/[id]/medical-records.tsx)
- [Pro comparison copy](/Users/jcadeichmann/Desktop/Pegasys/crittr/constants/proCopy.ts)
- [Pro-expiration cleanup](/Users/jcadeichmann/Desktop/Pegasys/crittr/supabase/functions/_shared/crittrProDowngradeCleanup.ts)
- [Account deletion](/Users/jcadeichmann/Desktop/Pegasys/crittr/supabase/functions/delete-account/index.ts)
