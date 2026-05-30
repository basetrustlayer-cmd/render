function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function optionalCsvEnv(name: string): string[] {
  return process.env[name]
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
}

function requiredUrlEnv(name: string): string {
  const value = requiredEnv(name);

  try {
    const parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol.");
    }

    return value.replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be a valid http(s) URL.`);
  }
}

function optionalNumberEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a valid number.`);
  }

  return parsed;
}

export const launchRequiredEnv = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "TRUSTLAYER_API_KEY",
  "TRUSTLAYER_API_URL",
  "PUBLIC_APP_URL"
] as const;

export function validateLaunchRequiredEnv(): void {
  for (const name of launchRequiredEnv) {
    requiredEnv(name);
  }

  requiredUrlEnv("TRUSTLAYER_API_URL");
  requiredUrlEnv("PUBLIC_APP_URL");
}

export function getApiEnv() {
  return {
    corsOrigins: optionalCsvEnv("CORS_ORIGINS"),
    port: optionalNumberEnv("PORT", 3001),
    publicAppUrl: requiredUrlEnv("PUBLIC_APP_URL")
  };
}
