const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

const ACCESS_TOKEN_KEY = "khu-nect_access_token";

export type FieldErrorDetail = {
  field: string;
  rejectedValue: string;
  reason: string;
};

export type ApiErrorPayload = {
  code?: string;
  message?: string;
  timestamp?: string;
  fieldErrors?: FieldErrorDetail[];
};

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: ApiErrorPayload | null;
};

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(message: string, status: number, payload: ApiErrorPayload | null) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function getAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<T> {
  const { auth = true, headers, ...rest } = init ?? {};
  const requestHeaders = new Headers(headers ?? {});
  requestHeaders.set("Accept", "application/json");

  if (auth) {
    const token = getAccessToken();
    if (!token) {
      throw new ApiError("로그인이 필요합니다.", 401, {
        code: "AUTH-401",
        message: "인증 토큰이 없습니다.",
      });
    }
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
  });

  let parsed: ApiResponse<T> | null = null;
  try {
    parsed = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("서버 응답을 해석할 수 없습니다.", response.status, null);
  }

  if (!response.ok || !parsed.success || parsed.data === null) {
    throw new ApiError(
      parsed.error?.message ?? "요청 처리 중 오류가 발생했습니다.",
      response.status,
      parsed.error
    );
  }

  return parsed.data;
}

