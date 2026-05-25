import { describe, expect, it, vi } from "vitest";
import {
  getVerificationProjectionState,
  isVerificationProjectionExpired,
  isVerificationProjectionFresh
} from "../projection-freshness.js";

describe("TrustLayer verification projection freshness", () => {
  it("treats missing projection expiry as expired", () => {
    expect(
      isVerificationProjectionExpired({
        verificationLastSyncedAt: new Date(),
        verificationProjectionExpiresAt: null
      })
    ).toBe(true);
  });

  it("classifies missing sync timestamp as missing", () => {
    expect(
      getVerificationProjectionState({
        verificationLastSyncedAt: null,
        verificationProjectionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      })
    ).toBe("MISSING");
  });

  it("classifies expired projections as expired", () => {
    expect(
      getVerificationProjectionState({
        verificationLastSyncedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        verificationProjectionExpiresAt: new Date(Date.now() - 1000)
      })
    ).toBe("EXPIRED");
  });

  it("classifies old but unexpired projections as stale", () => {
    expect(
      getVerificationProjectionState({
        verificationLastSyncedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        verificationProjectionExpiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      })
    ).toBe("STALE");
  });

  it("classifies recent unexpired projections as fresh", () => {
    vi.setSystemTime(new Date("2026-05-25T06:00:00.000Z"));

    const user = {
      verificationLastSyncedAt: new Date("2026-05-20T06:00:00.000Z"),
      verificationProjectionExpiresAt: new Date("2026-06-20T06:00:00.000Z")
    };

    expect(isVerificationProjectionFresh(user)).toBe(true);
    expect(getVerificationProjectionState(user)).toBe("FRESH");

    vi.useRealTimers();
  });
});
