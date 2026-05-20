const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://render-dlhz.onrender.com";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
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
