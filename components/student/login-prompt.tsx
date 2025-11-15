"use client";

import { TelegramLoginButton } from "@/components/student/telegram-login-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTenant } from "@/hooks/useTenant";

type LoginPromptProps = {
  redirectPath?: string;
  className?: string;
};

export function LoginPrompt({ redirectPath, className }: LoginPromptProps) {
  const { tenantSlug } = useTenant();

  return (
    <div
      className={`flex min-h-[calc(100vh-8rem)] items-center justify-center p-6 ${className || ""}`}
    >
      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Welcome
          </CardTitle>
          <CardDescription className="text-base">
            {tenantSlug
              ? `Sign in to access your courses on ${tenantSlug}`
              : "Sign in to access your courses"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TelegramLoginButton redirectPath={redirectPath} />
          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to sign in using your Telegram account
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

