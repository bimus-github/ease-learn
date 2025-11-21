import { z } from "zod";

/**
 * Tenant status enum schema
 */
export const tenantStatusSchema = z.enum([
  "active",
  "suspended",
  "archived",
  "trial",
]);

/**
 * Plan type enum schema
 */
export const planTypeSchema = z.enum(["free", "trial", "paid", "enterprise"]);

/**
 * Subscription status enum schema
 */
export const subscriptionStatusSchema = z.enum([
  "active",
  "cancelled",
  "past_due",
  "trialing",
]);

/**
 * Button schema for entry content
 */
export const entryContentButtonSchema = z.object({
  text: z.string().min(1, "Button text is required"),
  url: z.string().url("Button URL must be a valid URL"),
});

/**
 * Entry content schema
 */
export const entryContentSchema = z.object({
  video_url: z.string().url("Video URL must be a valid URL").optional(),
  image_url: z.string().url("Image URL must be a valid URL").optional(),
  text: z.string().optional(),
  buttons: z.array(entryContentButtonSchema).optional(),
});

/**
 * Branding configuration schema
 */
export const tenantBrandingSchema = z.object({
  logo: z.string().url("Logo must be a valid URL").optional(),
  name: z.string().min(1, "Tenant name is required"),
  description: z.string().min(1, "Tenant description is required"),
  entry_content: entryContentSchema,
});

/**
 * Metadata schema (flexible key-value storage)
 */
export const tenantMetadataSchema = z.record(z.unknown());

/**
 * Main Tenant schema
 */
export const tenantSchema = z.object({
  // Core identification
  id: z.string().uuid("ID must be a valid UUID"),
  subdomain: z
    .string()
    .min(1, "Subdomain is required")
    .max(63, "Subdomain must be 63 characters or less")
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
      "Subdomain must be lowercase alphanumeric with hyphens, not starting or ending with hyphen"
    ),
  custom_domain: z
    .string()
    .regex(
      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/,
      "Custom domain must be a valid domain name"
    )
    .nullable()
    .optional(),

  // Ownership
  teacher_owner_id: z.string().uuid("Teacher owner ID must be a valid UUID"),

  // Status & lifecycle
  status: tenantStatusSchema,
  suspended_at: z.string().datetime().nullable().optional(),
  suspended_reason: z.string().nullable().optional(),
  deleted_at: z.string().datetime().nullable().optional(),

  // Branding & customization
  branding: tenantBrandingSchema,

  // Subscription & billing
  plan_type: planTypeSchema,
  subscription_status: subscriptionStatusSchema.nullable().optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  billing_email: z
    .string()
    .email("Billing email must be a valid email")
    .nullable()
    .optional(),
  stripe_customer_id: z.string().nullable().optional(),
  current_period_start: z.string().datetime().nullable().optional(),
  current_period_end: z.string().datetime().nullable().optional(),

  // Limits & quotas
  max_students: z.number().int().positive().nullable().optional(),
  max_courses: z.number().int().positive().nullable().optional(),
  max_storage_gb: z.number().int().positive().nullable().optional(),

  // Analytics (cached counts)
  last_active_at: z.string().datetime().nullable().optional(),
  total_students_count: z.number().int().nonnegative().default(0),
  total_courses_count: z.number().int().nonnegative().default(0),
  storage_used_bytes: z.number().int().nonnegative().default(0),

  // Metadata
  metadata: tenantMetadataSchema.default({}),
  admin_notes: z.string().nullable().optional(),

  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Schema for creating a new tenant (omits auto-generated fields)
 */
export const createTenantSchema = z.object({
  // Core identification
  subdomain: z
    .string()
    .min(1, "Subdomain is required")
    .max(63, "Subdomain must be 63 characters or less")
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
      "Subdomain must be lowercase alphanumeric with hyphens, not starting or ending with hyphen"
    ),
  custom_domain: z
    .string()
    .regex(
      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/,
      "Custom domain must be a valid domain name"
    )
    .nullable()
    .optional(),

  // Ownership
  teacher_owner_id: z.string().uuid("Teacher owner ID must be a valid UUID"),

  // Status & lifecycle
  status: tenantStatusSchema.default("active"),
  suspended_at: z.string().datetime().nullable().optional(),
  suspended_reason: z.string().nullable().optional(),
  deleted_at: z.string().datetime().nullable().optional(),

  // Branding & customization
  branding: tenantBrandingSchema,

  // Subscription & billing
  plan_type: planTypeSchema.default("free"),
  subscription_status: subscriptionStatusSchema.nullable().optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  billing_email: z
    .string()
    .email("Billing email must be a valid email")
    .nullable()
    .optional(),
  stripe_customer_id: z.string().nullable().optional(),
  current_period_start: z.string().datetime().nullable().optional(),
  current_period_end: z.string().datetime().nullable().optional(),

  // Limits & quotas
  max_students: z.number().int().positive().nullable().optional(),
  max_courses: z.number().int().positive().nullable().optional(),
  max_storage_gb: z.number().int().positive().nullable().optional(),

  // Analytics (cached counts) - omitted for creation, will be set to defaults
  last_active_at: z.string().datetime().nullable().optional(),

  // Metadata
  metadata: tenantMetadataSchema.default({}),
  admin_notes: z.string().nullable().optional(),
});

