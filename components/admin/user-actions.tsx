"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  suspendUser,
  reactivateUser,
  changeUserRole,
} from "@/lib/admin/actions/users";

type UserActionsProps = {
  user: {
    id: string;
    role: string;
    status: string;
  };
};

export function UserActions({ user }: UserActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSuspend = () => {
    setError(null);
    startTransition(async () => {
      const result = await suspendUser(user.id);
      if (!result.success) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  };

  const handleReactivate = () => {
    setError(null);
    startTransition(async () => {
      const result = await reactivateUser(user.id);
      if (!result.success) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  };

  if (error) {
    return <div className="text-xs text-destructive">{error}</div>;
  }

  return (
    <>
      <Button variant="outline" size="sm" className="w-[140px]" disabled>
        Change Role
      </Button>
      {user.status === "active" ? (
        <Button
          variant="outline"
          size="sm"
          className="w-[140px]"
          onClick={handleSuspend}
          disabled={isPending}
        >
          {isPending ? "Suspending..." : "Suspend"}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-[140px]"
          onClick={handleReactivate}
          disabled={isPending}
        >
          {isPending ? "Reactivating..." : "Reactivate"}
        </Button>
      )}
      <Button variant="outline" size="sm" className="w-[120px]" disabled>
        Delete
      </Button>
    </>
  );
}

