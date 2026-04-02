import { apiRequest } from "./client";

export type MatchPostCategory = "FREE_SLOT" | "SIT_TOGETHER" | "CLASS_MATCH";

export type MatchPostItem = {
  id: number;
  authorUserId: number;
  authorNickname: string;
  preferredTimeText: string;
  locationText: string;
  content: string;
  category: MatchPostCategory;
  status: "OPEN" | "ACCEPTED" | "CLOSED";
  acceptedByUserId: number | null;
  acceptedAt: string | null;
};

export type MatchPostAcceptResult = {
  matchPostId: number;
  status: "ACCEPTED" | "CLOSED";
  directChatRoomId: string;
};

export async function getMatchPosts() {
  return apiRequest<MatchPostItem[]>("/api/match-posts");
}

export async function acceptMatchPost(id: number) {
  return apiRequest<MatchPostAcceptResult>(`/api/match-posts/${id}/accept`, {
    method: "POST",
  });
}