/**
 * Schema for updating a tenant (all fields optional except id)
 */
export const updateTenantSchema = z.object({
  id: z.string().uuid("ID must be a valid UUID"),
  subdomain: z
    .string()
    .min(1)
    .max(63)
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
      "Subdomain must be lowercase alphanumeric with hyphens, not starting or ending with hyphen"
    )
    .optional(),
  custom_domain: z
    .string()
    .regex(
      /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/,
      "Custom domain must be a valid domain name"
    )
    .nullable()
    .optional(),
  teacher_owner_id: z.string().uuid().optional(),
  status: tenantStatusSchema.optional(),
  suspended_at: z.string().datetime().nullable().optional(),
  suspended_reason: z.string().nullable().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
  branding: tenantBrandingSchema.optional(),
  plan_type: planTypeSchema.optional(),
  subscription_status: subscriptionStatusSchema.nullable().optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  billing_email: z.string().email().nullable().optional(),
  stripe_customer_id: z.string().nullable().optional(),
  current_period_start: z.string().datetime().nullable().optional(),
  current_period_end: z.string().datetime().nullable().optional(),
  max_students: z.number().int().positive().nullable().optional(),
  max_courses: z.number().int().positive().nullable().optional(),
  max_storage_gb: z.number().int().positive().nullable().optional(),
  last_active_at: z.string().datetime().nullable().optional(),
  total_students_count: z.number().int().nonnegative().optional(),
  total_courses_count: z.number().int().nonnegative().optional(),
  storage_used_bytes: z.number().int().nonnegative().optional(),
  metadata: tenantMetadataSchema.optional(),
  admin_notes: z.string().nullable().optional(),
});

/**
 * Schema for public tenant information (safe to expose to frontend)
 */
export const publicTenantSchema = tenantSchema.pick({
  id: true,
  subdomain: true,
  custom_domain: true,
  branding: true,
  status: true,
  created_at: true,
  updated_at: true,
});

/**
 * Type exports inferred from schemas
 */
export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type PlanType = z.infer<typeof planTypeSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type EntryContentButton = z.infer<typeof entryContentButtonSchema>;
export type EntryContent = z.infer<typeof entryContentSchema>;
export type TenantBranding = z.infer<typeof tenantBrandingSchema>;
export type TenantMetadata = z.infer<typeof tenantMetadataSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type TenantFull = Tenant & {
  total_students_count: number;
  total_courses_count: number;
  storage_used_bytes: number;
};
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type PublicTenant = z.infer<typeof publicTenantSchema>;
