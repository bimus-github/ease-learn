<h1 align="center">Course Management Platform</h1>

Centralized Next.js + Supabase application powering student access via Telegram and teacher administration via email/MFA.

## Tech Highlights

- **Next.js 15 App Router** with Tailwind, Radix UI, and Uzbek (`uz`) as the default locale.
- **Supabase** for Postgres, Auth, Storage, and Edge Functions.
- **Telegram Authentication** for students using nonce handshakes.
- **React Query + React Hook Form + Zod** for data fetching, forms, and validation.
- **Plyr** for course video playback with telemetry hooks.
- **Vitest + Playwright** testing setup.

Refer to `docs/stack-structure.md` for the full architectural breakdown.

## Getting Started

1. **Install dependencies**
   ```bash
   yarn install
   ```
2. **Create Supabase cloud project**
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
   - See `docs/setup.md` for detailed instructions on getting your project credentials
3. **Configure environment variables**
   - Copy `.env.example` to `.env.local`.
   - Fill in your Supabase cloud project credentials, Telegram bot token, and domain configuration.
   - See `docs/setup.md` for detailed descriptions and where to find each value.
4. **Apply database migrations**
   - Option A: Use Supabase Dashboard SQL Editor to run `supabase/migrations/000001_create_login_nonces.sql`
   - Option B: Use Supabase CLI: `supabase link --project-ref $SUPABASE_PROJECT_REF && supabase db push`
   - See `docs/setup.md` for detailed instructions.
5. **Generate TypeScript types**
   ```bash
   yarn supabase:types
   ```
   This connects to your cloud Supabase project and generates typed definitions based on your database schema.
6. **Start the dev server**
   ```bash
   yarn dev
   ```
   Wildcard subdomains (e.g., `tenant.localhost:3000`) are handled by middleware and the tenant utilities in `lib/tenant.ts`. Your app will connect to your cloud Supabase project.

## Project Structure

```
app/
  /(public)/                # Marketing site
  /(student)/               # Tenant-specific student routes
  /(teacher)/teachers/      # Teacher admin console (`/teachers/*`)
  api/auth/telegram/        # Telegram nonce polling + callback routes
components/
  student/                  # Student UI building blocks
  teacher/                  # Teacher widgets and summaries
  ui/                       # Shared primitives
hooks/                      # useTenant, useTelegramLogin, etc.
lib/                        # Auth helpers, telemetry, tenant parsing, schemas
supabase/                   # CLI config, migrations, generated types
docs/                       # Architecture & operational documentation
```

## Authentication Flows

- **Students** initiate Telegram login from tenant subdomains. The bot hits `/api/auth/telegram/callback`, which validates nonces stored in `login_nonces` and issues Supabase sessions.
- **Teachers** authenticate with Supabase email/password + MFA through `/teachers/*` routes. Enforcement is handled via Supabase policies and middleware session checks.
- Full handshake details are documented in `docs/auth-telegram.md`.

## Testing

- `yarn test` — Vitest + Testing Library for unit tests.
- `yarn test:e2e` — Playwright E2E flows (student login, teacher approvals).
- Populate `tests/` and `playwright/tests/` as features land.

## Scripts

- `yarn lint` — ESLint across the project.
- `yarn typecheck` — TypeScript `--noEmit`.
- `yarn supabase:types` — Generate TypeScript types from your cloud Supabase project.

## Deployment Checklist

- Ensure migrations are applied to your cloud Supabase project.
- Generate types: `yarn supabase:types`
- Configure Vercel environment variables for Supabase and Telegram.
- Enable wildcard domain (`*.platform.com`) pointing to the Vercel project.
- Provide Telegram webhook endpoint (Edge Function or serverless) for production approval callbacks.

## Further Reading

- `docs/setup.md` — Full initialization guide.
- `docs/stack-structure.md` — Architecture & directory responsibilities.
- `docs/auth-telegram.md` — Detailed Telegram handshake and security controls.
