"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { teacherRoutes } from "@/constants/routes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type MfaEnrollmentState =
  | "idle"
  | "enrolling"
  | "qr-ready"
  | "verifying"
  | "success"
  | "error";

type MfaFactor = {
  id: string;
  type: string;
  status: string;
  friendly_name?: string;
};

export function MfaSetup() {
  const router = useRouter();
  const supabase = createClient();
  const [state, setState] = useState<MfaEnrollmentState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  // Check if MFA is already configured
  useEffect(() => {
    checkExistingFactors();
  }, []);

  async function checkExistingFactors() {
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.getFactors();
      if (factorsError) throw factorsError;

      const activeTotpFactors = factors?.totp?.filter((f) => f.status === "verified") ?? [];
      if (activeTotpFactors.length > 0) {
        // MFA already configured, redirect to dashboard
        router.push(teacherRoutes.dashboard);
      }
    } catch (err) {
      console.error("[mfa] Error checking existing factors", err);
      // Continue with setup flow
    }
  }

  async function startEnrollment() {
    setState("enrolling");
    setError(null);

    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Teacher Account - Authenticator App",
      });

      if (enrollError) throw enrollError;

      if (!data) {
        throw new Error("No enrollment data returned");
      }

      setFactorId(data.id);
      setQrCode(data.qr_code ?? null);
      setSecret(data.secret ?? null);
      setState("qr-ready");
    } catch (err) {
      console.error("[mfa] Enrollment error", err);
      setError(err instanceof Error ? err.message : "Failed to start MFA enrollment");
      setState("error");
    }
  }

  async function verifyAndComplete() {
    if (!factorId || !totpCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setState("verifying");
    setError(null);

    try {
      // For enrollment, verify the TOTP code directly (no challenge needed)
      // The challenge step is only for login/authentication, not enrollment
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        code: totpCode.trim(),
      });

      if (verifyError) throw verifyError;

      // Update users table to mark MFA as enabled
      const { error: updateError } = await supabase
        .from("users")
        .update({
          mfa_enabled: true,
          mfa_enabled_at: new Date().toISOString(),
        })
        .eq("id", (await supabase.auth.getUser()).data.user?.id);

      if (updateError) {
        console.warn("[mfa] Failed to update users table", updateError);
        // Continue anyway - MFA is enabled in Supabase Auth
      }

      setState("success");

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push(teacherRoutes.dashboard);
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error("[mfa] Verification error", err);
      setError(err instanceof Error ? err.message : "Invalid verification code. Please try again.");
      setState("qr-ready");
      setTotpCode("");
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">MFA Setup Complete!</h3>
          <p className="text-sm text-muted-foreground">
            Your account is now secured with Multi-Factor Authentication.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (state === "idle") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Multi-Factor Authentication (MFA) adds an extra layer of security to your account.
            You'll need to set this up before accessing the teacher dashboard.
          </p>
          <p className="text-sm text-muted-foreground">
            We support TOTP (Time-based One-Time Password) authenticator apps like Google
            Authenticator, Authy, or 1Password.
          </p>
        </div>
        <Button onClick={startEnrollment} className="w-full" disabled={state === "enrolling"}>
          {state === "enrolling" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting setup...
            </>
          ) : (
            "Start MFA Setup"
          )}
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  if (state === "enrolling") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Preparing MFA setup...</p>
      </div>
    );
  }

  if (state === "qr-ready" && qrCode) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <p className="text-sm text-muted-foreground">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
          </p>
        </div>

        <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-border">
          <img src={qrCode} alt="MFA QR Code" className="w-64 h-64" />
        </div>

        {secret && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Manual Entry Code (if QR doesn't work)</Label>
            <div className="p-3 bg-muted rounded-md font-mono text-sm break-all text-center">
              {secret}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="totp-code">Enter Verification Code</Label>
          <Input
            id="totp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="000000"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            className="text-center text-lg tracking-widest font-mono"
            disabled={state === "verifying"}
          />
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setState("idle");
              setQrCode(null);
              setSecret(null);
              setFactorId(null);
              setTotpCode("");
              setError(null);
            }}
            className="flex-1"
            disabled={state === "verifying"}
          >
            Cancel
          </Button>
          <Button
            onClick={verifyAndComplete}
            className="flex-1"
            disabled={state === "verifying" || totpCode.length !== 6}
          >
            {state === "verifying" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Complete"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {error || "An unexpected error occurred. Please try again."}
      </AlertDescription>
    </Alert>
  );
}

