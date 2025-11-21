"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { teacherRoutes } from "@/constants/routes";
import { createClient } from "@/lib/supabase/client";

type TeacherInviteFormProps = {
  token: string;
};

type TokenValidationResult = {
  valid: boolean;
  expired?: boolean;
  used?: boolean;
  error?: string;
  user?: { id: string; email?: string };
};

export function TeacherInviteForm({ token }: TeacherInviteFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenValidationResult | null>(null);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch(
          `/api/auth/teacher/invite/validate?token=${encodeURIComponent(token)}`
        );
        const data = await response.json();
        setTokenStatus(data);

        if (!data.valid) {
          setError(data.error || "Invalid invite link");
        }
      } catch (err) {
        setError("Failed to validate invite link");
        setTokenStatus({ valid: false, error: "Validation failed" });
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      // Call accept endpoint
      const response = await fetch("/api/auth/teacher/invite/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to set up account");
        return;
      }

      // Hydrate session with returned tokens
      if (data.session) {
        const supabase = createClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) {
          setError("Failed to establish session. Please try logging in.");
          return;
        }
      }

      // Redirect to MFA setup
      router.push(data.redirectTo || teacherRoutes.mfaSetup);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set up account");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Validating Invite</CardTitle>
          <CardDescription>Please wait while we validate your invite link...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokenStatus?.valid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Invalid Invite</CardTitle>
          <CardDescription>
            {tokenStatus?.expired
              ? "This invite link has expired"
              : tokenStatus?.used
              ? "This invite link has already been used"
              : "This invite link is invalid"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {tokenStatus?.expired
              ? "Please contact platform support to request a new invite link."
              : tokenStatus?.used
              ? "This invite has already been accepted. Please log in instead."
              : "Please check your email for the correct invite link, or contact platform support."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Complete Your Account Setup</CardTitle>
        <CardDescription>
          Set your password and configure MFA to secure your teacher account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Setting up..." : "Set Password & Continue"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            After setting your password, you&apos;ll be prompted to configure
            MFA (TOTP or WebAuthn) for additional security.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

