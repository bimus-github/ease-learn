type TelemetryEvent = {
  name: string;
  tenantId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

const isProd = process.env.NODE_ENV === "production";

function now() {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
}

export function trackEvent(event: TelemetryEvent) {
  if (!isProd) {
    console.info("[telemetry] event", event);
    return;
  }

  // Hook up to real telemetry provider (Sentry, Logflare, etc.)
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ source: "telemetry", ...event }));
}

export async function withTelemetry<T>(
  name: string,
  handler: () => Promise<T>,
  context?: Omit<TelemetryEvent, "name">
) {
  const start = now();
  try {
    const result = await handler();
    trackEvent({
      name,
      metadata: {
        durationMs: Number(now() - start).toFixed(2),
        status: "success",
        ...(context?.metadata ?? {}),
      },
      tenantId: context?.tenantId,
      userId: context?.userId,
    });
    return result;
  } catch (error) {
    trackEvent({
      name,
      metadata: {
        durationMs: Number(now() - start).toFixed(2),
        status: "error",
        error: error instanceof Error ? error.message : "unknown-error",
      },
      tenantId: context?.tenantId,
      userId: context?.userId,
    });
    throw error;
  }
}
