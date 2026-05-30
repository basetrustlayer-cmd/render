import { afterEach, describe, expect, it } from "vitest";
import { launchRequiredEnv, validateLaunchRequiredEnv } from "../../env.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("launch runtime environment contract", () => {
  it("declares launch-critical runtime variables", () => {
    expect(launchRequiredEnv).toEqual([
      "DATABASE_URL",
      "REDIS_URL",
      "JWT_SECRET",
      "TRUSTLAYER_API_KEY",
      "TRUSTLAYER_API_URL",
      "PUBLIC_APP_URL"
    ]);
  });

  it("fails fast when a launch-critical variable is missing", () => {
    for (const key of launchRequiredEnv) {
      delete process.env[key];
    }

    expect(() => validateLaunchRequiredEnv()).toThrow("DATABASE_URL is required.");
  });

  it("accepts a complete launch runtime environment", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@example.com:5432/render";
    process.env.REDIS_URL = "redis://default:pass@example.com:6379";
    process.env.JWT_SECRET = "test_secret_32_chars_minimum_value";
    process.env.TRUSTLAYER_API_KEY = "trustlayer_test_key";
    process.env.TRUSTLAYER_API_URL = "https://api.trustlayer.example";
    process.env.PUBLIC_APP_URL = "https://render.com.gh";

    expect(() => validateLaunchRequiredEnv()).not.toThrow();
  });

  it("requires TRUSTLAYER_API_URL to be an http(s) URL", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@example.com:5432/render";
    process.env.REDIS_URL = "redis://default:pass@example.com:6379";
    process.env.JWT_SECRET = "test_secret_32_chars_minimum_value";
    process.env.TRUSTLAYER_API_KEY = "trustlayer_test_key";
    process.env.TRUSTLAYER_API_URL = "ftp://api.trustlayer.example";
    process.env.PUBLIC_APP_URL = "https://render.com.gh";

    expect(() => validateLaunchRequiredEnv()).toThrow(
      "TRUSTLAYER_API_URL must be a valid http(s) URL."
    );
  });

  it("requires PUBLIC_APP_URL to be an http(s) URL", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@example.com:5432/render";
    process.env.REDIS_URL = "redis://default:pass@example.com:6379";
    process.env.JWT_SECRET = "test_secret_32_chars_minimum_value";
    process.env.TRUSTLAYER_API_KEY = "trustlayer_test_key";
    process.env.TRUSTLAYER_API_URL = "https://api.trustlayer.example";
    process.env.PUBLIC_APP_URL = "render.com.gh";

    expect(() => validateLaunchRequiredEnv()).toThrow(
      "PUBLIC_APP_URL must be a valid http(s) URL."
    );
  });
});
