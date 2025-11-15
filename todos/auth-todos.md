# Auth Completion Tracker

Status snapshot of everything related to authentication. Use this to see what is already shipped versus what is still blocking a production-ready auth experience.

## Legend

- `[x]` — implemented and wired into the app
- `[ ]` — not started or still needs significant work
- `[~]` — partially done; needs follow-up tasks called out inline

---

## Student Telegram Login

- `[x]` `login_nonces` table migration created (`supabase/migrations/000001_create_login_nonces.sql`).
- `[x]` Polling + callback API routes exist (`app/api/auth/telegram/poll`, `app/api/auth/telegram/callback`) and validate nonce payloads.
- `[x]` `upsertTelegramStudent` now provisions Supabase Auth users (service role), mirrors into the platform `users` table, and stores session tokens on the nonce for the polling client.
- `[x]` Nonce creation API (`/api/auth/telegram/start`) to mint scoped nonces with TTL + rate limiting.
- `[x]` Telegram bot webhook handler (`app/api/telegram/webhook/route.ts`):
  - process `/start <nonce>` command
  - validate nonce and fetch tenant info
  - present approval UI with inline keyboard buttons
  - call backend callback API on approval
  - typing middleware shows typing indicator on every action
- `[x]` Student UI integration:
  - invoke nonce creation endpoint via `useTelegramLogin.startLoginFlow`
  - deep-link via `useTelegramLogin.getBotDeepLink`
  - start polling until session tokens are issued, then hydrate Supabase client
  - `TelegramLoginButton` component with modern UI
  - `LoginPrompt` wrapper for unauthenticated state
  - Integrated into student dashboard with auth check
- `[ ]` Student role enforcement:
  - finish `requireStudentAuth` (role + tenant checks)
  - add middleware enforcement / RLS policies so non-student sessions are rejected
- `[ ]` Audit logging for Telegram login attempts, approvals, failures.

## Teacher Email + MFA

- `[x]` Client-side forms exist for login, forgot password, and password update (`components/login-form.tsx`, `forgot-password-form.tsx`, `update-password-form.tsx`).
- `[x]` `/teachers/*` pages mount those forms and the dashboard protects itself via `requireTeacherAuth`.
- `[ ]` MFA enforcement:
  - require factors before returning from `requireTeacherAuth`
  - handle “MFA not configured” path with setup prompts
- `[ ]` Role + tenant ownership checks in `requireTeacherAuth`.
- `[ ]` Invite token backend:
  - store tokens, validate on `/teachers/invite`
  - set password, assign tenant ownership, enable MFA bootstrap
- `[ ]` Email verification enforcement before allowing teacher dashboard access.
- `[ ]` Teacher session management UI (view/revoke sessions, show MFA status).

## Shared Infra & Data Model

- `[ ]` Core tables (`tenants`, extended `users`, etc.) plus RLS policies to scope data per tenant/role (see `TODO.md` high-priority list).
- `[ ]` Supabase Edge functions or server routes issuing sessions for Telegram -> Supabase handoff.
- `[ ]` Middleware additions for student auth (currently only protects teacher routes).
- `[ ]` Environment + secrets enforcement:
  - validate `TELEGRAM_BOT_TOKEN`, webhook secret, Supabase keys at boot
  - runtime checks/logging when missing
- `[ ]` Audit log + alerting pipeline storing auth events.

## Tooling & Testing

- `[ ]` Unit tests for `requireTeacherAuth`, `requireStudentAuth`, `upsertTelegramStudent`, tenant resolution helpers.
- `[ ]` Playwright coverage for:
  - teacher email/password login + MFA
  - teacher invite acceptance
  - student Telegram handshake (nonce creation → bot approval → dashboard access)
- `[ ]` Load/rate-limit testing for nonce endpoints and bot callbacks.

## Operational Tasks

- `[ ]` Document final auth flows in `docs/auth-telegram.md` and README once implementation is complete.
- `[ ]` Provide support SOPs (student relink, teacher MFA reset).
- `[ ]` Production readiness checklist: Vercel env vars, Telegram webhook deployment, Supabase RLS verification, monitoring.

---

_Last updated: 2025-11-14_
