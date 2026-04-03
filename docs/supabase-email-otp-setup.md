# Supabase email OTP (sign-up verification) — setup for Crittr

This app sends a **6-digit OTP** after sign-up and verifies it with `supabase.auth.verifyOtp({ type: "signup" })`. Use the steps below so **development (Expo Go)** and **production** builds behave correctly.

## 1. Dashboard: enable email confirmations

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Providers** → **Email**.
2. Turn **Confirm email** on (required for OTP / “no session until verified” behavior).
3. Under **Auth** → **Email Templates**, open **Confirm signup**. The default template sends a **magic link**. For a **6-digit OTP** experience in-app, configure the template Supabase uses for signup confirmation so it includes `{{ .Token }}` (or your project’s documented token variable — see template editor hints). Many projects use a custom body like: “Your code is `{{ .Token }}`” so the email shows the same digits the user types in the app.

   - **Local dev:** With Supabase CLI, `supabase start` exposes **Inbucket** for test emails; open the URL printed in the terminal to read messages and copy the code.
   - **Hosted project:** Use **Authentication** → **Users** → pick user → **Send magic link** is not the same as resend OTP; use the app’s **Resend code** after first sign-up, or trigger a new sign-up.

4. **OTP expiry:** In **Authentication** → **Providers** → **Email** (or **Auth** → **Settings**), note **OTP expiry** / confirmation window. Codes older than that will fail with an “expired” style error; the app maps those to a friendly message.

## 2. Site URL and redirect URLs (Expo Go + production)

1. **Authentication** → **URL Configuration**.
2. **Site URL:** set to your primary redirect base, e.g. production: `https://yourdomain.com` or your app’s marketing URL. For pure mobile OTP, this matters most if you add **magic links** later; still set something valid.
3. **Redirect URLs:** add every scheme your app uses:

   - **Expo / dev client / production app:** Crittr uses the scheme **`crittr`** (see `app.json` → `expo.scheme`). Add:
     - `crittr://**`  
     - `exp://**` (Expo Go LAN / tunnel often uses `exp://` with host and path — adding the wildcard pattern Supabase allows helps during development.)
   - If you use **EAS** or a custom dev client, add the exact redirect URLs from your OAuth/deep-link docs if you add social auth callbacks later.

4. Optional: pass **`emailRedirectTo`** in `signUp` options if you later add **email link** confirmation; the in-app OTP flow does not require it for typing the 6 digits.

## 3. Environment variables (already in the app)

The client uses:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Set these in `.env` for local Expo, and in **EAS Secrets** / CI for production builds. No extra OTP-specific env vars are required for `verifyOtp` / `resend`.

## 4. Resend and rate limits

- **`resend({ type: "signup", email })`** only works for users who exist but have not confirmed yet. If the user is already confirmed, Supabase returns an error; the app surfaces a generic message.
- Supabase may **rate-limit** emails; if “Resend” fails, wait or check **Logs** in the dashboard.

## 5. Testing checklist

| Scenario | What to do |
|----------|------------|
| **Expo Go** | Open welcome → Sign up with `?intent=signup` → create account → land on **Check your email** → read code from Inbucket (local) or inbox (hosted) → enter 6 digits → **Confirm** → should continue to profile. |
| **Wrong code** | Enter 6 wrong digits → expect a clear error; try again. |
| **Expired code** | Wait past OTP expiry → expect “expired / request new” style message; use **Resend code**. |
| **Email confirmation off** | If you disable confirmations in the dashboard, `signUp` returns a **session** immediately; the app **skips** the verify step and goes to profile (same as before OTP). |

## 6. App behavior (reference)

- **`signUp`:** returns `{ needsEmailVerification: !data.session }`.
- **Verify step:** `verifyOtp({ email, token, type: "signup" })`.
- **Resend:** `resend({ type: "signup", email })`.
- If confirmation is required but the session is **null**, the user is not “logged in” yet; the onboarding store sets **`emailVerificationPending`** so the auth layout still allows the onboarding route without losing `?intent=signup`.

After changing Supabase settings, wait a minute and retest sign-up from a clean user (or delete the test user in **Authentication** → **Users**).
