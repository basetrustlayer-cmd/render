"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { verifyOtp } from "../lib/auth";

type User = {
  id: string;
  phone: string;
  verificationLevel: number;
  trustTier: number | null;
};

type AuthState = {
  accessToken: string | null;
  user: User | null;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,

      login: async (phone: string, code: string) => {
        const result = await verifyOtp(phone, code);

        set({
          accessToken: result.accessToken,
          user: result.user
        });
      },

      logout: () => {
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
