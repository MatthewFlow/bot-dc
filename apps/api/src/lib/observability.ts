import * as Sentry from "@sentry/node";

let enabled = false;

/**
 * Inicjuje Sentry, jeśli ustawiono `SENTRY_DSN` (inaczej no-op). Podpina globalne
 * handlery błędów, żeby nieobsłużone wyjątki trafiały do raportowania.
 */
export function initObservability(service: string): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0,
    initialScope: { tags: { service } },
  });
  enabled = true;

  process.on("unhandledRejection", (reason) =>
    captureError(reason, { kind: "unhandledRejection" }),
  );
  process.on("uncaughtException", (err) =>
    captureError(err, { kind: "uncaughtException" }),
  );

  console.log(`[obs] Sentry włączone (${service}).`);
}

/** Raportuje błąd do Sentry (jeśli włączone) lub loguje do konsoli. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (enabled) {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } else {
    console.error("[error]", err, context ?? "");
  }
}

export function isObservabilityEnabled(): boolean {
  return enabled;
}
