/**
 * Minimal Resend-backed sender for tenant invites.
 * Env requirements:
 *  - RESEND_API_KEY (optional; logs to console when missing)
 *  - TENANT_INVITE_FROM_EMAIL (optional; defaults to noreply@ease-learn.dev)
 */

import { renderTenantInviteEmail } from "@/lib/email/templates/tenant-invite";

type SendTenantInviteEmailArgs = {
  email: string;
  token: string;
  expiresAt: string;
  recipientName?: string;
  notes?: string;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const INVITE_FROM_EMAIL =
  process.env.TENANT_INVITE_FROM_EMAIL ?? "noreply@ease-learn.dev";

function buildInviteUrl(token: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_PLATFORM_URL ??
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "http://localhost:3000";

  return `${baseUrl.replace(/\/$/, "")}/onboard?token=${token}`;
}

export async function sendTenantInviteEmail({
  email,
  token,
  expiresAt,
  recipientName,
  notes,
}: SendTenantInviteEmailArgs): Promise<void> {
  const inviteUrl = buildInviteUrl(token);
  const { html, text } = renderTenantInviteEmail({
    recipientName,
    inviteUrl,
    expiresAt,
    notes,
  });

  if (!RESEND_API_KEY) {
    console.info("[email] Tenant invite (dry run)", {
      email,
      inviteUrl,
      expiresAt,
      recipientName,
      notes,
    });
    return;
  }

  const payload = {
    from: INVITE_FROM_EMAIL,
    to: email,
    subject: "You're invited to create your Ease Learn workspace",
    html,
    text,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `[email] Failed to send tenant invite (${response.status}): ${errorBody}`,
    );
  }
}

