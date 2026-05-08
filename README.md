# Crittr

**Crittr** is a mobile app for people who care for pets—built to keep daily care, health history, and household coordination in one calm, organized place. It runs on **iOS** and **Android** (React Native + Expo).

---

## What Crittr does

Crittr centers on **each pet’s profile**: who they are, what they eat, their vet, medications, vaccinations, and a running log of **activities** (walks, meals, notes, vet visits, and more). A **home dashboard** surfaces what matters today, and a **health** area pulls together medications, vaccines, weight, and upcoming visits so nothing slips through the cracks.

The **free** tier is designed to get a single pet fully set up with core logging and profiles. **Crittr Pro** expands limits and unlocks sharing, document storage, AI help, and richer reminders—subscriptions are handled through **Apple In‑App Purchase / Google Play Billing** via **RevenueCat**.

---

## Features

### Pet profiles & household

- **Rich pet profiles** — Basics (name, breed, age/DOB, photos), energy and care details, food preferences, vet clinic, exercise needs, and optional fields like microchip or insurance.
- **Multiple pets (Pro)** — Manage unlimited companions; free tier focuses on one pet’s full setup with clear upgrade paths when you add more.
- **Memorial & visibility** — Support for honoring a pet’s memory and controlling how they appear in your app when circumstances change.

### Activity & daily care

- **Activity logging** — Log walks, play, meals, treats, medications, vet visits, and other events with timestamps and context.
- **History & filters** — Review what happened and when, with flows to edit or revisit past entries.
- **Dashboard** — At-a-glance progress and recent activity so today’s care is obvious at open.

### Health & records

- **Health hub** — Medications, vaccinations, weight trends, and vet visit awareness in one place.
- **Medical records (Pro)** — Attach documents and files per pet so records live next to the rest of their story.
- **Vet visits & vaccinations** — Dedicated flows to add and track visits and shot schedules.

### Co-care (Pro)

- **Invite co-carers** — Share a pet with family or sitters by email with **permission controls** so people only see and do what you allow.
- **Notifications** — Stay aware when shared care generates updates that matter to you.

### CrittrAI (Pro)

- **Context-aware assistance** — Ask questions and get help grounded in the pet data you’ve saved, so answers stay relevant to *your* animals—not generic web fluff.

### Notifications & reminders (Pro)

- **Push notifications** — Reminders and activity-related alerts so schedules don’t rely on memory alone.
- **Settings** — Tune what you receive and jump to system permissions when needed.

### Account & trust

- **Guided onboarding** — Sign up, verify email, build your profile, and add pets through a stepped flow (with room to accept pending invites when applicable).
- **Profile & account** — Avatar, bio, member info, and account editing.
- **Crittr Pro** — Upgrade path with comparison of Free vs Pro, trial and subscription via Apple/Google In‑App Purchase, and a **subscriptions** screen that links to the App Store / Play Store for plan management, restore purchases, and cancellation.
- **Help center & feedback** — In-app FAQs, privacy policy access, and a channel to send feedback to the team.

---

## Tech stack

