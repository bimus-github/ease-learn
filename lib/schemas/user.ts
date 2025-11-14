import { z } from "zod";

/**
 * User role enum schema
 */
export const userRoleSchema = z.enum(["teacher", "student", "platform_admin"]);

/**
 * User status enum schema
 */
export const userStatusSchema = z.enum([
  "active",
  "suspended",
  "deleted",
  "pending_verification",
]);

/**
 * Social links schema
 */
export const socialLinksSchema = z.object({
  twitter: z.string().url("Twitter URL must be a valid URL").optional(),
  linkedin: z.string().url("LinkedIn URL must be a valid URL").optional(),
  github: z.string().url("GitHub URL must be a valid URL").optional(),
});

/**
 * User profile schema (flexible JSONB)
 */
export const userProfileSchema = z
  .object({
    display_name: z.string().optional(),
    avatar_url: z.string().url("Avatar URL must be a valid URL").optional(),
    phone_number: z.string().optional(),
    bio: z.string().optional(),
    company: z.string().optional(),
    website: z.string().url("Website must be a valid URL").optional(),
    social_links: socialLinksSchema.optional(),
  })
  .passthrough(); // Allow additional fields

/**
 * Notification preferences schema
 */
export const notificationPreferencesSchema = z.object({
  email_enabled: z.boolean().default(true),
  telegram_enabled: z.boolean().default(true),
  course_updates: z.boolean().default(true),
  announcements: z.boolean().default(true),
  quiz_results: z.boolean().default(true),
  enrollment_notifications: z.boolean().default(true),
});

/**
 * Metadata schema (flexible key-value storage)
 */
export const userMetadataSchema = z.record(z.unknown());

/**
 * Main User schema
 */
