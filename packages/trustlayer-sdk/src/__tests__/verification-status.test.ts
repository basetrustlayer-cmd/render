import { describe, expect, it } from "vitest";
import {
  TRUSTLAYER_VERIFICATION_STATUS,
  getVerifiedVerificationStatuses,
  isVerifiedStatus,
  normalizeVerificationStatus,
} from "../verification-status.js";

describe("verification status governance", () => {
  it("normalizes legacy VERIFIED status", () => {
    expect(normalizeVerificationStatus("VERIFIED")).toBe(
      TRUSTLAYER_VERIFICATION_STATUS.IDENTITY_VERIFIED,
    );
  });

  it("normalizes canonical verified statuses", () => {
    expect(normalizeVerificationStatus("identity_verified")).toBe(
      TRUSTLAYER_VERIFICATION_STATUS.IDENTITY_VERIFIED,
    );

    expect(normalizeVerificationStatus("business_verified")).toBe(
      TRUSTLAYER_VERIFICATION_STATUS.BUSINESS_VERIFIED,
    );
  });

  it("handles casing and whitespace safely", () => {
    expect(normalizeVerificationStatus("  BUSINESS_VERIFIED  ")).toBe(
      TRUSTLAYER_VERIFICATION_STATUS.BUSINESS_VERIFIED,
    );
  });

  it("falls back safely for null and unknown statuses", () => {
    expect(normalizeVerificationStatus(null)).toBe(
      TRUSTLAYER_VERIFICATION_STATUS.UNVERIFIED,
    );

    expect(normalizeVerificationStatus("random_status")).toBe(
      TRUSTLAYER_VERIFICATION_STATUS.UNVERIFIED,
    );
  });

  it("matches only verified statuses", () => {
    expect(isVerifiedStatus("identity_verified")).toBe(true);
    expect(isVerifiedStatus("business_verified")).toBe(true);
    expect(isVerifiedStatus("pending")).toBe(false);
    expect(isVerifiedStatus("rejected")).toBe(false);
    expect(isVerifiedStatus(null)).toBe(false);
  });

  it("exposes canonical verified statuses for database filters", () => {
    expect(getVerifiedVerificationStatuses()).toEqual([
      TRUSTLAYER_VERIFICATION_STATUS.IDENTITY_VERIFIED,
      TRUSTLAYER_VERIFICATION_STATUS.BUSINESS_VERIFIED,
    ]);
  });
});
