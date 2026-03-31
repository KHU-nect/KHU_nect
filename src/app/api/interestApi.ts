import { apiRequest } from "./client";

export type MyInterest = {
  interestId: number;
  name: string;
};

export async function getMyInterests() {
  return apiRequest<MyInterest[]>("/api/interests/me");
}

export async function addMyInterest(name: string) {
  return apiRequest<MyInterest>("/api/interests/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function deleteMyInterest(interestId: number) {
  return apiRequest<string>(`/api/interests/me/${interestId}`, {
    method: "DELETE",
  });
}

