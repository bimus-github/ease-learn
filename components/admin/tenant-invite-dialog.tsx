"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTenantInviteAction } from "@/app/(admin)/admin/(protected)/actions/tenant";

type TenantInviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function TenantInviteDialog({
  open,
  onOpenChange,
  onSuccess,
}: TenantInviteDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    recipientName: "",
    notes: "",
    subdomain: "",
    planType: "free" as "free" | "trial" | "paid" | "enterprise",
    expiresInHours: 168,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createTenantInviteAction({
        email: formData.email,
        metadata: {
          recipientName: formData.recipientName || undefined,
          notes: formData.notes || undefined,
          subdomain: formData.subdomain || undefined,
          plan_type: formData.planType,
        },
        expiresInHours: formData.expiresInHours,
      });

      if (result.success) {
        onOpenChange(false);
        setFormData({
          email: "",
          recipientName: "",
          notes: "",
          subdomain: "",
          planType: "free",
          expiresInHours: 168,
        });
        onSuccess?.();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite New Tenant</DialogTitle>
          <DialogDescription>
            Send an invitation email to create a new tenant workspace. The recipient will receive a link to complete onboarding.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Recipient Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="teacher@example.com"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient Name (Optional)</Label>
                <Input
                  id="recipientName"
                  value={formData.recipientName}
                  onChange={(e) =>
                    setFormData({ ...formData, recipientName: e.target.value })
                  }
                  placeholder="John Doe"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Message / Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add any additional context for the recipient..."
                  rows={4}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subdomain">Suggested Subdomain (Optional)</Label>
                <Input
                  id="subdomain"
                  value={formData.subdomain}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subdomain: e.target.value.toLowerCase(),
                    })
                  }
                  placeholder="acme"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase alphanumeric with hyphens
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planType">Plan Type</Label>
                <Select
                  value={formData.planType}
                  onValueChange={(value: "free" | "trial" | "paid" | "enterprise") =>
                    setFormData({ ...formData, planType: value })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="planType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresInHours">Expiry (Hours)</Label>
                <Input
                  id="expiresInHours"
                  type="number"
                  min={1}
                  max={720}
                  value={formData.expiresInHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expiresInHours: parseInt(e.target.value) || 168,
                    })
                  }
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Default: 168 hours (7 days)
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

