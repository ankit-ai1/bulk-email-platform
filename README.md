# Synerax Mail

Multi-tenant email marketing platform. Synerax runs the platform, client companies get isolated workspaces, and Client Admins create Campaign Managers.

| Part | Technology | Hosted on |
|------|-----------|-----------|
| Frontend (`src/`) | React 18, Vite | Vercel |
| Database and auth (`supabase/schema.sql`) | Postgres, row-level security, Supabase Auth | Supabase |
| Worker (`worker/`) | Node 22+: sending, tracking, API, inbox sync, automation, AI | Any always-on Node host (Railway, Render) |

## Setup on a new Supabase project

### 1. Database

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste all of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. Run it once.
3. **Authentication > Users > Add user**: create your own login and tick **Auto Confirm User**.
4. In the SQL Editor, make that login the platform owner:
   ```sql
   select public.bootstrap_super_admin('you@yourcompany.com');
   ```
5. **Authentication > Sign In / Providers**: turn off **Allow new users to sign up**. Accounts are only created from inside the app.
6. **Authentication > URL Configuration**: set **Site URL** to your website and add `https://your-site/reset-password` to the redirect URLs.

Keys are under **Project Settings > API**.

### 2. Worker

```bash
cd worker
npm install
cp ../.env.example .env   # fill in the worker section
npm start
```

Required: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `SECRETS_KEY`, `PUBLIC_WORKER_URL`, `ALLOWED_ORIGINS`.

Generate `SECRETS_KEY` once and back it up. Losing it makes every stored SMTP and mailbox password unreadable:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The service key and `SECRETS_KEY` belong only on the worker. Never put them in a `VITE_` variable.

`ANTHROPIC_API_KEY` is optional and enables the AI tools.

### 3. Frontend

```bash
npm install
npm run dev     # or deploy to Vercel
```

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_WORKER_URL`.

### 4. First run

Sign in as the platform owner, then: create a **Plan**, create a **Company** (this generates the Client Admin's temporary password), and share the login. The Client Admin adds an SMTP account under **Domains & SMTP**, imports contacts, and can launch a campaign.

## Roles

| Role | Sees | Created by |
|------|------|-----------|
| Synerax Super Admin | All companies, plans, credits, tickets, audit log | `bootstrap_super_admin` |
| Client Admin | Everything in their own company | Super Admin |
| Campaign Manager | Only the features their admin ticked, and their own or assigned campaigns | Client Admin |

## How isolation works

- Every tenant table has `org_id`. Row-level security limits each user to their org, and a trigger overwrites any `org_id` the browser sends.
- Column grants stop the browser changing campaign status, counters, roles or permissions. Those go through the worker, which checks limits and credits.
- SMTP and mailbox passwords and DKIM keys are AES-256-GCM encrypted in `integration_secrets`, which no browser role can read.
- The worker uses the service role, which bypasses RLS, so every query in it filters by the caller's org.

## Sending rules

- Each email uses one credit; credits for unsent email are refunded. No credits or an expired subscription pauses the campaign.
- Rotation balances across selected accounts within their hourly, daily and monthly limits. At the limit, sending waits for the next window.
- Unsubscribes, hard bounces and complaints suppress the address for the whole organization. Suppression is checked again just before each send.
- Every email carries an unsubscribe link and RFC 8058 one-click headers. Tracking can be switched off; unsubscribe cannot.
- SMTP bounces arrive later as mail, so connect a mailbox (or the signed inbound feed under **Organization > API & webhooks**) to catch them.

## Tests

```bash
npm run test:db      # attacks the real schema as a browser user (embedded Postgres)
cd worker && npm test
```

## Public API

Create a key under **Organization > API & webhooks** (the plan must include API access), then send it as `X-API-Key`:

- `GET /v1/campaigns`
- `GET /v1/campaigns/:id/metrics`
- `POST /v1/contacts` with `{ email, list_id, name?, company?, tags?, custom_fields?, consent_status? }`
