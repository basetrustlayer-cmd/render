import { apiFetch } from "./api";

export type AuthUser = {
  id: string;
  phone: string;
  verificationLevel: number;
  trustTier: string | null;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export async function requestOtp(phone: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/auth/otp/send", {
    method: "POST",
    body: JSON.stringify({ phone })
  });
}

export async function verifyOtp(phone: string, code: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code })
  });
}

export async function refreshAuth(refreshToken: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken })
  });
}

export async function logoutAuth(): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/auth/logout", {
    method: "POST"
  });
}
