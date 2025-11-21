type TenantInviteTemplateProps = {
  recipientName?: string;
  inviteUrl: string;
  expiresAt: string;
  notes?: string;
};

function formatDate(expiresAt: string) {
  try {
    return new Date(expiresAt).toLocaleString();
  } catch {
    return expiresAt;
  }
}

export function renderTenantInviteEmail({
  recipientName,
  inviteUrl,
  expiresAt,
  notes,
}: TenantInviteTemplateProps) {
  const readableDate = formatDate(expiresAt);
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";

  const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your tenant invite</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Inter',Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 80px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#0f172a,#1e3a8a);padding:40px;text-align:center;color:#fff;">
                <p style="margin:0;font-size:14px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.8;">Ease Learn Platform</p>
                <h1 style="margin:12px 0 0;font-size:28px;font-weight:600;">Workspace Invitation</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#0f172a;">${greeting}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#0f172a;">
                  A platform admin has invited you to launch your new Ease Learn workspace. Use the button below to finish onboarding and customize your tenant.
                </p>
                ${
                  notes
                    ? `<div style="margin:0 0 24px;padding:16px;border-radius:12px;background:#eef2ff;color:#1e1b4b;font-size:14px;line-height:1.6;">
                        <strong>Message from the team:</strong><br />${notes}
                       </div>`
                    : ""
                }
                <p style="margin:0 0 32px;text-align:center;">
                  <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:16px;">
                    Start onboarding
                  </a>
                </p>
                <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                  This link expires <strong>${readableDate}</strong>. If you weren't expecting this invite, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Ease Learn. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

  const textLines = [
    greeting,
    "",
    "A platform admin invited you to launch your Ease Learn workspace.",
    "",
    `Start onboarding: ${inviteUrl}`,
    "",
    `This link expires ${readableDate}.`,
  ];

  if (notes) {
    textLines.splice(4, 0, `Notes: ${notes}`, "");
  }

  const text = textLines.join("\n");

  return { html, text };
}

