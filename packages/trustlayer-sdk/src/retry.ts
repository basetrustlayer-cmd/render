export function shouldRetry(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

export function calculateRetryDelayMs(attempt: number): number {
  const baseDelay = 250;
  const jitter = Math.floor(Math.random() * 100);
  return baseDelay * 2 ** attempt + jitter;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
