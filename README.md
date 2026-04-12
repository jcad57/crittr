# Crittr

**Crittr** is a mobile app for people who care for pets—built to keep daily care, health history, and household coordination in one calm, organized place. It runs on **iOS** and **Android** (React Native + Expo).

---

## What Crittr does

Crittr centers on **each pet’s profile**: who they are, what they eat, their vet, medications, vaccinations, and a running log of **activities** (walks, meals, notes, vet visits, and more). A **home dashboard** surfaces what matters today, and a **health** area pulls together medications, vaccines, weight, and upcoming visits so nothing slips through the cracks.

The **free** tier is designed to get a single pet fully set up with core logging and profiles. **Crittr Pro** expands limits and unlocks sharing, document storage, AI help, and richer reminders—subscription handled through **Stripe**.

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
- **Crittr Pro** — Upgrade path with comparison of Free vs Pro, trial and subscription via Stripe, and **subscriptions / billing** management (plan details, cancel at period end, payment method and address through Stripe’s customer portal).
- **Help center & feedback** — In-app FAQs, privacy policy access, and a channel to send feedback to the team.

---

## Tech stack

| Area | Choice |
|------|--------|
| App | [Expo](https://expo.dev) (SDK 54), [Expo Router](https://docs.expo.dev/router/introduction/), React Native |
| Language | TypeScript |
| Backend & auth | [Supabase](https://supabase.com) (PostgreSQL, Auth, Storage, Edge Functions) |
| Payments | [Stripe](https://stripe.com) via `@stripe/stripe-react-native` + Supabase Edge Functions |
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

The app expects Supabase and (for Pro checkout) Stripe keys via Expo public env vars—configure them in `.env` or your host’s secret store and document them for your team. Edge Functions under `supabase/functions/` extend the backend (subscriptions, webhooks, AI, email, etc.) and are deployed separately with the Supabase CLI.

---

## License & contributing

This repository is **private** unless you choose otherwise. Contribution and license terms are up to the maintainers—add a `LICENSE` file when you’re ready.

---

<p align="center">
  <sub>Built with care for pets and the people who love them.</sub>
</p>
