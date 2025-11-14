"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { loginNonceSchema } from "@/lib/schemas/login";

type PollArgs = {
  nonce: string;
};

type StartLoginArgs = {
  nonce: string;
};

const nonceOnlySchema = loginNonceSchema.pick({ nonce: true });

async function pollNonce({ nonce }: PollArgs) {
  const response = await fetch(`/api/auth/telegram/poll?nonce=${nonce}`, {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 202) {
    return { status: "pending" as const };
  }

  if (!response.ok) {
    throw new Error("Telegram login failed");
  }

  return { status: "ready" as const, ...(await response.json()) };
}

export function useTelegramLogin(botUsername: string) {
  const pollMutation = useMutation({
    mutationKey: ["telegram-login", "poll"],
    mutationFn: pollNonce,
  });

  const getBotDeepLink = useCallback(
    ({ nonce }: StartLoginArgs) => {
      nonceOnlySchema.parse({ nonce });
      return `https://t.me/${botUsername}?start=${nonce}`;
    },
    [botUsername]
  );

  return {
    pollTelegramLogin: pollMutation.mutateAsync,
    isPolling: pollMutation.isPending,
    pollingResult: pollMutation.data,
    getBotDeepLink,
  };
}
