# Crittr Pro — Stripe + Supabase setup

This app uses **Stripe PaymentSheet** (`@stripe/stripe-react-native`) with **Supabase Edge Functions** for Crittr Pro subscriptions: **7-day trial**, then **$4.99/month** or **$39.99/year** (USD).

## 1. Stripe Dashboard (test mode first)

1. [Create an account](https://dashboard.stripe.com/register) and stay in **Test mode**.
2. **Products → Add product** (e.g. “Crittr Pro”).
3. Add **two recurring prices** (same product or two products — your choice):
   - **Monthly:** USD **$4.99** / month  
   - **Annual:** USD **$39.99** / year  
4. Copy each **Price ID** (`price_...`).

### Webhook

1. **Developers → Webhooks → Add endpoint**  
   - URL: `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`  
     (replace `<PROJECT_REF>` with your Supabase project ref.)
2. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Reveal the **Signing secret** (`whsec_...`) — used as `STRIPE_WEBHOOK_SECRET`.

### API keys

- **Publishable key** (`pk_test_...`) → app env: `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Secret key** (`sk_test_...`) → Supabase secret: `STRIPE_SECRET_KEY`

### Test cards

Use [Stripe test cards](https://docs.stripe.com/testing). For a successful card payment / SetupIntent:

- **4242 4242 4242 4242** — any future expiry, any CVC, any postal code.

## 2. Supabase project

### Edge Function secrets

In **Project Settings → Edge Functions → Secrets** (or CLI `supabase secrets set`), set:

| Secret | Description |
|--------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from the webhook endpoint |
| `STRIPE_PRICE_ID_MONTHLY` | `price_...` for $4.99/mo |
| `STRIPE_PRICE_ID_ANNUAL` | `price_...` for $39.99/yr |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are available to Edge Functions automatically when deployed via Supabase.

### Deploy functions

From the repo root (with [Supabase CLI](https://supabase.com/docs/guides/cli) linked to the project):

```bash
supabase functions deploy create-subscription-payment-sheet
supabase functions deploy stripe-webhook --no-verify-jwt
```

`stripe-webhook` must allow **unsigned** Stripe requests (`--no-verify-jwt`). JWT verification for that function is disabled in `supabase/config.toml`.

### Database

Migration `024_crittr_pro_entitlement.sql` already adds `crittr_pro_until`, `stripe_customer_id`, and `stripe_subscription_id` on `profiles`. The webhook updates these when subscriptions change.

## 3. App environment (Expo)

Add to `.env` (and EAS **Secrets** for production builds):

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

You already use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for the Edge Function URL and auth.

## 4. Native builds

`@stripe/stripe-react-native` uses native code. Use a **development build** or **EAS build** — **Expo Go** does not include custom native modules.

Rebuild after adding the plugin:

```bash
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

## 5. Deep linking / return URL

The app scheme is **`crittr`** (`app.json`). PaymentSheet uses `returnURL: crittr://stripe-redirect` for 3DS and bank redirects. `StripeUrlHandler` forwards URLs to the Stripe SDK (`SessionGate`).

## 6. Flow summary

1. User picks **Annual** or **Monthly** on **Upgrade**, then opens **`/pro-checkout?billing=annual|monthly`**.
2. **`create-subscription-payment-sheet`** creates (or reuses) a Stripe Customer, creates a **Subscription** with `trial_period_days: 7`, and returns **Ephemeral Key** + **SetupIntent** or **PaymentIntent** client secret for PaymentSheet.
3. **`stripe-webhook`** syncs `crittr_pro_until` and Stripe IDs on `profiles` from subscription events.

Entitlement is **`crittr_pro_until > now()`** (see `user_has_crittr_pro()`).
