export function calculateErrorBudgetRemaining(input: {
  targetPercent: number;
  observedSuccessPercent: number;
}): number {
  const allowedFailurePercent = 100 - input.targetPercent;
  const observedFailurePercent = 100 - input.observedSuccessPercent;

  if (allowedFailurePercent <= 0) {
    return input.observedSuccessPercent >= 100 ? 100 : 0;
  }

  const remaining =
    ((allowedFailurePercent - observedFailurePercent) / allowedFailurePercent) * 100;

  return Math.max(0, Math.min(100, remaining));
}

export function calculateBurnRate(input: {
  targetPercent: number;
  observedSuccessPercent: number;
}): number {
  const allowedFailurePercent = 100 - input.targetPercent;
  const observedFailurePercent = 100 - input.observedSuccessPercent;

  if (allowedFailurePercent <= 0) {
    return observedFailurePercent > 0 ? Number.POSITIVE_INFINITY : 0;
  }

  return observedFailurePercent / allowedFailurePercent;
}

export function isSloBreached(input: {
  targetPercent: number;
  observedSuccessPercent: number;
}): boolean {
  return input.observedSuccessPercent < input.targetPercent;
}
