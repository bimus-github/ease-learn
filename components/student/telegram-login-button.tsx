"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTelegramLogin } from "@/hooks/useTelegramLogin";
import { cn } from "@/lib/utils";

type TelegramLoginButtonProps = {
  redirectPath?: string;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

const TELEGRAM_BLUE = "#0088cc";
const TELEGRAM_BLUE_HOVER = "#0077b3";

export function TelegramLoginButton({
  redirectPath,
  className,
  onSuccess,
  onError,
}: TelegramLoginButtonProps) {
  const { startLoginFlow, isLoggingIn, createNonceError, pollingResult } =
    useTelegramLogin();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggingIn && !statusMessage) {
      setStatusMessage("Opening Telegram...");
    }
  }, [isLoggingIn, statusMessage]);

  useEffect(() => {
    if (pollingResult && "status" in pollingResult) {
      if (pollingResult.status === "pending") {
        setStatusMessage("Waiting for approval...");
      } else if (pollingResult.status === "ready") {
        setStatusMessage("Almost there...");
      }
    }
  }, [pollingResult]);

  const handleClick = async () => {
    try {
      setStatusMessage("Opening Telegram...");
      await startLoginFlow({
        redirectPath,
        onSuccess: () => {
          setStatusMessage("Waiting for approval...");
          onSuccess?.();
        },
        onError: (error) => {
          setStatusMessage(null);
          onError?.(error);
        },
      });
    } catch (error) {
      setStatusMessage(null);
      const err = error instanceof Error ? error : new Error("Login failed");
      onError?.(err);
    }
  };

  const errorMessage =
    createNonceError instanceof Error
      ? createNonceError.message
      : createNonceError
      ? "Failed to start login"
      : null;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Button
        onClick={handleClick}
        disabled={isLoggingIn}
        className={cn(
          "h-12 px-8 text-base font-medium transition-all duration-200",
          "hover:shadow-lg active:scale-[0.98]",
          "disabled:opacity-70 disabled:cursor-not-allowed"
        )}
        style={{
          backgroundColor: isLoggingIn ? undefined : TELEGRAM_BLUE,
          color: "white",
        }}
        onMouseEnter={(e) => {
          if (!isLoggingIn) {
            e.currentTarget.style.backgroundColor = TELEGRAM_BLUE_HOVER;
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoggingIn) {
            e.currentTarget.style.backgroundColor = TELEGRAM_BLUE;
          }
        }}
        aria-label="Continue with Telegram"
      >
        {isLoggingIn ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {statusMessage || "Processing..."}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.09-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
                fill="currentColor"
              />
            </svg>
            Continue with Telegram
          </span>
        )}
      </Button>

      {statusMessage && !errorMessage && (
        <p className="text-sm text-muted-foreground animate-in fade-in duration-200">
          {statusMessage}
        </p>
      )}

      {errorMessage && (
        <div className="w-full space-y-2 animate-in fade-in duration-200">
          <p className="text-sm text-destructive text-center">{errorMessage}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClick}
            className="w-full"
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
