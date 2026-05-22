export function createIdempotencyKey(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
