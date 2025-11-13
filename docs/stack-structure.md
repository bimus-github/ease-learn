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
- **Package Management**: Yarn workspaces for monorepo dependency management (Berry preferred, Classic supported).

## Repository Structure

```
/docs/                       # Architectural, product, and operational documentation
  mvp.md
  auth-telegram.md
  stack-structure.md

/apps/
  /web/                      # Next.js application (student + teacher UI)
    /app/
      /(public)/             # Marketing site routes
      /(student)/            # Tenant subdomain routes (`[tenantSlug]`)
      /(teacher)/            # Admin portal under `/teachers`
      api/                   # Next.js route handlers if needed
    /components/
      ui/                    # Shared UI primitives
      student/               # Student-specific components (dashboards, player)
      teacher/               # Teacher admin widgets (tables, forms)
    /hooks/                  # Custom React hooks (useTenant, useTelegramLogin)
    /lib/
      auth.ts                # Supabase client setup, session helpers
      tenant.ts              # Subdomain parsing, tenant context logic
      supabase.ts            # Supabase client factory
      telemetry.ts           # Analytics helpers
    /providers/              # Context providers (tenant, theme, query)
    /styles/                 # Tailwind config, globals
    /config/                 # Runtime config, feature flags
    /tests/                  # Unit/integration tests

  /bot/                      # Telegram bot service
    index.ts                 # Entry point (Telegraf)
    handlers/                # `/start`, approval, announcements
    services/                # Supabase queries, nonce validation
    schemas/                 # Zod schemas for payload validation
    tests/                   # Bot-specific unit tests

  /edge/                     # Supabase Edge Functions (if separated from bot)
    login-callback/
    progress-hook/
    cron/

/packages/
  /ui/                       # Shared UI component library (optional)
  /schemas/                  # Shared Zod/TypeScript domain schemas
  /types/                    # Generated Supabase types, domain models
  /utils/                    # Cross-app utility functions (dates, formatting)

/config/
  eslint/
  tailwind/
  tsconfig/

/scripts/                    # Automation scripts (deploy, db reset)
/supabase/                   # Supabase config, migrations, seed scripts
```

## Directory Notes & Responsibilities

- **`apps/web/app/(student)`**: Handles tenant subdomain routing; uses middleware to resolve `tenantSlug` and inject context.
- **`apps/web/app/(teacher)`**: Teacher admin portal at `/teachers/...` with email/MFA gate; connects to Supabase Auth directly.
- **`apps/web/app/api`**: Reserve for API routes that must run close to the frontend (e.g., pre-signed URLs) if not handled by Edge Functions.
- **`apps/bot`**: Deploy as serverless function (Vercel or Supabase Edge) responding to Telegram webhooks; minimal state, stateless handlers.
- **`apps/edge`**: Optional separation for functions scheduled or triggered outside of bot context (e.g., cron reminders, progress ingest).
- **`packages/types`**: Store generated Supabase types (`supabase gen types typescript --linked`) and domain models shared across apps.
- **`supabase/`**: Keep SQL migrations versioned; use CLI to push changes. Include RLS policies aligning with tenant isolation.

## Environment & Configuration

- `.env` files managed per app (`apps/web/.env.local`, `apps/bot/.env`) with common variables templated in `.env.example`.
- Central secrets stored via Vercel env + Supabase project settings.
- Feature flags stored in Supabase table or config package to toggle features (e.g., DRM integration, assessments).

## Development Workflow

1. Run Supabase locally (`supabase start`) to access Postgres, storage, and auth emulator.
2. Install dependencies via `yarn install`.
3. Launch Next.js dev server (`yarn web dev`) with middleware handling wildcard subdomains (`*.localhost`).
4. Start Telegram bot locally with tunneling (ngrok) for webhook testing.
5. Use workspace lint/test commands (`yarn lint`, `yarn test`, `yarn bot dev`) across packages.
6. Commit migrations and regenerate types before pushing.

## Future Extensions

- Separate teacher admin into its own app if complexity grows (`apps/teacher`).
- Introduce backend REST/GraphQL service if moving beyond Supabase Edge Functions.
- Add mobile clients under `/apps/mobile` (React Native/Expo) consuming shared schemas.
