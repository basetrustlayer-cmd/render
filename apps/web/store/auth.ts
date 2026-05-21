"use client";

import { create } from "zustand";
import { phoneLogin } from "../lib/auth";

type User = {
  id: string;
  phone: string;
  verificationLevel: number;
  trustTier: string | null;
};

type PersistedAuth = {
  accessToken: string | null;
  user: User | null;
};

type AuthState = PersistedAuth & {
  login: (phone: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
};

const AUTH_STORAGE_KEY = "render-auth";

function readStoredAuth(): PersistedAuth {
  if (typeof window === "undefined") {
    return { accessToken: null, user: null };
  }

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return {
      accessToken: localStorage.getItem("accessToken"),
      user: null
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      state?: PersistedAuth;
      accessToken?: string | null;
      user?: User | null;
    };

    return {
      accessToken:
        parsed.state?.accessToken ??
        parsed.accessToken ??
        localStorage.getItem("accessToken"),
      user: parsed.state?.user ?? parsed.user ?? null
    };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return {
      accessToken: localStorage.getItem("accessToken"),
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
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,

  login: async (phone: string) => {
    const result = await phoneLogin(phone);

    const auth = {
      accessToken: result.accessToken,
      user: result.user
    };

    writeStoredAuth(auth);
    set(auth);
  },

  logout: () => {
    clearStoredAuth();
    set({
      accessToken: null,
      user: null
    });
  },

  hydrate: () => {
    set(readStoredAuth());
  }
}));
