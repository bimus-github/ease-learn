"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getStudentDashboardRoute } from "@/constants/routes/students";
import { useTenant } from "@/hooks/useTenant";

type CreateNonceResponse = {
  nonce: string;
  botDeepLink: string;
  expiresAt: string;
  tenantId: string;
};

type PollResponse =
  | { status: "pending" }
  | {
      status: "ready";
      telegramUserId: number;
      redirectPath: string | null;
      accessToken: string;
      refreshToken: string;
      expiresAt: string | null;
      tokenType: string;
    }
  | { status: "not-found" }
  | { error: string };

type StartLoginOptions = {
  redirectPath?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

const POLL_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 60; // 2 minutes timeout (60 * 2s)

async function createNonce(
  redirectPath?: string
): Promise<CreateNonceResponse> {
  const response = await fetch("/api/auth/telegram/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      redirectPath: redirectPath || undefined,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to create login link" }));
    throw new Error(error.message || "Failed to create login link");
  }

  return response.json();
}

async function pollNonce(nonce: string): Promise<PollResponse> {
  const response = await fetch(
    `/api/auth/telegram/poll?nonce=${encodeURIComponent(nonce)}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (response.status === 202) {
    return { status: "pending" };
  }

  if (response.status === 404) {
    return { status: "not-found" };
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Polling failed" }));
    return { error: error.error || "Polling failed" };
  }

  const data = await response.json();
  return data as PollResponse;
}

async function hydrateSession(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw new Error(`Failed to establish session: ${error.message}`);
  }
}

export function useTelegramLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantSlug } = useTenant();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);

  const createNonceMutation = useMutation({
    mutationKey: ["telegram-login", "create-nonce"],
    mutationFn: createNonce,
  });

  const pollMutation = useMutation({
    mutationKey: ["telegram-login", "poll"],
    mutationFn: pollNonce,
  });

  const hydrateMutation = useMutation({
    mutationKey: ["telegram-login", "hydrate"],
    mutationFn: ({
      accessToken,
      refreshToken,
    }: {
      accessToken: string;
      refreshToken: string;
    }) => hydrateSession(accessToken, refreshToken),
  });

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const startPolling = useCallback(
    (nonce: string, redirectPath: string | null | undefined) => {
      pollAttemptsRef.current = 0;

      const poll = async () => {
        pollAttemptsRef.current += 1;

        if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          console.error("[telegram] Polling timeout");
          return;
        }

        try {
          const result = await pollNonce(nonce);

          if ("status" in result && result.status === "ready") {
            // Stop polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            // Hydrate session
            await hydrateMutation.mutateAsync({
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
            });

            // Invalidate queries to refresh auth state
            await queryClient.invalidateQueries({ queryKey: ["auth"] });

            // Redirect
            const finalRedirectPath: string =
              result.redirectPath ||
              redirectPath ||
              (tenantSlug ? getStudentDashboardRoute(tenantSlug) : "/");

            router.push(finalRedirectPath as any);
            router.refresh();
          } else if (
            ("status" in result && result.status === "not-found") ||
            "error" in result
          ) {
            // Stop polling on error
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
          // If pending, continue polling
        } catch (error) {
          console.error("[telegram] Polling error", error);
          // Continue polling on network errors
        }
      };

      // Start polling immediately, then at intervals
      poll();
      pollingIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    },
    [hydrateMutation, queryClient, router, tenantSlug, pollMutation]
  );

  const startLoginFlow = useCallback(
    async (options: StartLoginOptions = {}) => {
      try {
        // Create nonce
        const nonceData = await createNonceMutation.mutateAsync(
          options.redirectPath || undefined
        );

        // Open Telegram link
        window.open(nonceData.botDeepLink, "_blank");

        // Start polling
        startPolling(nonceData.nonce, options.redirectPath);

        options.onSuccess?.();
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("Login flow failed");
        options.onError?.(err);
        throw err;
      }
    },
    [createNonceMutation, startPolling]
  );

  const getBotDeepLink = useCallback((nonce: string) => {
    const tgBotBaseLink =
      process.env.NEXT_PUBLIC_TG_BOT_BASE_LINK || "https://t.me/ease_learn_bot";
    return `${tgBotBaseLink}?start=${encodeURIComponent(nonce)}`;
  }, []);

  return {
    // Nonce creation
    createNonce: createNonceMutation.mutateAsync,
    isCreatingNonce: createNonceMutation.isPending,
    createNonceError: createNonceMutation.error,

    // Polling
    pollTelegramLogin: pollMutation.mutateAsync,
    isPolling: pollMutation.isPending,
    pollingResult: pollMutation.data,

    // Session hydration
    isHydrating: hydrateMutation.isPending,
    hydrateError: hydrateMutation.error,

    // Complete flow
    startLoginFlow,
    isLoggingIn:
      createNonceMutation.isPending ||
      pollMutation.isPending ||
      hydrateMutation.isPending,

    // Utilities
    getBotDeepLink,
  };
}
