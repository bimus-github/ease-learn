"use client";

import { useState, useTransition, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getTenantInvitesAction,
  resendTenantInviteAction,
  revokeTenantInviteAction,
} from "@/app/(admin)/admin/(protected)/actions/tenant";
import type { TenantInviteStatus } from "@/lib/admin/types";
import { Mail, RotateCw, X } from "lucide-react";

type TenantInviteRecord = {
  id: string;
  email: string;
  status: TenantInviteStatus;
  expires_at: string;
  issued_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  claimed_at: string | null;
};

const statusConfig: Record<
  TenantInviteStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "Pending", variant: "outline" },
  claimed: { label: "Claimed", variant: "default" },
  revoked: { label: "Revoked", variant: "destructive" },
  expired: { label: "Expired", variant: "secondary" },
};

export function TenantInviteList() {
  const [invites, setInvites] = useState<TenantInviteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadInvites = () => {
    startTransition(async () => {
      setIsLoading(true);
      setError(null);
      const result = await getTenantInvitesAction();
      if (result.success) {
        setInvites(result.data);
      } else {
        setError(result.error);
        setInvites(result.data || []);
      }
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const handleResend = (inviteId: string) => {
    startTransition(async () => {
      const result = await resendTenantInviteAction(inviteId);
      if (result.success) {
        loadInvites();
      } else {
        alert(`Failed to resend invite: ${result.error}`);
      }
    });
  };

  const handleRevoke = (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invite?")) {
      return;
    }
    startTransition(async () => {
      const result = await revokeTenantInviteAction(inviteId);
      if (result.success) {
        loadInvites();
      } else {
        alert(`Failed to revoke invite: ${result.error}`);
      }
    });
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Loading invites...</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Invites</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={loadInvites}
          disabled={isPending}
        >
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {invites.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No invites found.
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => {
            const status = statusConfig[invite.status];
            const canResend = invite.status === "pending" || invite.status === "expired";
            const canRevoke = invite.status === "pending";

            return (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{invite.email}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Expires: {new Date(invite.expires_at).toLocaleString()} · Created:{" "}
                    {new Date(invite.created_at).toLocaleDateString()}
                    {invite.claimed_at && (
                      <> · Claimed: {new Date(invite.claimed_at).toLocaleDateString()}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canResend && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResend(invite.id)}
                      disabled={isPending}
                      title="Resend invite"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  )}
                  {canRevoke && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(invite.id)}
                      disabled={isPending}
                      title="Revoke invite"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

