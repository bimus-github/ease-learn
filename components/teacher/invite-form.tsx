"use client";

import { useState } from "react";
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

type TeacherInviteFormProps = {
  token: string;
};

export function TeacherInviteForm({ token }: TeacherInviteFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement invite token validation and password setup
      // This should:
      // 1. Validate the invite token
      // 2. Set the teacher's password
      // 3. Prompt for MFA setup
      // 4. Mark tenant as active
      // 5. Redirect to dashboard

      console.log("Invite token:", token);
      console.log("Setting up password...");

      // Placeholder - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      router.push(teacherRoutes.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set up account");
    } finally {
      setIsLoading(false);
    }
  };

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

