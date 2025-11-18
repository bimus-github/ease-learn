"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { suspendTenant, reactivateTenant } from "@/lib/admin/actions/tenants";

type TenantActionsProps = {
  tenantId: string;
  status: string;
};

export function TenantActions({ tenantId, status }: TenantActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSuspend = () => {
    setError(null);
    startTransition(async () => {
      const result = await suspendTenant(tenantId);
      if (!result.success) {
        setError(result.error);
      } else {
        // Refresh the page to show updated status
        window.location.reload();
      }
    });
  };

  const handleReactivate = () => {
    setError(null);
    startTransition(async () => {
      const result = await reactivateTenant(tenantId);
      if (!result.success) {
        setError(result.error);
      } else {
        // Refresh the page to show updated status
        window.location.reload();
      }
    });
  };

  if (error) {
    return (
      <div className="w-[140px] text-xs text-destructive">
        {error}
      </div>
    );
  }

  if (status === "active") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-[140px]"
        onClick={handleSuspend}
        disabled={isPending}
      >
        {isPending ? "Suspending..." : "Suspend"}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-[140px]"
      onClick={handleReactivate}
      disabled={isPending}
    >
      {isPending ? "Reactivating..." : "Reactivate"}
    </Button>
  );
}

