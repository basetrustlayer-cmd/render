# Render Worker Deployment Runbook

## Purpose

The Render worker is a separate runtime from the API and web app. It processes marketplace background jobs through Redis/BullMQ.

## Required Runtime

The worker service must run:

    pnpm worker:build
    pnpm worker:start

Equivalent package-level commands:

    pnpm --filter @render/worker build
    pnpm --filter @render/worker start

## Required Environment Variables

The worker requires:

    DATABASE_URL
    REDIS_URL

Optional observability variable:

    SENTRY_DSN

## Queues Registered in Worker Runtime

The worker runtime currently registers:

    render.smoke
    render.settlement.projection
    render.messaging.notification_fanout
    render.notification.push_delivery
    render.notification.dead_letter
    render.notification.replay_request
    render.webhook.replay_request
    listing expiry worker

## Deployment Certification

Before launch, confirm:

1. REDIS_URL is configured.
2. DATABASE_URL is configured.
3. Worker build passes.
4. Worker process emits worker_ready.
5. Worker shuts down cleanly on SIGTERM.
6. Worker is deployed separately from API.

## Failure Rule

If REDIS_URL is missing, the worker must fail fast.