export const userSchema = z.object({
  // Core identification
  id: z.string().uuid("ID must be a valid UUID"),
  role: userRoleSchema,
  tenant_id: z.string().uuid("Tenant ID must be a valid UUID").nullable(),

  // Telegram integration (for students)
  telegram_user_id: z
    .number()
    .int()
    .positive("Telegram user ID must be positive")
    .nullable(),
  telegram_username: z
    .string()
    .regex(/^@?[a-zA-Z0-9_]{5,32}$/, "Invalid Telegram username format")
    .nullable()
    .optional(),

  // Status & lifecycle
  status: userStatusSchema,
  suspended_at: z.string().datetime().nullable().optional(),
  suspended_reason: z.string().nullable().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
  email_verified: z.boolean().default(false),
  email_verified_at: z.string().datetime().nullable().optional(),

  // Authentication & security
  mfa_enabled: z.boolean().default(false),
  mfa_enabled_at: z.string().datetime().nullable().optional(),
  last_login_at: z.string().datetime().nullable().optional(),

  // Profile
  profile: userProfileSchema.default({}),
  display_name: z
    .string()
    .max(100, "Display name must be 100 characters or less")
    .nullable()
    .optional(),
  avatar_url: z
    .string()
    .url("Avatar URL must be a valid URL")
    .nullable()
    .optional(),
  phone_number: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .nullable()
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must be 500 characters or less")
    .nullable()
    .optional(),

  // Preferences
  notification_preferences: notificationPreferencesSchema.default({
    email_enabled: true,
    telegram_enabled: true,
    course_updates: true,
    announcements: true,
    quiz_results: true,
    enrollment_notifications: true,
  }),

  // Student-specific (cached counts)
  enrollment_count: z.number().int().nonnegative().default(0),
  completed_courses_count: z.number().int().nonnegative().default(0),
  total_watch_time_seconds: z.number().int().nonnegative().default(0),
  last_activity_at: z.string().datetime().nullable().optional(),

  // Teacher-specific
  tenant_owner_id: z
    .string()
    .uuid("Tenant owner ID must be a valid UUID")
    .nullable()
    .optional(),
  invite_token: z.string().nullable().optional(),
  invite_token_expires_at: z.string().datetime().nullable().optional(),

  // Metadata
  metadata: userMetadataSchema.default({}),
  admin_notes: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),

  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Schema for creating a new user (omits auto-generated fields)
 */
export const createUserSchema = z.object({
  // Core identification
  role: userRoleSchema,
  tenant_id: z.string().uuid("Tenant ID must be a valid UUID").nullable(),

  // Telegram integration (for students)
  telegram_user_id: z
    .number()
    .int()
    .positive("Telegram user ID must be positive")
    .nullable()
    .optional(),
  telegram_username: z
    .string()
    .regex(/^@?[a-zA-Z0-9_]{5,32}$/, "Invalid Telegram username format")
    .nullable()
    .optional(),

  // Status & lifecycle
  status: userStatusSchema.default("active"),
  suspended_at: z.string().datetime().nullable().optional(),
  suspended_reason: z.string().nullable().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
  email_verified: z.boolean().default(false),
  email_verified_at: z.string().datetime().nullable().optional(),

  // Authentication & security
  mfa_enabled: z.boolean().default(false),
  mfa_enabled_at: z.string().datetime().nullable().optional(),
  last_login_at: z.string().datetime().nullable().optional(),

  // Profile
  profile: userProfileSchema.default({}),
  display_name: z.string().max(100).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  phone_number: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .nullable()
    .optional(),
  bio: z.string().max(500).nullable().optional(),

  // Preferences
  notification_preferences: notificationPreferencesSchema.default({
    email_enabled: true,
    telegram_enabled: true,
    course_updates: true,
    announcements: true,
    quiz_results: true,
    enrollment_notifications: true,
  }),

  // Student-specific (cached counts) - omitted for creation, will be set to defaults
  last_activity_at: z.string().datetime().nullable().optional(),

  // Teacher-specific
  tenant_owner_id: z.string().uuid().nullable().optional(),
  invite_token: z.string().nullable().optional(),
  invite_token_expires_at: z.string().datetime().nullable().optional(),

  // Metadata
  metadata: userMetadataSchema.default({}),
  admin_notes: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

/**
 * Schema for updating a user (all fields optional except id)
 */
export const updateUserSchema = z.object({
  id: z.string().uuid("ID must be a valid UUID"),
  role: userRoleSchema.optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  telegram_user_id: z.number().int().positive().nullable().optional(),
  telegram_username: z
    .string()
    .regex(/^@?[a-zA-Z0-9_]{5,32}$/, "Invalid Telegram username format")
    .nullable()
    .optional(),
  status: userStatusSchema.optional(),
  suspended_at: z.string().datetime().nullable().optional(),
  suspended_reason: z.string().nullable().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
  email_verified: z.boolean().optional(),
  email_verified_at: z.string().datetime().nullable().optional(),
  mfa_enabled: z.boolean().optional(),
  mfa_enabled_at: z.string().datetime().nullable().optional(),
  last_login_at: z.string().datetime().nullable().optional(),
  profile: userProfileSchema.optional(),
  display_name: z.string().max(100).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  phone_number: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .nullable()
    .optional(),
  bio: z.string().max(500).nullable().optional(),
  notification_preferences: notificationPreferencesSchema.optional(),
  enrollment_count: z.number().int().nonnegative().optional(),
  completed_courses_count: z.number().int().nonnegative().optional(),
  total_watch_time_seconds: z.number().int().nonnegative().optional(),
  last_activity_at: z.string().datetime().nullable().optional(),
  tenant_owner_id: z.string().uuid().nullable().optional(),
  invite_token: z.string().nullable().optional(),
  invite_token_expires_at: z.string().datetime().nullable().optional(),
  metadata: userMetadataSchema.optional(),
  admin_notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Schema for public user information (safe to expose to frontend)
 */
export const publicUserSchema = userSchema.pick({
  id: true,
  role: true,
  display_name: true,
  avatar_url: true,
  bio: true,
  status: true,
  created_at: true,
});

/**
 * Type exports inferred from schemas
 */
export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type SocialLinks = z.infer<typeof socialLinksSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;
export type UserMetadata = z.infer<typeof userMetadataSchema>;
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
