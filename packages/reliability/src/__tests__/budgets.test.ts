import { describe, expect, it } from "vitest";
import {
  calculateBurnRate,
  calculateErrorBudgetRemaining,
  isSloBreached
} from "../budgets.js";

describe("reliability error budgets", () => {
  it("calculates full remaining budget when observed success meets target", () => {
    expect(
      calculateErrorBudgetRemaining({
        targetPercent: 99.9,
        observedSuccessPercent: 99.95
      })
    ).toBe(50);
  });

  it("calculates partial remaining budget", () => {
    expect(
      calculateErrorBudgetRemaining({
        targetPercent: 99.9,
        observedSuccessPercent: 99.95
      })
    ).toBe(50);
  });

  it("calculates burn rate", () => {
    expect(
      calculateBurnRate({
        targetPercent: 99.9,
        observedSuccessPercent: 99.8
      })
    ).toBeCloseTo(2);
  });

  it("detects SLO breach", () => {
    expect(
      isSloBreached({
        targetPercent: 99.9,
        observedSuccessPercent: 99.8
      })
    ).toBe(true);
  });
});
