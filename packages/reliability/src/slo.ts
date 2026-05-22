export const RENDER_SLOS = {
  apiAvailability: {
    targetPercent: 99.9,
    windowDays: 30
  },
  settlementProcessingLatency: {
    p95Ms: 15000
  },
  webhookProcessingLatency: {
    p95Ms: 5000
  },
  authRequestLatency: {
    p95Ms: 750
  },
  queueBacklogAge: {
    maxSeconds: 120
  }
} as const;

export type RenderSloName = keyof typeof RENDER_SLOS;
