"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { teacherRoutes } from "@/constants/routes";

export function VerifyEmail() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check verification status on mount
  useEffect(() => {
    async function checkVerification() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
        }

        // Check if email is verified in users table
        const { data: userRecord } = await supabase
          .from("users")
          .select("email_verified")
          .eq("id", user?.id)
          .maybeSingle();

        if (userRecord?.email_verified) {
          setIsVerified(true);
          // Redirect after a short delay
          setTimeout(() => {
            router.push(teacherRoutes.dashboard);
            router.refresh();
          }, 2000);
        }
      } catch (err) {
        console.error("[verify-email] Error checking verification", err);
      } finally {
        setIsChecking(false);
      }
    }

    checkVerification();
  }, [router, supabase]);

  const handleResend = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email || undefined,
      });

      if (resendError) {
        throw resendError;
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send verification email. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Checking verification status...</p>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Email Verified!</h3>
          <p className="text-sm text-muted-foreground">
            Your email has been verified. Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          We've sent a verification email to:
        </p>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{email || "your email address"}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Please check your inbox and click the verification link to verify your email address.
        </p>
      </div>

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Verification email sent! Please check your inbox.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Button
          onClick={handleResend}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? "Sending..." : "Resend Verification Email"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Didn't receive the email? Check your spam folder or click above to resend.
        </p>
      </div>
    </div>
  );
}

