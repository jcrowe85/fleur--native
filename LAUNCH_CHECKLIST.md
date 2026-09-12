# Fleur — Launch Checklist

Everything below is work that has to happen outside the codebase. The code
changes are done; these are the operational steps.

## 1. Retire the leaked Supabase key — do this first, and before launch

The **service_role** JWT was committed in plaintext (`check_user_data.sh`,
`test_email_sync_complete.sh`, commits `a0a0f0d` and `39027ec`) and the GitHub
repo is **public**. The committed key is byte-identical to the one still in
`server/.env`. It bypasses row level security entirely — anyone holding it can
read or modify every row in the project directly, with no app and no login.

Do **not** mint a replacement legacy key. Rotating a legacy `service_role`
means rolling the project JWT secret, which also signs user access tokens and
so signs out every existing session. Migrate to the current key system instead;
the leaked key then dies for good when legacy keys are disabled.

| Legacy | Replacement | Consumed by |
|---|---|---|
| `anon` JWT | `sb_publishable_…` | the app bundle |
| `service_role` JWT | `sb_secret_…` | API server, Railway, 5 edge functions |

The code accepts either form, so this can be done one component at a time:

- client — `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, else `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- server — `SUPABASE_SECRET_KEY`, else `SUPABASE_SERVICE_ROLE_KEY`
- edge functions — `SB_SECRET_KEY`, else the platform-injected `SUPABASE_SERVICE_ROLE_KEY`

Steps:

- [ ] Supabase → Settings → API Keys → **New secret key**, named for the API server
- [ ] Set `SUPABASE_SECRET_KEY` in `server/.env` and in Railway
- [ ] Set `SB_SECRET_KEY` as a secret on all five edge functions
- [ ] Set `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` locally and as an EAS secret
- [ ] Verify: guest creation, email link, a point redemption, the community feed
- [ ] **Then** Settings → API Keys → Legacy tab → **Disable JWT-based API keys**.
      This is what actually neutralises the copy in the public git history.
- [ ] Make the GitHub repo private — it also carries the Shopify store domain
      and the whole server implementation

**Order matters.** `EXPO_PUBLIC_*` values are inlined into the bundle at build
time, so a released build is pinned to whatever key it shipped with. Disabling
legacy keys after the app is in the stores breaks every installed copy until
the user updates. Pre-launch there are no installs, so this costs nothing.

The **anon key** leaked in the same commits and does *not* need replacing on
security grounds — it is browser-safe by design and is what RLS sits in front
of. Swap it only as part of retiring the legacy system.

The **Slack webhook** is not in the git history (checked: no `hooks.slack.com`
in any commit) and the app was never publicly released, so it was never
exposed. It still needs to move server-side before launch, but that is a
design change, not an incident.

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
