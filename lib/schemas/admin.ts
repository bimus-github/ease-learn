import { z } from "zod";
import { userRoleSchema, userStatusSchema } from "./user";
import { tenantStatusSchema, tenantBrandingSchema } from "./tenant";

/**
 * Schema for suspending a tenant
 */
export const suspendTenantSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
  reason: z.string().optional(),
});

/**
 * Schema for reactivating a tenant
 */
export const reactivateTenantSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

/**
 * Schema for creating a tenant (minimal required fields)
 */
export const createTenantSchema = z.object({
  subdomain: z
    .string()
    .min(1, "Subdomain is required")
    .max(63, "Subdomain must be 63 characters or less")
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
      "Subdomain must be lowercase alphanumeric with hyphens, not starting or ending with hyphen"
    ),
  teacher_owner_id: z.string().uuid("Teacher owner ID must be a valid UUID"),
  status: tenantStatusSchema.optional().default("active"),
  branding: tenantBrandingSchema.optional(),
  plan_type: z.enum(["free", "trial", "paid", "enterprise"]).optional().default("free"),
});

/**
 * Schema for updating a tenant (partial updates allowed)
 */
export const updateTenantSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
  subdomain: z
    .string()
    .max(63, "Subdomain must be 63 characters or less")
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
  status: tenantStatusSchema.optional(),
  branding: tenantBrandingSchema.optional(),
  plan_type: z.enum(["free", "trial", "paid", "enterprise"]).optional(),
  billing_email: z.string().email("Billing email must be a valid email").nullable().optional(),
  max_students: z.number().int().positive().nullable().optional(),
  max_courses: z.number().int().positive().nullable().optional(),
  max_storage_gb: z.number().int().positive().nullable().optional(),
  admin_notes: z.string().nullable().optional(),
});

/**
 * Schema for suspending a user
 */
export const suspendUserSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
  reason: z.string().optional(),
});

/**
 * Schema for reactivating a user
 */
export const reactivateUserSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
});

/**
 * Schema for changing a user's role
 */
export const changeUserRoleSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
  role: userRoleSchema,
});

/**
 * Schema for updating system settings (flexible JSONB)
 */
export const updateSystemSettingsSchema = z.record(z.unknown());

/**
 * Schema for updating a feature flag
 */
export const updateFeatureFlagSchema = z.object({
  flag: z.string().min(1, "Flag name is required"),
  enabled: z.boolean(),
});

/**
 * Schema for updating branding settings
 */
export const updateBrandingSchema = tenantBrandingSchema;

/**
 * Schema for audit log filters
 */
export const auditLogFiltersSchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
