export function createCorrelationId(prefix = "render"): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
