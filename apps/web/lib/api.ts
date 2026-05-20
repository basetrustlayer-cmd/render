const FALLBACK_API_URL = "https://render-dlhz.onrender.com";

function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured && configured.includes("render-dlhz.onrender.com")) {
    return configured.replace(/\/$/, "");
  }

  return FALLBACK_API_URL;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`API request failed ${response.status}: ${text}`);
  }

  return JSON.parse(text) as T;
}
