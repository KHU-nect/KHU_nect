import { apiRequest } from "./client";

export type DirectChatRoomSummary = {
  roomId: string | number;
  opponentUserId: number;
  opponentNickname: string;
  lastMessagePreview: string | null;
  lastMessageTime: string | null;
};

export type DirectChatMessageDto = {
  messageId: string | number;
  roomId: string | number;
  senderUserId: number;
  senderNickname: string;
  content: string;
  createdAt: string;
};

type DirectChatMessagesRawResponse = {
  content?: DirectChatMessageDto[];
  messages?: DirectChatMessageDto[];
  nextBeforeMessageId: string | null;
  hasNext: boolean;
};

export type DirectChatMessagesResponse = {
  messages: DirectChatMessageDto[];
  nextBeforeMessageId: string | null;
  hasNext: boolean;
};

export async function getMyDirectChatRooms() {
  return apiRequest<DirectChatRoomSummary[]>("/api/direct-chat/rooms/me");
}

/** 서버 1:1 방에 메시지 저장(상대는 GET/폴링·WS로 수신). STOMP만 쓰는 백엔드는 404 등으로 실패할 수 있음. */
export async function postDirectChatMessage(roomId: string, content: string) {
  return apiRequest<DirectChatMessageDto>(
    `/api/direct-chat/rooms/${encodeURIComponent(roomId)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  );
}

export async function getDirectChatMessages(
  roomId: string,
  size = 50,
  beforeMessageId?: string | number
) {
  const q = new URLSearchParams();
  q.set("size", String(size));
  if (beforeMessageId !== undefined && beforeMessageId !== null) {
    q.set("beforeMessageId", String(beforeMessageId));
  }
  const raw = await apiRequest<DirectChatMessagesRawResponse>(
    `/api/direct-chat/rooms/${encodeURIComponent(roomId)}/messages?${q.toString()}`
  );
  return {
    messages: raw.messages ?? raw.content ?? [],
    nextBeforeMessageId: raw.nextBeforeMessageId,
    hasNext: raw.hasNext,
  } satisfies DirectChatMessagesResponse;
}
