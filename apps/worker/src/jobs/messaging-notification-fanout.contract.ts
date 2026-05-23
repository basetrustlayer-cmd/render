/**
 * Contract marker for messaging notification fanout.
 *
 * Boundary:
 * - consumes render.messaging.notification_fanout queue jobs
 * - records operational logs
 * - does not call email/SMS/push providers yet
 * - does not call TrustLayer
 * - provider delivery remains explicitly deferred
 */
export const MESSAGING_NOTIFICATION_FANOUT_CONTRACT = {
  queue: "render.messaging.notification_fanout",
  workerEventStarted: "messaging.notification_fanout.started",
  completedEvent: "messaging_notification_fanout_completed",
  failedEvent: "messaging_notification_fanout_failed",
  deliveryStatus: "PROVIDER_DELIVERY_PENDING",
  providerDelivery: "DEFERRED"
} as const;
