import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getSystemSettings,
  getFeatureFlags,
  getBrandingSettings,
} from "@/lib/admin/actions/settings";
import { getAuditLogs } from "@/lib/admin/actions/audit";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type SettingsSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default async function AdminSettingsPage() {
  const [systemSettingsResult, featureFlagsResult, brandingResult, auditLogsResult] =
    await Promise.all([
      getSystemSettings(),
      getFeatureFlags(),
      getBrandingSettings(),
      getAuditLogs(
        {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        { page: 1, limit: 1 },
      ),
    ]);

  const systemSettings = systemSettingsResult.success ? systemSettingsResult.data : {};
  const featureFlags = featureFlagsResult.success ? featureFlagsResult.data : {};
  const branding = brandingResult.success ? brandingResult.data : {};
  const auditLogsTotal = auditLogsResult.success ? auditLogsResult.data.total : 0;

  const systemConfig = [
    {
      label: "Session Timeout",
      value: `${(systemSettings as any).session_timeout_hours || 12} hours`,
      note: "Applies to both teachers and platform admins.",
    },
    {
      label: "Telegram Poll Interval",
      value: `${(systemSettings as any).telegram_poll_interval_seconds || 5} seconds`,
      note: "Student dashboard long-poll frequency.",
    },
    {
      label: "Invite Expiration",
      value: `${(systemSettings as any).invite_expiration_days || 14} days`,
      note: "Teacher invites automatically expire after two weeks.",
    },
  ];

  const featureFlagsList = [
    {
      name: "tenant_branding",
      label: "Tenant Branding",
      description: "Allow custom logos/colors per tenant.",
      enabled: (featureFlags as any).tenant_branding || false,
    },
    {
      name: "audit_webhooks",
      label: "Audit Webhooks",
      description: "Send audit events to external systems.",
      enabled: (featureFlags as any).audit_webhooks || false,
    },
    {
      name: "student_payments",
      label: "Student Payments",
      description: "Integrate Stripe checkout for enrollments.",
      enabled: (featureFlags as any).student_payments || false,
    },
  ];

  const brandingSettings = [
    {
      label: "Default Theme",
      value: (branding as any).default_theme || "light",
      description: "Fallback theme for tenants without branding.",
    },
    {
      label: "Email From Name",
      value: (branding as any).email_from_name || "Course Management Platform",
      description: "Used for transactional emails.",
    },
    {
      label: "Support URL",
      value: (branding as any).support_url || "https://support.example.com",
      description: "Shown in student/teacher UIs.",
    },
  ];

  return (
    <section className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Configuration</p>
        <h2 className="text-3xl font-semibold">Settings</h2>
        <p className="text-muted-foreground">
          Manage system-wide settings, feature flags, branding defaults, and review platform audit logs.
        </p>
      </header>

      <SettingsSection
        title="System Configuration"
        description="Global policies impacting every tenant and user."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {systemConfig.map((item) => (
            <Card key={item.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-semibold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.note}</p>
                <Button variant="outline" size="sm" disabled>
                  Update (Soon)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Feature Flags" description="Central switches for staged rollouts and experiments.">
        <div className="grid gap-4 md:grid-cols-3">
          {featureFlagsList.map((flag) => (
            <Card key={flag.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{flag.label}</CardTitle>
                <Badge variant={flag.enabled ? "default" : "outline"}>
                  {flag.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{flag.description}</p>
                <Button variant="outline" size="sm" disabled>
                  Toggle (Soon)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Branding Defaults"
        description="Baseline branding applied when tenants do not override values."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {brandingSettings.map((setting) => (
            <Card key={setting.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{setting.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xl font-semibold">{setting.value}</p>
                <p className="text-sm text-muted-foreground">{setting.description}</p>
                <Button variant="outline" size="sm" disabled>
                  Edit Branding
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Audit Logs" description="Visibility into platform-wide security and operational events.">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Entries (24h)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold">{auditLogsTotal}</p>
              <p className="text-sm text-muted-foreground">New audit events captured in the last day.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Last Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-lg font-semibold">Not available</p>
              <p className="text-sm text-muted-foreground">
                Hook this into object storage for compliance archives.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-lg font-semibold">View logs</p>
              <p className="text-sm text-muted-foreground">Use this section to highlight security anomalies.</p>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled>
            Download CSV (Soon)
          </Button>
          <Button variant="outline" disabled>
            View Live Stream
          </Button>
        </div>
      </SettingsSection>

      <p className="text-sm text-muted-foreground">
        These settings use server actions connected to Supabase. Note: A system_settings table needs to be created for
        settings to persist.
      </p>
    </section>
  );
}

