# Project Setup Guide

This guide explains how to bootstrap the single-app Next.js + Supabase stack that powers the course management platform. It aligns with the architecture captured in `stack-structure.md` and the Telegram authentication flow in `auth-telegram.md`.

## 1. Prerequisites

- Node.js 20+
- Yarn (Classic)
- Supabase CLI `>=1.204` (optional, for type generation and migrations)
- Supabase cloud project ([create one here](https://supabase.com/dashboard))
- Telegram bot created via [@BotFather](https://t.me/BotFather)

## 2. Create Supabase Cloud Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. Wait for the project to finish provisioning
3. Note your project details:
   - **Project URL**: Found in Settings → API (e.g., `https://xyzabc123456789.supabase.co`)
   - **Project Reference ID**: The part before `.supabase.co` in your URL (e.g., `xyzabc123456789`)
   - **API Keys**: Found in Settings → API
     - `anon` `public` key → This is your `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
     - `service_role` `secret` key → This is your `SUPABASE_SERVICE_ROLE_KEY`

## 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase cloud project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
SUPABASE_PROJECT_REF=your-project-ref
NEXT_PUBLIC_ROOT_DOMAIN=localhost
NEXT_PUBLIC_APP_DOMAIN=localhost:3000
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret
TELEGRAM_STUDENT_EMAIL_DOMAIN=students.localhost
TELEGRAM_STUDENT_PASSWORD_SECRET=change-me
```

**Where to find these values:**

- `NEXT_PUBLIC_SUPABASE_URL`: Your project URL from Settings → API
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: The `anon` `public` key from Settings → API
- `SUPABASE_SERVICE_ROLE_KEY`: The `service_role` `secret` key from Settings → API
- `SUPABASE_PROJECT_REF`: The part before `.supabase.co` in your project URL (e.g., if URL is `https://abc123.supabase.co`, the ref is `abc123`)
- `TELEGRAM_STUDENT_EMAIL_DOMAIN`: Optional. Domain used to mint synthetic student emails (defaults to `students.<ROOT_DOMAIN>`).
- `TELEGRAM_STUDENT_PASSWORD_SECRET`: Secret pepper for deterministic student passwords derived from Telegram IDs (fallbacks to `SUPABASE_SERVICE_ROLE_KEY` if omitted).

For local development you can leave `NEXT_PUBLIC_ROOT_DOMAIN` and `NEXT_PUBLIC_APP_DOMAIN` as supplied. Update them when deploying to staging/production.

## 4. Install Dependencies

```bash
yarn install
```

This pulls in React Query, React Hook Form, Zod, Next Intl, Plyr, Telegraf, Vitest, and Playwright as defined in `package.json`.

## 5. Apply Database Migrations

You need to apply your database migrations to your cloud Supabase project. You have two options:

### Option A: Using Supabase Dashboard (Recommended for beginners)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/000001_create_login_nonces.sql`
4. Copy and paste its contents into the SQL Editor
5. Click **Run** to execute the migration

This creates the `login_nonces` table needed by the Telegram handshake.

### Option B: Using Supabase CLI

```bash
# Link to your cloud project (requires SUPABASE_PROJECT_REF in .env.local)
supabase link --project-ref $SUPABASE_PROJECT_REF

# Push migrations to cloud
supabase db push
```

## 6. Generate TypeScript Types

```bash
yarn supabase:types
```

This connects to your cloud Supabase project and generates TypeScript types based on your database schema. The types will be saved to `supabase/types`.

## 7. Run the App

```bash
yarn dev
```

The middleware reads `Host` headers to resolve tenants, supporting wildcard subdomains such as `teacherone.localhost:3000`.

Your app will now connect to your cloud Supabase project using the credentials in `.env.local`.

## 8. Telegram Login Flow

- Students initiate login from the `/[tenantSlug]` student routes.
- The frontend deep-links to the Telegram bot using `useTelegramLogin`.
- The bot posts approval callbacks to `/api/auth/telegram/callback`, which validates the nonce and stores Telegram identifiers.
- The web app polls `/api/auth/telegram/poll` until the nonce is consumed, then establishes a Supabase session.

Refer to `docs/auth-telegram.md` for a full handshake breakdown and security controls.

## 9. Testing

- Unit tests: `yarn test` (Vitest + Testing Library)
- E2E tests: `yarn test:e2e` (Playwright)

Populate `tests/` and Playwright specs as the product evolves.

## 10. Deployment Checklist

- Run `yarn lint`, `yarn typecheck`, `yarn test`
- Ensure Supabase migrations are applied and types regenerated
- Configure Vercel project with Supabase credentials and Telegram secrets
- Point wildcard domain (`*.platform.com`) to Vercel and update `.env` values
