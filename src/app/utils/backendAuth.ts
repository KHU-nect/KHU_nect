import type { UserProfile } from "../mocks/user";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";
const ACCESS_TOKEN_KEY = "khu-nect_access_token";
const REFRESH_TOKEN_KEY = "khu-nect_refresh_token";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

type AuthExchangeData = {
  accessToken: string;
  refreshToken: string;
  signupCompleted: boolean;
  user: {
    id: number;
    email: string;
    nickname: string | null;
    major: string | null;
    studentNumber: string | null;
  };
};

export type ExchangeResult = {
  accessToken: string;
  refreshToken: string;
  signupCompleted: boolean;
  user: UserProfile;
};

function toGrade(studentNumber: string | null | undefined): string {
  if (!studentNumber) return "";
  const prefix = studentNumber.slice(0, 2);
  if (/^\d{2}$/.test(prefix)) return `${prefix}학번`;
  return studentNumber || "미정";
}

function mapAuthUser(u: AuthExchangeData["user"]): UserProfile {
  return {
    id: String(u.id),
    email: u.email,
    nickname: u.nickname || "쿠옹이",
    department: u.major || "미정",
    grade: toGrade(u.studentNumber),
  };
}

export async function exchangeGoogleCode(code: string): Promise<ExchangeResult> {
  const res = await fetch(`${API_BASE_URL}/api/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const json = (await res.json()) as ApiEnvelope<AuthExchangeData>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? "구글 로그인 교환에 실패했습니다.");
  }
  const data = json.data;
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    signupCompleted: data.signupCompleted,
    user: mapAuthUser(data.user),
  };
}

export function saveAuthTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAuthTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getGoogleLoginStartUrl(): string {
  return `${API_BASE_URL}/oauth2/authorization/google`;
}
