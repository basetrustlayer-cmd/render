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

  const directToken = localStorage.getItem("accessToken");

  if (directToken) {
    return directToken;
  }

  const persisted = localStorage.getItem("render-auth");

  if (!persisted) {
    return null;
  }

  try {
    const parsed = JSON.parse(persisted) as {
      state?: { accessToken?: string | null };
    };

    return parsed.state?.accessToken ?? null;
  } catch {
    localStorage.removeItem("render-auth");
    return null;
  }
}

function clearBrowserAuth(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("render-auth");
  localStorage.removeItem("accessToken");
  window.dispatchEvent(new Event("render-auth-invalid"));
}

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`API request failed ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
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
    if ([401, 403].includes(response.status)) {
      clearBrowserAuth();
    }

    throw new ApiError(response.status, text);
  }

  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}
