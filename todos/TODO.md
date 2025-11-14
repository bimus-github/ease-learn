# TODO: Course Management Platform

## 🔴 High Priority - Foundation

### Database Schema & Migrations
- [ ] Create `tenants` table migration
  - Fields: id, subdomain (unique), teacher_owner_id, branding (JSONB), status, created_at, updated_at
  - Indexes on subdomain and teacher_owner_id
- [ ] Create `users` table migration (extends Supabase auth.users)
  - Fields: id (references auth.users), role (teacher/student), tenant_id, telegram_user_id, telegram_username, profile (JSONB), created_at
  - Indexes on tenant_id, role, telegram_user_id
- [ ] Create `courses` table migration
  - Fields: id, tenant_id, title, description, status (draft/published/archived), price, published_at, created_at, updated_at
  - Foreign key to tenants
- [ ] Create `modules` table migration
  - Fields: id, course_id, title, position, created_at, updated_at
  - Foreign key to courses
- [ ] Create `lessons` table migration
  - Fields: id, module_id, title, video_asset_id, duration, position, status, created_at, updated_at
  - Foreign key to modules
- [ ] Create `video_assets` table migration
  - Fields: id, tenant_id, storage_path, encoding_status, watermark_settings (JSONB), duration, created_at, updated_at
  - Foreign key to tenants
- [ ] Create `attachments` table migration
  - Fields: id, lesson_id, storage_path, file_type, file_name, file_size, created_at
  - Foreign key to lessons
- [ ] Create `enrollments` table migration
  - Fields: id, tenant_id, student_id, course_id, status (active/suspended/completed/expired), valid_until, created_at, updated_at
  - Foreign keys to tenants, users, courses
  - Unique constraint on (student_id, course_id)
- [ ] Create `video_progress` table migration
  - Fields: id, tenant_id, student_id, lesson_id, watched_seconds, completed_at, last_watched_at, created_at, updated_at
  - Foreign keys to tenants, users, lessons
  - Unique constraint on (student_id, lesson_id)
- [ ] Create `quizzes` table migration
  - Fields: id, course_id, title, passing_score, attempts_allowed, created_at, updated_at
  - Foreign key to courses
- [ ] Create `questions` table migration
  - Fields: id, quiz_id, question_type, prompt, options (JSONB), answer_key, position, created_at, updated_at
  - Foreign key to quizzes
- [ ] Create `quiz_attempts` table migration
  - Fields: id, student_id, quiz_id, score, status, submitted_at, answers (JSONB), created_at
  - Foreign keys to users, quizzes
- [ ] Create `announcements` table migration
  - Fields: id, tenant_id, course_id (nullable), title, body, published_at, created_at, updated_at
  - Foreign keys to tenants, courses
- [ ] Create `audit_logs` table migration
  - Fields: id, tenant_id, actor_id, action, resource_type, resource_id, payload (JSONB), created_at
  - Indexes on tenant_id, actor_id, created_at
- [ ] Implement Row Level Security (RLS) policies for all tenant-scoped tables
  - Teachers can only access their tenant's data
  - Students can only access their enrolled courses and progress
  - Platform admins have full access

### Telegram Bot Implementation
- [ ] Create Telegram bot webhook handler/API route
  - Receives `/start <nonce>` command
  - Validates nonce exists and is not expired
  - Sends confirmation message with approval button
- [ ] Implement bot approval callback
  - Handles button click approval
  - Calls `/api/auth/telegram/callback` with user data
- [ ] Set up bot webhook configuration
  - Environment variable for webhook URL
  - Webhook secret validation
- [ ] Add bot error handling and logging
- [ ] Test bot flow end-to-end

### Student Authentication Completion
- [x] Create nonce generation API endpoint (`/api/auth/telegram/start`)
  - Generates unique nonce per tenant
  - Stores in `login_nonces` table with expiration (2-minute TTL)
  - Returns nonce and bot deep link to frontend
  - Rate limiting: 5 nonces per minute per IP address
  - Tenant resolution from subdomain or explicit tenant_id parameter
