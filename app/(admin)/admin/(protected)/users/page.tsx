import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllUsers } from "@/lib/admin/actions/users";
import { UserActions } from "@/components/admin/user-actions";

const roleLabels: Record<string, string> = {
  platform_admin: "Platform Admin",
  teacher: "Teacher",
  student: "Student",
};

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  suspended: "destructive",
  deleted: "secondary",
  pending_verification: "outline",
};

export default async function AdminUsersPage() {
  const usersResult = await getAllUsers();

  if (!usersResult.success) {
    return (
      <section className="space-y-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            User Directory
          </p>
          <h2 className="text-3xl font-semibold">Users</h2>
        </header>
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Error loading users: {usersResult.error}
          </p>
        </div>
      </section>
    );
  }

  const users = usersResult.data.items;

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          User Directory
        </p>
        <h2 className="text-3xl font-semibold">Users</h2>
        <p className="text-muted-foreground">
          Manage all users across the platform. Filter by role, status, and
          perform administrative actions.
        </p>
      </header>

      <FilterStub />

      <div className="rounded-lg border bg-background p-4 shadow-sm">
        {users.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No users found.
          </div>
        ) : (
          <div className="grid gap-4">
            {users.map((user: any) => {
              const status = user.status || "active";
              const displayName =
                user.display_name ||
                user.profile?.display_name ||
                user.email ||
                "Unnamed User";
              const email = user.email || "Email not available";
              const tenantName = user.tenant_id
                ? "Tenant: " + user.tenant_id
                : "No tenant";

              return (
                <div
                  key={user.id}
                  className="grid gap-3 rounded-md border p-4 md:grid-cols-[2fr_1fr]"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold">{displayName}</h3>
                      <Badge variant={statusVariant[status] || "default"}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                      <Badge variant="secondary">
                        {roleLabels[user.role] || user.role}
                      </Badge>
                      {user.mfa_enabled ? (
                        <Badge variant="outline">MFA</Badge>
                      ) : (
                        <Badge variant="outline">No MFA</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{email}</p>
                    <p className="text-sm text-muted-foreground">
                      {tenantName} · Created:{" "}
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <UserActions user={user} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Upcoming enhancements: user impersonation tooling, advanced filtering,
        and bulk operations. This page lives under the admin layout, so auth
        checks already apply.
      </p>
    </section>
  );
}

function FilterStub() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 gap-3">
        <Input
          placeholder="Search users..."
          className="bg-background"
          disabled
        />
        <Select disabled>
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="platform_admin">Platform Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="pending_verification">
              Pending Verification
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="text-sm text-muted-foreground">
        Search + filters coming soon. These will call getAllUsers with filters.
      </div>
    </div>
  );
}
