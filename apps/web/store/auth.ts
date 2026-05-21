"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { phoneLogin } from "../lib/auth";

type User = {
  id: string;
  phone: string;
  verificationLevel: number;
  trustTier: string | null;
};

type AuthState = {
  accessToken: string | null;
  user: User | null;
  login: (phone: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,

      login: async (phone: string) => {
        const result = await phoneLogin(phone);

        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", result.accessToken);
        }

        set({
          accessToken: result.accessToken,
          user: result.user
        });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("render-auth");
        }

        set({
          accessToken: null,
          user: null
        });
      },

      hydrate: () => {}
    }),
    {
      name: "render-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user
      })
    }
  )
);
