# Authentication Overview: Telegram Students & Email Teacher Admin

## Context

- Students authenticate exclusively through a Telegram Bot per tenant (teacher subdomain).
- Teacher owners access their admin console via email/password (Supabase Auth) on `my-platform.com/teachers/...`, with mandatory MFA.
- Platform operators manage tenants globally; must ensure isolation and secure cross-channel linking between Telegram identities and email accounts.

## Shared Components

- **Telegram Bot**: central interface for student login handshakes, announcements, and optional teacher notifications.
- **Teacher Auth Service**: Supabase email/password + MFA (TOTP or WebAuthn) for administrative access.
- **Nonce Store**: temporary table/cache (e.g., Supabase table) holding student login states keyed by short-lived nonces.
- **Supabase Auth / JWT issuance**: backend issues session tokens once identity verified (Telegram or email).
- **Audit Logging**: every login attempt, approval, relink, session revocation logged with timestamp, channel metadata, tenant.

## Student Login Flow

1. **Initiate Login**

   - Student visits tenant subdomain and selects “Continue with Telegram”.
   - Frontend generates a short-lived nonce scoped to tenant and optional redirect URI; stored in `login_nonces`.

2. **Bot Handshake**

   - Web app deep-links to `t.me/<BotName>?start=<nonce>`.
   - Bot receives `/start <nonce>`, validates nonce (not expired, matches tenant).
   - Bot sends student a confirmation message (“Tap to sign in to teacherone.platform.com”) with inline button to approve.

3. **Approval & Session**

   - On approval, bot calls backend API with Telegram user ID, username, and nonce.
   - Backend upserts student record (`users.role = 'student'`, `tenant_id` from nonce), links Telegram ID.
   - Backend marks nonce as redeemed and generates Supabase JWT / session; frontend polls `GET /auth/poll?nonce=` until token ready.

4. **Post-Login**
   - Frontend stores session, redirects to student dashboard (fallback route from nonce if provided).
   - Bot optionally sends welcome or completion messages; announcements later reuse chat_id.

## Teacher Admin Authentication Flow (Email + MFA)

1. **Tenant Provisioning**

   - Platform admin or automated onboarding creates tenant record, capturing teacher email, name, and desired subdomain.
   - System sends email invite with secure token to set password and enable MFA.

2. **Account Setup**

   - Teacher visits `my-platform.com/teachers/invite?token=...`, sets password, configures MFA (TOTP/WebAuthn), reviews subdomain details.
   - Tenant status marked `active` once setup completes.

3. **Login**

   - Teacher navigates to `my-platform.com/teachers/login`.
   - Enters email/password; Supabase verifies credentials.
   - MFA challenge enforced: teacher must provide TOTP or approve WebAuthn device.

4. **Session Establishment**

   - Upon successful MFA, backend issues admin session (Supabase JWT) scoped to teacher’s `tenant_id`.
   - Teacher redirected to admin dashboard; can manage course content, enrollment, analytics.

5. **Security Monitoring**

   - Audit log entry recorded with IP, device fingerprint, auth method.
   - Optional Telegram notification or email alert on new device or geolocation changes.

## Security Controls

- **Nonce TTL**: 2-minute expiration, single-use. Attempting to reuse triggers alert.
- **Rate Limiting**: throttle nonce creation per IP and per Telegram ID to prevent brute force.
- **Session Binding**: store device fingerprint/user agent; prompt re-approval on significant changes.
- **Teacher MFA Enforcement**: require MFA enrollment before admin access; block login if MFA not configured.
- **Telegram 2FA Awareness**: prompt students/teachers to enable Telegram password for better security, though not enforced.
- **Manual Recovery**:
  - Students: teacher/platform admin can trigger Telegram relink after identity proof (purchase receipt, student ID).
  - Teachers: platform admin verifies teacher identity (contract, payment details) before updating email or resetting MFA.
- **Tenant Scoping**: every student nonce includes `tenant_id` and is validated against subdomain host header to prevent cross-tenant login.
- **Session Revocation**: teacher and platform admin can revoke active sessions; bot notifies students, email notifies teachers.

- **Teacher Account Lockout**: teachers can request support to reset password/MFA; requires manual validation before issuing reset link.
- **Bot Downtime**: show maintenance notice on student login screen, queue nonces until bot returns; teacher email auth remains unaffected so they can still manage content.

## Implementation Checklist

- [ ] Create `login_nonces` table with columns: id (UUID), tenant_id, nonce, redirect_path, expires_at, consumed_at, telegram_user_id.
- [ ] Build Supabase Edge Function or API route for student nonce creation, polling, and Telegram callback handling.
- [ ] Implement Telegram bot webhook for `/start`, approval callbacks, announcements.
- [ ] Configure Supabase Auth policies for teacher email accounts with mandatory MFA and tenant scoping.
- [ ] Create admin UI for viewing/revoking student and teacher sessions, updating teacher email, resetting MFA.
- [ ] Instrument audit logs and alerting across both auth channels.
- [ ] Document recovery and support SOPs for operations team.
