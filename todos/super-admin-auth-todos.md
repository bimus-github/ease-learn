# Super Admin Auth Implementation Todo

This file tracks all missing implementations for super admin (platform_admin) authentication and authorization.

## Legend

- `[x]` — implemented and wired into the app
- `[ ]` — not started or still needs significant work
- `[~]` — partially done; needs follow-up tasks called out inline

---

## Core Auth Function

### `requireSuperAdminAuth()` Function

- `[x]` Create `requireSuperAdminAuth()` function in `lib/auth.ts`
  - `[x]` Check for valid session (use `getServerSession()`)
  - `[x]` Verify user exists in Supabase Auth
  - `[x]` Fetch user record from `users` table
  - `[x]` Verify role is `'platform_admin'`
  - `[x]` Check user status is `'active'` (not suspended or deleted)
  - `[x]` Optional: Check email verification status
  - `[x]` Optional: MFA enforcement (decide if required for platform admins)
  - `[x]` Return typed result similar to `requireTeacherAuth`:
    ```typescript
    {
      session: Session;
      user: User;
      userRecord: {
        role: string;
        status: string;
        email_verified: boolean;
        // Note: platform_admin has no tenant_id
      }
    }
    ```
  - `[x]` Return error types: `'unauthorized'`, `'invalid-role'`, `'user-suspended'`, `'email-not-verified'`
  - `[x]` Define redirect routes (create admin login route or reuse teacher login)

---

## Middleware Protection

### Admin Route Protection

- `[x]` Add admin route protection to `lib/supabase/middleware.ts`
  - `[x]` Import `adminRoutes` from `@/constants/routes`
  - `[x]` Check if pathname starts with `/admin`
  - `[x]` Verify user is authenticated
  - `[x]` Check user role is `'platform_admin'` from `app_metadata`
  - `[x]` Redirect to admin login (or teacher login) if not authenticated
  - `[x]` Redirect non-platform-admin users away from admin routes
  - `[x]` Update route exclusion logic to exclude `/admin` from student route checks

---

## Admin Route Structure

### Admin Pages & Layout

- `[X]` Create admin route group structure
  - `[X]` Create `app/(admin)/admin/` directory
  - `[x]` Create `app/(admin)/admin/layout.tsx`
    - `[x]` Use `requireSuperAdminAuth()` to protect all admin routes
    - `[x]` Create admin layout UI (header, navigation, logout)
    - `[x]` Show platform admin branding/indicator
  - `[x]` Create `app/(admin)/admin/dashboard/page.tsx`
    - `[x]` Admin dashboard showing platform-wide metrics
    - `[x]` List of tenants overview
    - `[x]` User count statistics
    - `[x]` System health indicators
  - `[x]` Create `app/(admin)/admin/tenants/page.tsx`
    - `[x]` List all tenants with status
    - `[x]` Tenant management actions (suspend/reactivate)
    - `[x]` Tenant search and filtering
    - `[x]` Tenant creation/editing capabilities
  - `[x]` Create `app/(admin)/admin/users/page.tsx`
    - `[x]` List all users across tenants
    - `[x]` User role filtering (teacher, student, platform_admin)
    - `[x]` User management actions (suspend, delete, role changes)
    - `[x]` User search functionality
  - `[x]` Create `app/(admin)/admin/settings/page.tsx`
    - `[x]` System-wide configuration
    - `[x]` Feature flags
    - `[x]` Platform branding settings
    - `[x]` Audit log viewer

---

## Admin Login Flow

### Authentication Entry Point

- `[x]` Decide on admin login strategy:
  - `[x]` Option A: Separate admin login page (`/admin/login`)
    - `[x]` Create `app/(admin)/admin/login/page.tsx`
    - `[x]` Create admin login form component
    - `[x]` Verify user role after login and redirect accordingly
- `[x]` Create `adminRoutes.login` constant in `constants/routes/admin.ts`
- `[x]` Update login redirect logic to handle platform admin role

---

## Admin Route Constants

### Route Definitions

- `[x]` Verify all admin routes are defined in `constants/routes/admin.ts`
  - `[x]` `base: "/admin"` - already defined
  - `[x]` `dashboard: "/admin/dashboard"` - already defined
  - `[x]` `tenants: "/admin/tenants"` - already defined
  - `[x]` `users: "/admin/users"` - already defined
  - `[x]` `settings: "/admin/settings"` - already defined
  - `[x]` Add `login: "/admin/login"` if separate admin login is implemented
