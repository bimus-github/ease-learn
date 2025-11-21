import { getServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auth/audit";

type PendingInvite = {
  id: string;
  issued_by: string;
};

async function expireTenantInvites() {
  const supabase = getServiceRoleSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: candidates, error: fetchError } = await supabase
    .from("tenant_invites")
    .select("id, issued_by")
    .eq("status", "pending")
    .lte("expires_at", nowIso);

  if (fetchError) {
    throw new Error(`[tenant-invites] Failed to fetch pending invites: ${fetchError.message}`);
  }

  if (!candidates || candidates.length === 0) {
    console.info("[tenant-invites] No pending invites to expire");
    return;
  }

  const inviteIds = candidates.map((invite) => invite.id);
  const { error: updateError } = await supabase
    .from("tenant_invites")
    .update({
      status: "expired",
    })
    .in("id", inviteIds);

  if (updateError) {
    throw new Error(`[tenant-invites] Failed to mark invites as expired: ${updateError.message}`);
  }

  await Promise.all(
    candidates.map((invite: PendingInvite) =>
      logAdminAction({
        actorId: invite.issued_by,
        action: "tenant_invite_expired",
        resourceType: "tenant_invite",
        resourceId: invite.id,
        payload: {
          reason: "automatic_expiry",
        },
        supabase,
      }),
    ),
  );

  console.info(`[tenant-invites] Expired ${inviteIds.length} invite(s)`);
}

expireTenantInvites()
  .then(() => {
    console.info("[tenant-invites] Expiry job completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[tenant-invites] Expiry job failed", error);
    process.exit(1);
  });

