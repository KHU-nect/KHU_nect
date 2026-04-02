import { apiRequest } from "./client";

export type CourseChatMessageMode = "GENERAL" | "QUESTION" | "SIT_TOGETHER";

export type SitTogetherStatusDto = "NOT_APPLICABLE" | "PENDING" | "ACCEPTED";

export type CourseChatRoomSummary = {
  roomId: string | number;
  courseId: number;
  courseName: string;
  lastMessagePreview: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
};

export type CourseChatMessageDto = {
  messageId: string | number;
  roomId: string | number;
  senderUserId: number;
  senderNickname: string;
  content: string;
  createdAt: string;
  mode?: CourseChatMessageMode | string | null;
  sitTogetherStatus?: SitTogetherStatusDto | string | null;
  sitTogetherDirectRoomId?: string | number | null;
};

export type CourseChatMessagesResponse = {
  messages: CourseChatMessageDto[];
  nextBeforeMessageId: string | null;
  hasNext: boolean;
};

function pickNum(o: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

function pickStr(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

/** ApiResponse.data가 배열이거나, Spring Page `{ content: [] }`, `{ messages: [] }` 등 흔한 형태 */
function extractMessageListFromEnvelope(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.messages)) return r.messages;
  if (Array.isArray(r.content)) return r.content;
  if (Array.isArray(r.data)) return r.data;
  const data = r.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.content)) return d.content;
    if (Array.isArray(d.messages)) return d.messages;
  }
  return [];
}

function extractPagination(raw: unknown): { nextBeforeMessageId: string | null; hasNext: boolean } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { nextBeforeMessageId: null, hasNext: false };
  }
  const r = raw as Record<string, unknown>;
  const n = r.nextBeforeMessageId ?? r.next_before_message_id;
  const h = r.hasNext ?? r.has_next;
  return {
    nextBeforeMessageId: n != null && String(n).trim() !== "" ? String(n) : null,
    hasNext: typeof h === "boolean" ? h : false,
  };
}

/**
 * 백엔드 필드명 차이(id vs messageId, snake_case, sender 중첩) 흡수.
 * messageId·senderUserId를 끝내 못 찾으면 null → 해당 행 스킵.
 */
export function normalizeCourseChatMessageRow(row: unknown, index: number): CourseChatMessageDto | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;

  const messageId = o.messageId ?? o.id ?? o.message_id;
  if (messageId == null || String(messageId).trim() === "") return null;

  let senderUserId = pickNum(
    o,
    "senderUserId",
    "sender_user_id",
    "userId",
    "user_id",
    "senderId",
    "writerId",
    "authorId",
    "memberId"
  );
  let nickname = pickStr(o, "senderNickname", "sender_nickname", "nickname", "senderName", "sender_name");

  const nestedUser = o.sender ?? o.author ?? o.user ?? o.member ?? o.writer;
  if (nestedUser && typeof nestedUser === "object") {
    const s = nestedUser as Record<string, unknown>;
    if (senderUserId === undefined) {
      senderUserId = pickNum(s, "id", "userId", "user_id", "memberId");
    }
    if (!nickname) {
      nickname = pickStr(s, "nickname", "name", "nickName");
    }
  }

  /** 발신자 id 없으면 행을 버리면 ‘남 메시지 전부 누락’으로 이어질 수 있어 -1로 두고 표시만 맞춤 */
  if (senderUserId === undefined) {
    senderUserId = -1;
  }

  const content = pickStr(o, "content", "body", "text", "message");
  const createdAt = pickStr(o, "createdAt", "created_at", "sentAt", "sent_at", "timestamp");
  const roomId = o.roomId ?? o.room_id ?? 0;

  return {
    messageId,
    roomId: roomId as string | number,
    senderUserId,
    senderNickname: nickname || "쿠옹이",
    content,
    createdAt: createdAt || new Date().toISOString(),
    mode: (o.mode ?? o.messageMode) as CourseChatMessageMode | string | null | undefined,
    sitTogetherStatus: (o.sitTogetherStatus ?? o.sit_together_status) as
      | SitTogetherStatusDto
      | string
      | null
      | undefined,
    sitTogetherDirectRoomId: (o.sitTogetherDirectRoomId ?? o.sit_together_direct_room_id) as
      | string
      | number
      | null
      | undefined,
  };
}

export async function enterCourseChatRoom(courseId: number, createIfAbsent = true) {
  return apiRequest<CourseChatRoomSummary>("/api/course-chat/rooms/enter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, createIfAbsent }),
  });
}

export async function getCourseChatMessages(roomId: string, size = 80) {
  const q = new URLSearchParams();
  q.set("size", String(size));
  const raw = await apiRequest<unknown>(
    `/api/course-chat/rooms/${encodeURIComponent(roomId)}/messages?${q.toString()}`
  );
  const rows = extractMessageListFromEnvelope(raw);
  const messages = rows
    .map((row, i) => normalizeCourseChatMessageRow(row, i))
    .filter((m): m is CourseChatMessageDto => m != null);
  const { nextBeforeMessageId, hasNext } = extractPagination(raw);
  return {
    messages,
    nextBeforeMessageId,
    hasNext,
  } satisfies CourseChatMessagesResponse;
}

export type AcceptSitTogetherResponse = {
  sourceMessageId: string | number;
  sourceRoomId: string | number;
  directRoomId: string | number;
};

/** STOMP 대신 REST로만 보내는 백엔드용 — `.env`에 `VITE_COURSE_CHAT_HTTP_SEND=true` */
export async function postCourseChatMessage(
  roomId: string,
  payload: { content: string; mode?: CourseChatMessageMode }
) {
  const mode = payload.mode ?? "GENERAL";
  return apiRequest<unknown>(`/api/course-chat/rooms/${encodeURIComponent(roomId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: payload.content, mode }),
  });
}

export async function acceptSitTogetherMessage(roomId: string, messageId: string) {
  return apiRequest<AcceptSitTogetherResponse>(
    `/api/course-chat/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}/sit-together/accept`,
    { method: "POST" }
  );
}
