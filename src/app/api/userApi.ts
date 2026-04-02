import { apiRequest } from "./client";

export type SignupCompletionRequest = {
  nickname: string;
  major: string;
  studentNumber: string;
};

type MyProfileResponse = {
  userId: number;
  email: string;
  nickname: string;
  major: string;
  studentNumber: string;
  signupCompleted: boolean;
  point?: number;
  level?: number;
  interests?: Array<{ interestId: number; name: string }>;
  bio?: string | null;
  todayQuestion?: string | null;
};

export type UpdateMyProfilePayload = {
  nickname: string;
  major: string;
  bio?: string;
  todayQuestion?: string;
};

export async function completeSignup(payload: SignupCompletionRequest) {
  return apiRequest<MyProfileResponse>("/api/users/me/signup-completion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getMyProfile() {
  return apiRequest<MyProfileResponse>("/api/users/me");
}

export async function updateMyProfile(payload: UpdateMyProfilePayload) {
  return apiRequest<MyProfileResponse>("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

