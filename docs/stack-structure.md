# Stack & Repository Structure Proposal

## Technology Stack

### Frontend

- **Framework**: Next.js 15 (App Router) with React and TypeScript.
- **Styling**: Tailwind CSS with Radix UI or shadcn/ui components for accessibility; option to swap for Chakra UI if preferred.
- **State & Data**: TanStack Query (React Query) for fetching/caching; Supabase JS client for auth and database access.
- **Forms & Validation**: React Hook Form + Zod schemas shared between frontend and backend packages.
- **Localization**: Uzbek (`uz`) as the default locale using Next.js internationalization utilities (e.g., `next-intl`) for UI copy, validation, and notifications.
- **Video Playback**: Plyr or Video.js React wrapper with hooks for telemetry and progress reporting.
- **Testing**: Vitest/React Testing Library for unit tests; Playwright for end-to-end flows (student login, teacher publishing).

### Backend / Services

- **Primary Backend**: Supabase (Postgres, Auth, Row-Level Security, Storage, Edge Functions).
- **Auth**:
  - Teachers: Supabase email/password with mandatory MFA (TOTP or WebAuthn).
  - Students: Telegram bot login flow using nonce-based handshake and Supabase Edge Functions.
- **Storage & Streaming**: Supabase Storage for raw assets; integrate Mux or Cloudflare Stream for advanced DRM/transcoding if necessary.
- **Serverless Logic**: Supabase Edge Functions or Vercel serverless functions for Telegram callbacks, webhook handling, scheduled tasks (using Supabase Cron/Scheduler).
- **Messaging/Notifications**: Telegram Bot API (Telegraf) + optional email provider (Postmark/Resend) for teacher alerts.
- **Observability**: Vercel Analytics, Supabase logs/metrics, Sentry or Logflare for error tracking.

### Tooling & Deployment

- **CI/CD**: GitHub Actions (lint, test, type-check, preview deploy).
- **Hosting**: Vercel for Next.js app with wildcard subdomain support (`*.platform.com`); Supabase managed instance in target region.
- **Supabase CLI**: manage migrations, type generation, Edge Function deployment.
- **Package Management**: Yarn (single workspace) keeping frontend, schemas, and automation in one repo.

## Repository Structure

```
/docs/                       # Architectural, product, and operational documentation
  auth-telegram.md
  mvp.md
  setup.md
  stack-structure.md

/app/
  /(public)/                 # Marketing site routes
  /(student)/                # Tenant subdomain routes (`[tenantSlug]`)
  /(teacher)/teachers/       # Teacher admin portal under `/teachers`
  /api/auth/telegram/        # Nonce polling & callback handlers

/components/
  /student/                  # Student-specific components (dashboards, player)
  /teacher/                  # Teacher admin widgets (tables, forms)
  /ui/                       # Shared UI primitives (buttons, inputs)

/hooks/                      # Custom React hooks (useTenant, useTelegramLogin)

/lib/
  auth.ts                    # Supabase client setup, session helpers
  schemas/                   # Shared Zod schemas
  supabase/                  # Supabase client factory (browser/server)
  telemetry.ts               # Analytics helpers
  tenant.ts                  # Subdomain parsing, tenant context logic

/public/                     # Static assets, icons
/supabase/                   # Supabase config, migrations, generated types
/tests/                      # Vitest unit tests (future)
playwright.config.ts         # Playwright E2E setup
vitest.config.ts             # Vitest config
```

## Directory Notes & Responsibilities

- **`app/(student)`**: Handles tenant subdomain routing; middleware resolves `tenantSlug` and TenantProvider exposes context.
- **`app/(teacher)/teachers`**: Teacher admin portal at `/teachers/...` guarded by Supabase email/MFA auth.
- **`app/api/auth/telegram`**: API routes for nonce polling and callback handling if Edge Functions are not used.
- **`components/student` & `components/teacher`**: UI composed for each audience; rely on shared primitives in `components/ui`.
- **`hooks/`**: Client hooks for tenant context, Telegram login polling, and React Query integration.
- **`supabase/`**: SQL migrations, CLI config, and generated types. Align RLS policies with tenant isolation requirements.

## Environment & Configuration

- `.env.local` at the repo root stores Supabase credentials, Telegram bot token, wildcard domain, and feature flags. Template values live in `.env.example`.
- Central secrets stored via Vercel env + Supabase project settings.
- Feature flags stored in Supabase table or configuration helpers to toggle features (e.g., DRM integration, assessments).

## Development Workflow

1. Create a Supabase cloud project and configure environment variables (see `docs/setup.md`).
2. Install dependencies via `yarn install`.
3. Apply database migrations to your cloud Supabase project (via Dashboard SQL Editor or CLI).
4. Generate TypeScript types via `yarn supabase:types`.
5. Launch Next.js dev server (`yarn dev`) with middleware handling wildcard subdomains (`*.localhost`).
6. Expose a Telegram webhook (e.g., ngrok) for local bot testing when implementing callbacks.
7. Run linting and tests via `yarn lint`, `yarn test`, `yarn test:e2e`.
8. Commit migrations, then regenerate types via `yarn supabase:types` after schema changes.

## Future Extensions

- Separate teacher admin into its own app if complexity grows (`apps/teacher`).
- Introduce backend REST/GraphQL service if moving beyond Supabase Edge Functions.
- Add mobile clients under `/apps/mobile` (React Native/Expo) consuming shared schemas.
