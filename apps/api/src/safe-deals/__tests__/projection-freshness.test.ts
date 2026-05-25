import { describe, expect, it, vi } from "vitest";
import { getSafeDealProjectionFreshness } from "../projection-freshness.js";

describe("SafeDeal projection freshness", () => {
  it("classifies missing projection sync as missing", () => {
    expect(getSafeDealProjectionFreshness({ lastSyncedAt: null }).state).toBe("MISSING");
  });

  it("classifies expired SafeDeal projections", () => {
    vi.setSystemTime(new Date("2026-05-25T00:00:00.000Z"));

    expect(
      getSafeDealProjectionFreshness({
        lastSyncedAt: new Date("2026-05-10T00:00:00.000Z")
      }).state
    ).toBe("EXPIRED");

    vi.useRealTimers();
  });

  it("classifies stale but unexpired SafeDeal projections", () => {
    vi.setSystemTime(new Date("2026-05-25T00:00:00.000Z"));

    expect(
      getSafeDealProjectionFreshness({
        lastSyncedAt: new Date("2026-05-21T00:00:00.000Z")
      }).state
    ).toBe("STALE");

    vi.useRealTimers();
  });

  it("classifies recent SafeDeal projections as fresh", () => {
    vi.setSystemTime(new Date("2026-05-25T00:00:00.000Z"));

    expect(
      getSafeDealProjectionFreshness({
        lastSyncedAt: new Date("2026-05-24T00:00:00.000Z")
      }).state
    ).toBe("FRESH");

    vi.useRealTimers();
  });
});
