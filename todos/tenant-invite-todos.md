## Tenant Invite Flow (Lean & Modern)

1. **Data & Security**
   - [x] Design `tenant_invites` table (token hash, metadata JSON, expires_at, status, issued_by, claimed_at).
   - [x] Ship Supabase migration + server types keeping the schema minimal and auditable.
   - [x] Add cron/edge job to auto-expire stale invites and log state transitions.

2. **Server Actions**
   - [x] `createTenantInvite` (super-admin only): validate input, hash token, store metadata, send email.
   - [x] `validateTenantInvite`: shared helper for onboarding route to read+verify invite.
   - [x] `claimTenantInvite`: transactional flow to mark invite claimed, create teacher owner, call `createTenant`, and log audit event.

3. **Email Experience**
   - [x] Author a lightweight HTML/Plaintext template (brand color accents, generous whitespace, single CTA button).
   - [x] Wire template to the mail provider with resend + revoke support.

4. **Admin UI (Lean, Modern)**
   - [x] Add “Invite tenant” CTA in `admin/(protected)/tenants/page.tsx` opening a sleek modal (2-column layout: core fields + plan defaults).
   - [x] Build an invite list panel (status pills, minimal table chrome, inline actions to resend/revoke).
   - [x] Ensure components use existing design tokens (spacing, typography) for a cohesive feel.

5. **Public Onboarding UX**
   - [x] Create `/onboard` route with token-aware loader and guarded states (pending, expired, claimed).
   - [x] Craft a focused multi-step form: progress header, brand preview, validation inlined under fields.
   - [x] On success, auto-auth owner or display a modern confirmation screen with next steps.

6. **QA & Telemetry**
   - [ ] Add integration tests covering invite creation, email send, claim flow, and revocation edge cases.
   - [ ] Emit telemetry/audit logs for each state change; surface metrics in admin dashboard later.


### Notes & Decisions

- Default invite expiry is set to 7 days at the database level (`expires_at` default of `now() + interval '7 days'`).
- Raw invite tokens must be SHA-256 hashed before persisting (`token_hash` column stores the digest only).
- Automated expiry job lives at `scripts/expire-tenant-invites.ts` and can be run via `yarn scripts:expire-tenant-invites` (loads `.env.local` for Supabase credentials).


