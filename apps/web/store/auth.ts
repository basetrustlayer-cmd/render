"use client";

import { create } from "zustand";
import { phoneLogin } from "../lib/auth";

type User = {
  id: string;
  phone: string;
  verificationLevel: number;
  trustTier: number | null;
};

type AuthState = {
  accessToken: string | null;
  user: User | null;
  login: (phone: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,

  login: async (phone) => {
    const result = await phoneLogin(phone);

    localStorage.setItem("accessToken", result.accessToken);
    localStorage.setItem("user", JSON.stringify(result.user));

    set({
      accessToken: result.accessToken,
      user: result.user
    });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    set({
      accessToken: null,
      user: null
    });
  }
}));
