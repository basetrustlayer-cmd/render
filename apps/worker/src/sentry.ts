import * as Sentry from "@sentry/node";

export function initWorkerSentry(): void {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    release: process.env.RENDER_GIT_COMMIT ?? process.env.SENTRY_RELEASE,
  });
}

export function captureWorkerException(error: unknown, context?: Record<string, unknown>): void {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureException(error, {
    extra: context,
  });
}
