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

export type DirectChatMessagesResponse = {
  messages: DirectChatMessageDto[];
  nextBeforeMessageId: string | null;
  hasNext: boolean;
};

/** Spring Page / 중첩 `data` / snake_case 등 흡수 */
function normalizeDirectChatMessagesPayload(raw: unknown): DirectChatMessagesResponse {
  if (!raw || typeof raw !== "object") {
    return { messages: [], nextBeforeMessageId: null, hasNext: false };
  }
  const r = raw as Record<string, unknown>;
  let node: Record<string, unknown> = r;
  if (
    "data" in r &&
    r.data != null &&
    typeof r.data === "object" &&
    !Array.isArray(r.data)
  ) {
    node = r.data as Record<string, unknown>;
  }
  let msgsUnknown: unknown = node.messages ?? node.content ?? r.messages ?? r.content;
  const nb =
    node.nextBeforeMessageId ??
    node.next_before_message_id ??
    r.nextBeforeMessageId ??
    r.next_before_message_id;
  const hn = node.hasNext ?? node.has_next ?? r.hasNext ?? r.has_next;
  const messages = Array.isArray(msgsUnknown) ? (msgsUnknown as DirectChatMessageDto[]) : [];
  const nextBeforeMessageId =
    nb != null && String(nb).trim() !== "" ? String(nb) : null;
  const hasNext = typeof hn === "boolean" ? hn : false;
  return { messages, nextBeforeMessageId, hasNext };
}

function pickStrRow(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function pickIdRow(o: Record<string, unknown>, ...keys: string[]): string | number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (v == null || String(v).trim() === "") continue;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") return v;
  }
  return undefined;
}

function coerceDirectChatMessageRow(row: unknown): DirectChatMessageDto | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const messageId = pickIdRow(o, "messageId", "message_id", "id");
  if (messageId == null) return null;
  const senderUserId = pickIdRow(o, "senderUserId", "sender_user_id", "userId", "user_id");
  if (senderUserId == null) return null;
  const content = pickStrRow(o, "content", "text", "body", "message");
  const createdAt =
    pickStrRow(o, "createdAt", "created_at", "sentAt", "sent_at", "timestamp") ||
    new Date().toISOString();
  const roomId = pickIdRow(o, "roomId", "room_id") ?? 0;
  const senderNickname = pickStrRow(o, "senderNickname", "sender_nickname", "nickname") || "쿠옹이";
  return {
    messageId,
    roomId,
    senderUserId: typeof senderUserId === "number" ? senderUserId : Number(senderUserId) || 0,
    senderNickname,
    content,
    createdAt,
  };
}

export async function getMyDirectChatRooms() {
  return apiRequest<DirectChatRoomSummary[]>("/api/direct-chat/rooms/me");
}

/**
 * 1:1 메시지 전송용 REST(선택). 기본 백엔드는 STOMP `/app/direct-chat/rooms/{roomId}/messages`만 허용(405).
 * `VITE_DIRECT_CHAT_HTTP_SEND=true`일 때만 DmChatContext에서 시도.
 */
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
  const raw = await apiRequest<unknown>(
    `/api/direct-chat/rooms/${encodeURIComponent(roomId)}/messages?${q.toString()}`
  );
  const normalized = normalizeDirectChatMessagesPayload(raw);
  const messages = normalized.messages
    .map((row) => coerceDirectChatMessageRow(row as unknown))
    .filter((m): m is DirectChatMessageDto => m != null);
  const result = { ...normalized, messages };
  if (import.meta.env.DEV) {
    console.log(
      `[direct-chat] GET /api/direct-chat/rooms/${roomId}/messages`,
      {
        count: result.messages.length,
        nextBeforeMessageId: result.nextBeforeMessageId,
        hasNext: result.hasNext,
        messages: result.messages,
      }
    );
  }
  return result;
}
