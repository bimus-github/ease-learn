"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TenantInviteDialog } from "./tenant-invite-dialog";
import { Plus } from "lucide-react";

export function TenantInviteButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Invite Tenant
      </Button>
      <TenantInviteDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </>
  );
}

