# MVP Specification: Teacher Subdomain Course Platform

## Overview

- Single-owner course platform where each teacher operates on a dedicated subdomain (`teachername.platform.com`).
- Focus on secure delivery of video-based courses with complementary quizzes/tests.
- Prioritize a lean workflow that lets teachers publish content, enroll students, and monitor progress.
- Mixed authentication model: students sign in via Telegram bot, teachers manage via centralized email/MFA admin portal.

## Goals

- Let a teacher onboard, configure branding, and publish a course catalogue from their subdomain.
- Enable students to enroll, stream videos securely, and complete assessments with tracked progress.
- Provide platform operators (you) with visibility into tenant status, usage, and moderation controls.

## Roles & Tenancy

- `Teacher Owner`: one per tenant; full control over content, enrollments, branding, analytics.
- `Student`: per-tenant learner; access to assigned courses, playback, assessments, progress visibility.
- `Platform Admin`: internal superuser; manages tenants, monitors usage, handles support/escalations.

## Core MVP Features

**Teacher Onboarding & Admin**

- Sign-up with email verification and MFA-ready auth.
- Subdomain claim/selection with availability check.
- Dashboard home showing quick stats (active students, course count, completion).
- Basic branding: logo upload, color palette, hero copy.
- Centralized admin portal at `my-platform.com/teachers` with email/password + MFA login.

**Course & Content Management**

- CRUD for courses with status (`draft`, `published`, `archived`).
- Modules/lessons structure with drag-and-drop ordering.
- Video uploads with automatic encoding, thumbnail generation, duration detection.
- Attachment handling for supplemental resources (PDF, slides).

**Secure Media Delivery**

- Store video assets in Supabase Storage or external provider; restrict access via signed URLs.
- Optional visible watermark with student email/session ID.
- Basic DRM posture: prevent direct download, expire tokens, domain-restricted playback.

**Assessments**

- Question bank per course (multiple choice, single answer for MVP).
- Quiz builder attaching questions to lessons or modules.
- Auto-grading with pass threshold, number of attempts, and review feedback.
- Teacher view of individual responses and aggregate performance.

**Enrollment & Access Control**

- Manual student invite (email) and CSV import.
- Self-service enrollment via public landing page (free or manual approval).
- Enrollment status management (`active`, `suspended`, `completed`, `expired`).
- Device/session limits (e.g., two concurrent sessions) to deter sharing.
- Student authentication via tenant Telegram bot; teacher authentication via Supabase email/MFA.

**Student Experience**

- Personalized dashboard listing enrolled courses with progress bars.
- Resume playback tracking (last timestamp saved).
- Quiz attempts view with scores and retake availability.
- Notifications center for announcements and assignment reminders.

**Communication**

- Course announcements (email + in-app feed) authored by teacher.
- Student support contact form routed to teacher email.
- Optional discussion board placeholder (text-only, no replies in MVP).

**Analytics & Reporting**

- Per-course insights: average completion, quiz averages, drop-off segments.
- Per-student profiles showing watch stats, quiz history, certificate eligibility.
- Export roster data to CSV with filters (status, completion).

**Platform Administration**

- Internal dashboard listing tenants with key metrics (students, storage usage, plan).
- Ability to suspend/reactivate tenant, reset teacher password, view audit logs.
- Billing overview stub (manual invoicing for MVP if payments out-of-scope).
- Tools to reissue teacher email invites, reset MFA, and monitor Telegram bot health/usage.

## Technical Baseline

- **Frontend**: Next.js (React + TypeScript), Tailwind or Chakra UI, React Query, Plyr/Video.js player.
- **Backend**: Supabase (Auth, Postgres with Row Level Security, Storage, Edge Functions) + optional Node/Next API routes for specialized logic.
- **Storage/Encoding**: Supabase Storage buckets with signed URLs; optional integration with Mux/Cloudflare Stream for advanced DRM/transcoding.
- **Infrastructure**: Vercel for frontend deployment; wildcard DNS for `*.platform.com`; Supabase hosted in nearest region; monitoring via Supabase metrics + Logflare.

## Data Model (High-Level)

- `tenants`: id, subdomain, teacher_owner_id, branding, status, created_at.
- `users`: id, email, password_hash, role, tenant_id, profile metadata.
- `courses`: id, tenant_id, title, description, status, price, published_at.
- `modules`: id, course_id, title, position.
- `lessons`: id, module_id, title, video_asset_id, duration, position, status.
- `video_assets`: id, tenant_id, storage_path, encoding_status, watermark_settings.
- `attachments`: id, lesson_id, storage_path, file_type.
- `quizzes`: id, course_id, title, passing_score, attempts_allowed.
- `questions`: id, quiz_id, question_type, prompt, options, answer_key.
- `enrollments`: id, tenant_id, student_id, course_id, status, valid_until.
- `video_progress`: id, tenant_id, student_id, lesson_id, watched_seconds, completed_at.
- `quiz_attempts`: id, student_id, quiz_id, score, status, submitted_at.
- `announcements`: id, tenant_id, course_id, title, body, published_at.
- `audit_logs`: id, tenant_id, actor_id, action, resource_type, payload, created_at.

## Security & Compliance

- Enforce RLS on all tenant-scoped tables using `tenant_id` and user roles.
- Mandatory MFA for teacher owner accounts using Supabase Auth; Telegram login for students with nonce + approval flow.
- Signed URL expiration (e.g., 5 minutes) and token binding to student ID.
- Privacy controls: teacher can delete student data; platform admin handles global retention policies.
- Logging for sensitive actions (grade overrides, enrollment changes).
- Alerting for Telegram bot downtime and teacher portal suspicious logins.

## MVP Milestones

1. **Tenant Onboarding Flow**: create tenant, claim subdomain, teacher dashboard scaffold.
2. **Course Publishing**: upload videos, structure modules/lessons, publish to student view.
3. **Teacher Admin Auth**: email invite, password setup, MFA enforcement, admin portal access.
4. **Student Enrollment & Playback**: invite student, Telegram login flow, watch video with progress tracking.
5. **Assessments MVP**: create quiz, student takes quiz, auto-grade, teacher reviews.
6. **Analytics Snapshot**: display basic progress metrics; export roster CSV.
7. **Platform Admin Console**: list tenants, suspend/reactivate, view usage log.

## Out of Scope (For Now)

- Payment processing and subscription management.
- Mobile-native apps.
- Advanced community features (forums, live chat).
- Complex assessment types (essays, code exercises).
- Full DRM (Widevine/FairPlay), offline playback.
- Integrations with external LMS/SIS or marketplaces.

## Next Steps

- Validate MVP scope with target teachers; adjust priorities.
- Build design mocks for teacher dashboard and student experience.
- Define telemetry & observability requirements (errors, performance).
- Plan phased rollout and feedback loop with pilot teachers.
