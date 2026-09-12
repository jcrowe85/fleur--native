# Fleur — Launch Checklist

Everything below is work that has to happen outside the codebase. The code
changes are done; these are the operational steps.

## 1. Rotate leaked credentials — do this first

A Supabase **service_role** key was committed in plaintext (`check_user_data.sh`,
`test_email_sync_complete.sh`) and is in the git history. That key bypasses all
row level security.

- [ ] Supabase → Settings → API → **roll the service_role key**
- [ ] Roll the anon key too (it was committed alongside)
- [ ] Update the key in Railway, Supabase Edge Function secrets, and any local `.env`
- [ ] Rotate the **Slack incoming-webhook URL** — it shipped inside the app bundle
      via `EXPO_PUBLIC_SLACK_WEBHOOK_URL` and is extractable from any released build
- [ ] Consider rotating the Shopify Admin API token if the server repo was ever public

The scripts now read these from the environment, so nothing new is committed.

## 2. Server environment (Railway)

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | |
| `SUPABASE_SERVICE_ROLE_KEY` | the rotated one |
| `SHOPIFY_STORE_DOMAIN` | |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | |
| `OPENAI_API_KEY` | |
| `ADMIN_API_KEY` | **new** — long random string, gates the promotion dashboard |
| `ALLOWED_ORIGINS` | **new** — comma-separated origins for the browser dashboard |

The server now refuses to start in production if any required variable is
missing, rather than 500ing on the first real request.

## 3. Database migrations

Apply in order:

```
supabase/migrations/20260909000000_point_redemptions.sql
supabase/migrations/20260909000100_tighten_rls.sql
supabase/migrations/20260909000200_moderation_and_deletion.sql
supabase/migrations/20260909000300_verification_codes.sql
```

`20260909000100_tighten_rls.sql` is the important one — it closes a hole where
any signed-in user could read and modify every other user's profile.

**Verify after applying**, signed in as an ordinary user:
- [ ] Community feed still loads with author names and avatars
- [ ] Selecting another user's profile row returns no `email` column
- [ ] `update` against another user's profile row is rejected

## 4. Edge Functions

```
supabase functions deploy create-guest
supabase functions deploy link-email
supabase functions deploy send-verification-code   # rewritten
supabase functions deploy soft-delete-user         # rewritten
supabase functions deploy slack-webhook
```

- [ ] Set `SLACK_WEBHOOK_URL` as a secret on `slack-webhook` (it no longer comes
      from the client)
- [ ] `slack-webhook` needs updating to accept `{ text, userEmail, threadTs,
      timestamp }` from the app and read the webhook URL from its own env

## 5. EAS build setup

```
npm install -g eas-cli
eas login
eas init            # writes the project id
eas build:configure
```

- [ ] Put the real Railway URL into both `preview` and `production` env blocks in
      `eas.json` (they currently say `REPLACE-WITH-YOUR-RAILWAY-URL`)
- [ ] Add `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
      `EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN`, `EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN`
      as EAS secrets
- [ ] Set `EAS_PROJECT_ID` so push notifications can register a token

`android/` and `ios/` are no longer committed — EAS generates them from
`app.config.ts`. To build locally, run `npx expo prebuild` first.

Android release signing is handled by EAS credentials. The previous checked-in
`build.gradle` signed release builds with the **debug** keystore, which Google
Play rejects outright.

## 6. Store listings

### Both stores
- [ ] Privacy policy URL, publicly reachable
- [ ] Terms of service URL
- [ ] Screenshots at required sizes
- [ ] Support contact

### Apple — account

Enrolled and active, so there is no D-U-N-S or enrollment wait:

| | |
|---|---|
| Entity | Big Brand Group Inc |
| Enrolled as | Organization |
| Team ID | `N6NZVZRK2K` (pre-filled in `eas.json` -> `submit.production.ios`) |
| Your role | Account Holder — full App Store Connect permissions |
| Renews | April 22, 2027 |

- [ ] Create the app record in App Store Connect for bundle id `com.tryfleur.app`,
      then put its numeric id into `ascAppId` in `eas.json`
- [ ] Put the Account Holder Apple ID into `appleId` in `eas.json`
- [ ] Check the seller name shown on the listing. An Organization account
      displays the **legal entity name** — "Big Brand Group Inc", not "Fleur".
      If the brand name should appear instead, that is a *Doing Business As*
      request to Apple Developer Support, with supporting documentation, and it
      is worth starting early because it is a manual review.

### Apple — likely rejection points, now addressed in code
- [ ] **Account deletion** (5.1.1(v)) — in Profile, for every account type
- [ ] **UGC moderation** (1.2) — report and block are in the post menu; you must
      also action reports within 24 hours. Watch `content_reports where status =
      'pending'`.
- [ ] App Privacy questionnaire: the app collects email, contacts (on-device
      only, never uploaded), photos, and purchase history
- [ ] Demo account for App Review — the app auto-creates a guest, so note in the
      review notes that no login is required

### Google Play
- [ ] Data safety form — same disclosures as Apple
- [ ] The app targets health/wellness; confirm no medical claims in the listing
- [ ] Declare the Shopify checkout as external purchase of physical goods (this
      is outside Play Billing, which is correct for physical products)

## 7. Known gaps to decide on before or shortly after launch

**Points are still client-authoritative.** Balances live in AsyncStorage. The
server now authenticates redemptions, prices them from its own catalog, records
every code it issues, and rate limits (1 active, 3/day), so the exposure is
bounded and auditable — but a tampered client can still claim a balance it did
not earn. Making this airtight means moving earn/spend into a server-owned
ledger and debiting it inside the same transaction that issues the code. Worth
doing before points have real monetary value at scale.

**Cart is not persisted.** Closing the app empties the cart. Straightforward to
fix by adding the persist middleware to `cartStore`; left alone because it
changes behaviour users may already be used to in testing.

**No crash reporting.** `ErrorBoundary` has an `onError` hook ready to wire to
Sentry or Crashlytics. You will want this from day one.

**No analytics.** No way to see where onboarding drops off.

**Product prices are duplicated client-side** in `cartStore.ts` (`SKU_PRICE_CENTS`).
These will drift from Shopify. Checkout totals come from Shopify so customers are
charged correctly, but the in-app cart can display a stale price.
