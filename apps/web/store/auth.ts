"use client";

import { create } from "zustand";
import { logoutAuth, refreshAuth, verifyOtp } from "../lib/auth";

type User = {
  id: string;
  phone: string;
  verificationLevel: number;
  trustTier: string | null;
};

type PersistedAuth = {
  accessToken: string | null;
  refreshToken: string | null;
  csrfToken: string | null;
  deviceFingerprint: string | null;
  user: User | null;
};

type AuthState = PersistedAuth & {
  login: (phone: string, code: string) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  logout: () => void;
  hydrate: () => void;
};

const AUTH_STORAGE_KEY = "render-auth";

function readStoredAuth(): PersistedAuth {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null, csrfToken: null, deviceFingerprint: null, user: null };
  }

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
      csrfToken: localStorage.getItem("csrfToken"),
      deviceFingerprint: localStorage.getItem("deviceFingerprint"),
      user: null
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      state?: Partial<PersistedAuth>;
      accessToken?: string | null;
      refreshToken?: string | null;
      csrfToken?: string | null;
      deviceFingerprint?: string | null;
      user?: User | null;
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
      csrfToken:
        parsed.state?.csrfToken ??
        parsed.csrfToken ??
        localStorage.getItem("csrfToken"),
      deviceFingerprint:
        parsed.state?.deviceFingerprint ??
        parsed.deviceFingerprint ??
        localStorage.getItem("deviceFingerprint"),
      user: parsed.state?.user ?? parsed.user ?? null
    };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);

    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
      csrfToken: localStorage.getItem("csrfToken"),
      deviceFingerprint: localStorage.getItem("deviceFingerprint"),
      user: null
    };
  }
}

function writeStoredAuth(auth: PersistedAuth): void {
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
  localStorage.removeItem("csrfToken");
  localStorage.removeItem("deviceFingerprint");
  }

  if (auth.csrfToken) {
    localStorage.setItem("csrfToken", auth.csrfToken);
  } else {
    localStorage.removeItem("csrfToken");
  }

  if (auth.deviceFingerprint) {
    localStorage.setItem("deviceFingerprint", auth.deviceFingerprint);
  } else {
    localStorage.removeItem("deviceFingerprint");
  }

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      state: auth,
      version: 0
    })
  );
}

function clearStoredAuth(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("csrfToken");
  localStorage.removeItem("deviceFingerprint");
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  refreshToken: null,
  csrfToken: null,
  deviceFingerprint: null,
  user: null,

  login: async (phone: string, code: string) => {
    const result = await verifyOtp(phone, code);

    const auth = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      csrfToken: result.csrfToken,
      deviceFingerprint: localStorage.getItem("deviceFingerprint"),
      user: result.user
    };

    writeStoredAuth(auth);
    set(auth);
  },

  refreshSession: async () => {
    const current = get();

    if (!current.refreshToken) {
      return false;
    }

    try {
      const result = await refreshAuth(current.refreshToken, current.deviceFingerprint);

      const auth = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        csrfToken: result.csrfToken,
        deviceFingerprint: current.deviceFingerprint,
        user: result.user
      };

      writeStoredAuth(auth);
      set(auth);

      return true;
    } catch {
      clearStoredAuth();
      set({
        accessToken: null,
        refreshToken: null,
        csrfToken: null,
        deviceFingerprint: null,
        user: null
      });

      return false;
    }
  },

  logout: () => {
    void logoutAuth().catch(() => undefined);
    clearStoredAuth();
    set({
      accessToken: null,
      refreshToken: null,
      csrfToken: null,
      deviceFingerprint: null,
      user: null
    });
  },

  hydrate: () => {
    set(readStoredAuth());
  }
}));