- `[x]` Add any additional admin sub-routes as needed
- ⤷ `/admin/login` now lives outside the protected `(protected)` route group so it renders without auth middleware, while `/admin/(protected)/...` routes use `requireSuperAdminAuth()`.

---

## Admin Utilities & Helpers

### Supporting Functions

- `[ ]` Create admin-specific helper functions (internal utilities):
  - `[ ]` Helper functions in `lib/admin/utils/` for reusable database queries
  - `[ ]` These will be used by server actions, not exposed directly
- `[ ]` Implement admin server actions (Next.js "use server"):
  - `[ ]` Tenant operations: `getAllTenants()`, `suspendTenant()`, `reactivateTenant()`, `createTenant()`, `updateTenant()` in `lib/admin/actions/tenants.ts`
  - `[ ]` User operations: `getAllUsers()`, `suspendUser()`, `reactivateUser()`, `changeUserRole()`, `resetUserMFA()`, `revokeUserSessions()` in `lib/admin/actions/users.ts`
  - `[ ]` Settings operations: `getSystemSettings()`, `updateSystemSettings()`, `getFeatureFlags()`, `updateFeatureFlag()`, `getBrandingSettings()`, `updateBrandingSettings()` in `lib/admin/actions/settings.ts`
  - `[ ]` Audit log operations: `getAuditLogs()`, `exportAuditLogs()` in `lib/admin/actions/audit.ts`
  - `[ ]` All server actions must:
    - Use `"use server"` directive
    - Call `requireSuperAdminAuth()` for auth check
    - Use service role client for database operations
    - Log all mutations to audit_logs table
    - Return typed results with proper error handling

---

## Testing

### Test Coverage

- `[ ]` Unit tests for `requireSuperAdminAuth()`
  - `[ ]` Test successful auth with valid platform_admin user
  - `[ ]` Test rejection for non-platform_admin roles
  - `[ ]` Test rejection for suspended/deleted users
  - `[ ]` Test rejection for unauthenticated requests
  - `[ ]` Test error redirects
- `[ ]` Integration tests for admin routes
  - `[ ]` Test middleware protection of `/admin/*` routes
  - `[ ]` Test redirects for unauthorized access
- `[ ]` E2E tests (Playwright)
  - `[ ]` Test admin login flow
  - `[ ]` Test admin dashboard access
  - `[ ]` Test tenant management actions
  - `[ ]` Test user management actions

---

## Documentation

### Documentation Updates

- `[ ]` Document platform admin auth flow in `docs/auth-telegram.md` or new `docs/auth-admin.md`
- `[ ]` Update README with platform admin section
- `[ ]` Document admin route structure and access requirements
- `[ ]` Create admin user setup guide (how to create first platform admin)
- `[ ]` Document admin vs teacher vs student role differences

---

## Security Considerations

### Security & Access Control

- `[ ]` Review and implement RLS policies for admin access
  - `[ ]` Platform admins should bypass tenant-scoped RLS
  - `[ ]` Verify platform admins can access cross-tenant data
  - `[ ]` Ensure sensitive operations require platform_admin role
- `[ ]` Add rate limiting to admin routes (more strict than teacher routes)
- `[ ]` Implement audit logging for admin actions
  - `[ ]` Log all tenant management actions
  - `[ ]` Log all user management actions
  - `[ ]` Log all role changes
- `[ ]` Add IP allowlisting option for admin routes (optional, for extra security)
- `[ ]` Consider MFA requirement for platform admins (decide if mandatory)

---

## Operational Tasks

### Production Readiness

- `[ ]` Create seed script or migration to create first platform admin user
- `[ ]` Set up monitoring/alerting for admin login attempts
- `[ ]` Create admin support procedures (password reset, MFA reset)
- `[ ]` Document admin account recovery process
- `[ ]` Set up separate admin session timeout (if different from teachers)

---

## Current Status Summary

**What exists:**

- ✅ Database schema supports `platform_admin` role
- ✅ Route constants defined in `constants/routes/admin.ts`
- ✅ Type schemas include `platform_admin` role

**What's missing:**

- ✅ `requireSuperAdminAuth()` function implementation
- ✅ Middleware protection for `/admin/*` routes
- ✅ Admin pages and layout structure
- ✅ Admin login flow and routing
- ❌ Admin server actions (using Next.js "use server" pattern)
- ❌ Admin helper utilities for database operations
- ❌ RLS policies for admin cross-tenant access
- ❌ Tests and documentation

---

_Last updated: 2025-01-XX_
