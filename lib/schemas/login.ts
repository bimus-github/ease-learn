import { z } from "zod";

export const loginNonceSchema = z.object({
  nonce: z.string().min(6),
  tenantId: z.string().uuid(),
  redirectPath: z
    .string()
    .regex(/^\/[A-Za-z0-9/_-]*$/, {
      message: "redirectPath must be a relative path",
    })
    .optional(),
  expiresAt: z.string().optional(),
  consumedAt: z.string().nullable().optional(),
  telegramUserId: z.number().optional(),
});

export const telegramCallbackSchema = z.object({
  nonce: z.string().min(6),
  telegramUserId: z.number().int().positive(),
  telegramUsername: z.string().optional(),
  tenantId: z.string().uuid(),
});

export const createNonceRequestSchema = z.object({
  redirectPath: z
    .string()
    .regex(/^\/[A-Za-z0-9/_-]*$/, {
      message: "redirectPath must be a relative path",
    })
    .optional(),
  tenantId: z.string().uuid().optional(), // Optional if resolved from subdomain
});

export type LoginNonce = z.infer<typeof loginNonceSchema>;
export type TelegramCallbackPayload = z.infer<typeof telegramCallbackSchema>;
export type CreateNonceRequest = z.infer<typeof createNonceRequestSchema>;

