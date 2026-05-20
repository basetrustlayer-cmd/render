import { apiFetch } from "./api";

export type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    phone: string;
    verificationLevel: number;
    trustTier: number | null;
  };
};

export type RequestOtpResponse = {
  ok: boolean;
  expiresInSeconds: number;
  devCode?: string;
};

export async function requestOtp(phone: string): Promise<RequestOtpResponse> {
  return apiFetch<RequestOtpResponse>("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ phone })
  });
}

export async function verifyOtp(phone: string, code: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code })
  });
}