- [x] Complete `upsertTelegramStudent` function
  - Create/update student user in Supabase Auth
  - Link Telegram user ID to Supabase user
  - Create user record in `users` table with role='student'
  - Generate Supabase session token
- [ ] Implement session establishment after Telegram approval
  - Frontend polls until nonce is consumed
  - Exchange nonce for session token
  - Store session in cookies
- [ ] Add role checking in `requireStudentAuth` (remove TODO)
- [ ] Add student session validation middleware

### Teacher Authentication Completion
- [ ] Implement MFA enforcement
  - Check MFA is enabled before allowing dashboard access
  - Prompt MFA setup if not configured
  - Integrate Supabase MFA (TOTP/WebAuthn)
- [ ] Add role checking in `requireTeacherAuth` (remove TODO)
  - Verify user role is 'teacher'
  - Verify user has tenant ownership
- [ ] Complete invite token validation
  - Create invite tokens table or use Supabase magic links
  - Validate token in invite form
  - Set password and create teacher account
- [ ] Implement subdomain claim/selection
  - Check subdomain availability
  - Create tenant record with claimed subdomain
  - Link teacher to tenant
- [ ] Add email verification flow
  - Send verification email on signup
  - Verify email before allowing access

## 🟡 Medium Priority - Core Features

### Course Management (Teacher)
- [ ] Create course CRUD API routes
  - POST `/api/courses` - Create course
  - GET `/api/courses` - List courses for tenant
  - GET `/api/courses/[id]` - Get course details
  - PATCH `/api/courses/[id]` - Update course
  - DELETE `/api/courses/[id]` - Delete course
- [ ] Create course management UI
  - Course list page with status filters
  - Course creation form
  - Course edit page
  - Course publish/unpublish actions
- [ ] Implement module/lesson management
  - Drag-and-drop ordering
  - Module CRUD operations
  - Lesson CRUD operations
  - Lesson position updates
- [ ] Create course form components
  - Title, description, price inputs
  - Status selector (draft/published/archived)
  - Image upload for course thumbnail

### Video Upload & Storage
- [ ] Set up Supabase Storage buckets
  - Create `videos` bucket with proper policies
  - Create `attachments` bucket
  - Configure CORS settings
- [ ] Implement video upload API
  - Handle file uploads
  - Store in Supabase Storage
  - Create `video_assets` record
  - Return video asset ID
- [ ] Add video upload UI
  - File picker component
  - Upload progress indicator
  - Video preview
- [ ] Implement signed URL generation
  - Generate time-limited signed URLs (5 min expiry)
  - Bind to student ID and tenant
  - Domain-restricted playback
- [ ] Add video encoding status tracking
  - Poll encoding status
  - Update `video_assets.encoding_status`
- [ ] Integrate Plyr video player
  - Create video player component
  - Load signed URLs
  - Track playback progress

### Student Enrollment
- [ ] Create enrollment API routes
  - POST `/api/enrollments` - Enroll student in course
  - GET `/api/enrollments` - List student enrollments
  - PATCH `/api/enrollments/[id]` - Update enrollment status
- [ ] Implement manual student invite
  - Email invite form
  - Send invite email with tenant subdomain
  - Create pending enrollment
- [ ] Add CSV import functionality
  - CSV upload component
  - Parse and validate CSV
  - Bulk create enrollments
- [ ] Create self-service enrollment flow
  - Public course catalog per tenant
  - Enrollment button for free courses
  - Approval workflow for paid courses
- [ ] Implement enrollment status management
  - Active, suspended, completed, expired states
  - Status change UI for teachers

### Student Dashboard & Course Access
- [ ] Create course catalog component
  - List enrolled courses
  - Show course progress bars
  - Filter by status
- [ ] Implement course detail page
  - Course overview
  - Module/lesson list
  - Progress indicators
- [ ] Create video player page
  - Load lesson video
  - Display lesson content
  - Show attachments
