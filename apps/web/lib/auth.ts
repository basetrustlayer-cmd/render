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

export async function phoneLogin(phone: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/dev/phone-login", {
    method: "POST",
    body: JSON.stringify({ phone })
  });
}