| Area | Choice |
|------|--------|
| App | [Expo](https://expo.dev) (SDK 54), [Expo Router](https://docs.expo.dev/router/introduction/), React Native |
| Language | TypeScript |
| Backend & auth | [Supabase](https://supabase.com) (PostgreSQL, Auth, Storage, Edge Functions) |
| Payments | Apple IAP / Google Play Billing via [RevenueCat](https://www.revenuecat.com) (`react-native-purchases`) + Supabase Edge Functions |
| Data fetching | [TanStack Query](https://tanstack.com/query) |
| Client state | [Zustand](https://github.com/pmndrs/zustand) |

---

## Getting started (development)

**Requirements:** Node.js, npm, and either Xcode (iOS) / Android Studio (Android) or a physical device with Expo tooling.

```bash
git clone <your-repo-url>
cd crittr
npm install
npx expo start
```

Then open in the **iOS Simulator**, **Android emulator**, or **Expo Go** / a **development build** as prompted in the terminal.

Useful scripts:

| Command | Purpose |
|---------|---------|
| `npm run start` | Start the Metro bundler (`npx expo start`) |
| `npm run ios` / `npm run android` | Run on a simulator or device |
| `npm run lint` | Run ESLint (`expo lint`) |

### Environment

The app expects the following public Expo env vars (configure in `.env` or your secret store):

| Var | Purpose |
|-----|---------|
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase project |
| `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` / `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID` | RevenueCat public SDK keys |

Copy `.env.example` to `.env` locally. For EAS builds, mirror those `EXPO_PUBLIC_*` values in the Expo project’s environment variables.

Edge Function secrets (set via `supabase secrets set ...`):

| Secret | Used by |
|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | All edge functions |
| `REVENUECAT_SECRET_API_KEY` | `revenuecat-webhook`, `sync-crittr-pro-entitlement`, `delete-account` (best-effort subscriber purge) |
| `REVENUECAT_WEBHOOK_AUTH` | `revenuecat-webhook` (shared secret matched against the `Authorization` header configured in the RevenueCat dashboard) |

### iOS: TestFlight, App Store, and In-App Purchase

**Expo / EAS**

- **StoreKit Configuration** (Xcode) is for fast local iteration only. **TestFlight** uses **Apple’s sandbox** for subscriptions; behavior should match production more closely than a `.storekit` file.
- **Embed env at build time:** `EXPO_PUBLIC_*` variables are inlined when the **native** binary is built. For `eas build`, define them under **Expo dashboard → Environment variables** for the **production** profile (or use `eas env:*` CLI). A build without `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` will not initialize RevenueCat (you’ll see a **native** log: missing API key).
- **Bundle ID** in RevenueCat and App Store Connect must match **`app.json` → `ios.bundleIdentifier`** (`com.jcadeichmann.crittr`).

**App Store Connect**

- Sign the **Paid Applications** agreement and complete **banking / tax** if you charge for subscriptions.
- Create the **auto-renewable subscriptions** (`crittr_pro_monthly`, `crittr_pro_annual` or your real IDs), attach them to a **subscription group**, and submit subscription **metadata** for review when required.
- Product IDs must match what you configured in **RevenueCat** (products linked to entitlement **`crittr_pro`**) and what the Edge Function expects under **known product ids** in `supabase/functions/_shared/revenueCatEntitlement.ts`.

**RevenueCat**

- **iOS app** uses the same **bundle ID** as the store listing.
- **Public** SDK key → app (`EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`). **Secret** key → Supabase Edge Function secrets (`REVENUECAT_SECRET_API_KEY`) — same project as the public key.
- **Webhook** URL: `https://<project-ref>.functions.supabase.co/revenuecat-webhook` with **`--no-verify-jwt`**, plus shared secret `REVENUECAT_WEBHOOK_AUTH` in RC and Supabase.

**Supabase**

- Deploy **`sync-crittr-pro-entitlement`** and **`revenuecat-webhook`** after changing shared entitlement code.
- Pro state in the app comes from **`profiles.crittr_pro_until`** (updated by the webhook + client-triggered sync).

**On-device TestFlight test**

1. Install the build from TestFlight.
2. Sign in to the app with a real Crittr account.
3. Subscribe with a **Sandbox** Apple account (Settings → App Store → Sandbox Account on iOS, or sign in when prompted).
4. Confirm **RevenueCat dashboard** shows the subscriber with entitlement **`crittr_pro`**, then **Supabase** `profiles.crittr_pro_until` is non-null and in the future.

Edge Functions under `supabase/functions/` extend the backend (entitlement webhook + sync, AI, email, etc.) and are deployed separately with the Supabase CLI.

---

## License & contributing

This repository is **private** unless you choose otherwise. Contribution and license terms are up to the maintainers—add a `LICENSE` file when you’re ready.

---

<p align="center">
  <sub>Built with care for pets and the people who love them.</sub>
</p>