- [ ] Implement progress tracking
  - Save watch position on pause
  - Mark lesson as completed
  - Update progress in database
- [ ] Add resume playback functionality
  - Load last watched position
  - Auto-resume from saved timestamp

## 🟢 Lower Priority - Enhanced Features

### Assessments (Quizzes)
- [ ] Create quiz builder UI
  - Question bank management
  - Multiple choice question creator
  - Answer key configuration
- [ ] Implement quiz taking flow
  - Display quiz questions
  - Submit answers
  - Auto-grade responses
- [ ] Add quiz results view
  - Student score display
  - Retake availability
  - Review correct answers
- [ ] Create teacher quiz analytics
  - Individual student responses
  - Aggregate performance metrics
  - Pass rate statistics

### Teacher Dashboard Enhancements
- [ ] Implement real data fetching
  - Replace placeholder stats with actual queries
  - Active students count
  - Published courses count
  - Completion rates
- [ ] Add analytics components
  - Course completion charts
  - Student engagement metrics
  - Revenue overview (if pricing enabled)
- [ ] Create student management page
  - List all enrolled students
  - Student profile view
  - Enrollment status management
- [ ] Add course analytics page
  - Per-course insights
  - Average completion rates
  - Drop-off analysis
  - Quiz performance

### Communication Features
- [ ] Implement course announcements
  - Create announcement form
  - Publish to enrolled students
  - Email + in-app notifications
- [ ] Add student support contact form
  - Contact form component
  - Route to teacher email
  - Support ticket tracking (optional)

### Platform Admin Console
- [ ] Create admin routes structure
  - `/admin` route group
  - Admin authentication middleware
- [ ] Build tenant management page
  - List all tenants
  - Tenant status (active/suspended)
  - Key metrics per tenant
- [ ] Add tenant administration tools
  - Suspend/reactivate tenant
  - Reset teacher password
  - View audit logs
- [ ] Create usage monitoring dashboard
  - Storage usage per tenant
  - Student count per tenant
  - Activity metrics

### Branding & Customization
- [ ] Implement tenant branding
  - Logo upload
  - Color palette configuration
  - Hero copy editor
- [ ] Apply branding to student pages
  - Dynamic theme per tenant
  - Custom logo display
  - Branded email templates

## 🔵 Testing & Quality

### Unit Tests
- [ ] Write tests for auth utilities
  - `requireTeacherAuth` function
  - `requireStudentAuth` function
  - `upsertTelegramStudent` function
- [ ] Test tenant resolution logic
  - `getTenantFromRequest` function
  - Subdomain parsing edge cases
- [ ] Test form validation schemas
  - Login schema
  - Course creation schema
  - Enrollment schema

### E2E Tests (Playwright)
- [ ] Test teacher login flow
  - Email/password login
  - MFA setup and verification
  - Dashboard access
- [ ] Test student Telegram login flow
  - Nonce generation
  - Bot approval
  - Session establishment
- [ ] Test course creation flow
  - Create course
  - Add modules and lessons
  - Publish course
- [ ] Test student enrollment and playback
  - Enroll in course
  - Watch video
  - Progress tracking

## 🟣 Documentation & Deployment

### Documentation
- [ ] Update README with current status
- [ ] Document API endpoints
- [ ] Create deployment guide
- [ ] Add environment variable documentation
- [ ] Document database schema

### Deployment Preparation
- [ ] Set up Vercel project configuration
- [ ] Configure wildcard domain DNS
- [ ] Set up production environment variables
- [ ] Configure Supabase production project
- [ ] Set up Telegram webhook for production
- [ ] Create deployment checklist
- [ ] Set up monitoring and error tracking (Sentry/Logflare)

## 📝 Notes

- All database migrations should include proper indexes for performance
- RLS policies are critical for tenant isolation and security
- Telegram bot needs to be deployed separately (Edge Function or serverless)
- Consider rate limiting for API endpoints
- Add input validation and sanitization everywhere
- Implement proper error handling and user feedback
- Add loading states and optimistic updates where appropriate

