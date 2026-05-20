function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configured) {
    throw new Error("NEXT_PUBLIC_API_URL is required.");
  }

  return configured.replace(/\/$/, "");
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("accessToken");
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const apiUrl = getApiUrl();
  const accessToken = getAccessToken();

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options?.headers || {})
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`API request failed ${response.status}: ${text}`);
  }

  return JSON.parse(text) as T;
}
