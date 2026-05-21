function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configured) {
    throw new Error("NEXT_PUBLIC_API_URL is required.");
  }

  return configured.replace(/\/$/, "");
}

type StoredAuth = {
  accessToken: string | null;
  refreshToken: string | null;
  user: unknown | null;
};

const AUTH_STORAGE_KEY = "render-auth";

function readStoredAuth(): StoredAuth {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null, user: null };
  }

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
      user: null
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      state?: Partial<StoredAuth>;
      accessToken?: string | null;
      refreshToken?: string | null;
      user?: unknown | null;
    };

    return {
      accessToken:
        parsed.state?.accessToken ??
        parsed.accessToken ??
        localStorage.getItem("accessToken"),
      refreshToken:
        parsed.state?.refreshToken ??
        parsed.refreshToken ??
        localStorage.getItem("refreshToken"),
      user: parsed.state?.user ?? parsed.user ?? null
    };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);

    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
      user: null
    };
  }
}

function writeStoredAuth(auth: StoredAuth): void {
  if (typeof window === "undefined") return;

  if (auth.accessToken) {
    localStorage.setItem("accessToken", auth.accessToken);
  } else {
    localStorage.removeItem("accessToken");
  }

  if (auth.refreshToken) {
    localStorage.setItem("refreshToken", auth.refreshToken);
  } else {
    localStorage.removeItem("refreshToken");
  }

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      state: auth,
      version: 0
    })
  );
}

function getAccessToken(): string | null {
  return readStoredAuth().accessToken;
}

function clearBrowserAuth(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("render-auth");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.dispatchEvent(new Event("render-auth-invalid"));
}

async function refreshAccessToken(apiUrl: string): Promise<string | null> {
  const stored = readStoredAuth();

  if (!stored.refreshToken) {
    return null;
  }

  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken: stored.refreshToken })
  });

  const text = await response.text();

  if (!response.ok || !text) {
    return null;
  }

  const parsed = JSON.parse(text) as {
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  };

  if (!parsed.accessToken || !parsed.refreshToken) {
    return null;
  }

  writeStoredAuth({
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    user: parsed.user ?? stored.user
  });

  return parsed.accessToken;
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

async function doFetch(path: string, options: RequestInit | undefined, accessToken: string | null): Promise<Response> {
  const apiUrl = getApiUrl();

  return fetch(`${apiUrl}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options?.headers || {})
    }
  });
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const apiUrl = getApiUrl();
  let response = await doFetch(path, options, getAccessToken());

  if (response.status === 401 && path !== "/auth/refresh") {
    const refreshedAccessToken = await refreshAccessToken(apiUrl);

    if (refreshedAccessToken) {
      response = await doFetch(path, options, refreshedAccessToken);
    }
  }

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
