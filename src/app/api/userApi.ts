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

export async function updateMyProfile(payload: { nickname: string; major: string }) {
  return apiRequest<MyProfileResponse>("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

