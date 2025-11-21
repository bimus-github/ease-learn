import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { TenantActions } from "@/components/admin/tenant-actions";
import { TenantInviteButton } from "@/components/admin/tenant-invite-button";
import { TenantInviteList } from "@/components/admin/tenant-invite-list";
import { getAllTenantsFullAction } from "../actions/tenant";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  active: { label: "Active", variant: "default" },
  suspended: { label: "Suspended", variant: "destructive" },
  archived: { label: "Archived", variant: "secondary" },
  trial: { label: "Trial", variant: "outline" },
};

export default async function AdminTenantsPage() {
  const tenantsResult = await getAllTenantsFullAction();

  if (!tenantsResult.success) {
    return (
      <section className="space-y-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Tenant Operations
          </p>
          <h2 className="text-3xl font-semibold">Tenants</h2>
        </header>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Error loading tenants: {tenantsResult.error}
          </p>
        </div>
      </section>
    );
  }

  const tenants = tenantsResult.data;

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Tenant Operations
            </p>
            <h2 className="text-3xl font-semibold">Tenants</h2>
            <p className="text-muted-foreground">
              Manage all platform tenants. View status, perform administrative actions, and monitor key metrics.
            </p>
          </div>
          <TenantInviteButton />
        </div>
      </header>

      <SearchFilterStub />

      <div className="rounded-lg border bg-background p-4 shadow-sm">
        {tenants.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No tenants found.</div>
        ) : (
          <div className="grid gap-4">
            {tenants.map((tenant: any) => {
              const status = tenant.status || "active";
              const branding = tenant.branding || {};
              const tenantName = branding.name || tenant.subdomain || "Unnamed Tenant";

              return (
                <div
                  key={tenant.id}
                  className="grid gap-3 rounded-md border p-4 md:grid-cols-[2fr_1fr]"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold">{tenantName}</h3>
                      <Badge variant={statusConfig[status]?.variant || "default"}>
                        {statusConfig[status]?.label || status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Subdomain: {tenant.subdomain}</p>
                    <p className="text-sm text-muted-foreground">
                      Students: {tenant.total_students_count || 0} · Courses:{" "}
                      {tenant.total_courses_count || 0} · Created:{" "}
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </p>
                    {tenant.admin_notes && (
                      <p className="text-sm text-muted-foreground">{tenant.admin_notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" size="sm" className="w-[120px]" disabled>
                      Edit Tenant
                    </Button>
                    <TenantActions tenantId={tenant.id} status={status} />
                    <Button variant="outline" size="sm" className="w-[140px]" disabled>
                      View Audit Log
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TenantInviteList />

      <p className="text-sm text-muted-foreground">
        Planned features: tenant creation wizard, advanced filtering, bulk actions, and per-tenant configuration panels.
      </p>
    </section>
  );
}

function SearchFilterStub() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 gap-3">
        <Input placeholder="Search tenants..." className="bg-background" disabled />
        <Select disabled>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="text-sm text-muted-foreground">
        Search & filters coming soon. These will call getAllTenants with filters.
      </div>
    </div>
  );
}

