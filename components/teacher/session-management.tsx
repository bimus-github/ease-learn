"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  Smartphone,
  Monitor,
  Trash2,
  Loader2,
  Shield,
} from "lucide-react";
import { teacherRoutes } from "@/constants/routes";

type SessionInfo = {
  id: string;
  current: boolean;
  device?: string;
  ip?: string;
  lastActive?: string;
  createdAt?: string;
};

type MfaInfo = {
  enabled: boolean;
  enabledAt: string | null;
  factors: Array<{ id: string; type: string; friendly_name?: string }>;
};

type SessionsData = {
  sessions: SessionInfo[];
  mfa: MfaInfo;
};

export function SessionManagement() {
  const router = useRouter();
  const supabase = createClient();
  const [data, setData] = useState<SessionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }

      const sessionsData = await response.json();
      setData(sessionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevoke(sessionId: string, isCurrent: boolean) {
    if (!confirm(`Are you sure you want to revoke this session? ${isCurrent ? "You will be logged out." : ""}`)) {
      return;
    }

    setRevokingId(sessionId);

    try {
      const response = await fetch("/api/auth/sessions/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: isCurrent ? undefined : sessionId,
          revokeAll: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to revoke session");
      }

      // If current session was revoked, redirect to login
      if (isCurrent) {
        await supabase.auth.signOut();
        router.push(teacherRoutes.login);
        router.refresh();
      } else {
        // Refresh session list
        await fetchSessions();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeAll() {
    if (!confirm("Are you sure you want to revoke all sessions? You will be logged out.")) {
      return;
    }

    setRevokingId("all");

    try {
      const response = await fetch("/api/auth/sessions/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          revokeAll: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to revoke sessions");
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      router.push(teacherRoutes.login);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke sessions");
      setRevokingId(null);
    }
  }

  function getDeviceIcon(device?: string) {
    if (!device) return <Monitor className="h-4 w-4" />;
    if (device.toLowerCase().includes("phone") || device.toLowerCase().includes("iphone") || device.toLowerCase().includes("android")) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  }

  function formatDate(dateString?: string) {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "Unknown";
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* MFA Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Multi-Factor Authentication</CardTitle>
            </div>
            {data?.mfa.enabled ? (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Enabled
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <XCircle className="h-4 w-4" />
                Not Enabled
              </span>
            )}
          </div>
          <CardDescription>
            {data?.mfa.enabled
              ? `MFA was enabled on ${data.mfa.enabledAt ? formatDate(data.mfa.enabledAt) : "unknown date"}.`
              : "Enable MFA to add an extra layer of security to your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.mfa.enabled && data.mfa.factors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Active MFA Factors:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {data.mfa.factors.map((factor) => (
                  <li key={factor.id}>
                    {factor.friendly_name || factor.type.toUpperCase()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!data?.mfa.enabled && (
            <Button
              onClick={() => router.push(teacherRoutes.mfaSetup)}
              variant="outline"
            >
              Set Up MFA
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Sessions</CardTitle>
            {data && data.sessions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeAll}
                disabled={revokingId !== null}
              >
                {revokingId === "all" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  "Revoke All"
                )}
              </Button>
            )}
          </div>
          <CardDescription>
            Manage your active sessions. Revoking a session will log you out from that device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {data && data.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions found.</p>
          ) : (
            <div className="space-y-3">
              {data?.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getDeviceIcon(session.device)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {session.device || "Unknown Device"}
                        </p>
                        {session.current && (
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1 mt-1">
                        {session.ip && <p>IP: {session.ip}</p>}
                        {session.lastActive && (
                          <p>Last active: {formatDate(session.lastActive)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(session.id, session.current)}
                    disabled={revokingId !== null}
                  >
                    {revokingId === session.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Revoking...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Revoke
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

