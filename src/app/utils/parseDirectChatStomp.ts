/**
 * 1:1 STOMP `/sub/direct-chat/rooms/{id}` 본문 파싱.
 * ApiResponse `{ data: { ... } }`, snake_case, `text`/`body` 필드 등 흡수.
 */
export function parseDirectChatStompBody(body: string): {
  messageId?: string | number;
  senderUserId?: string | number;
  content: string;
  createdAt?: string;
} | null {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  let node: Record<string, unknown> = o;
  if (
    "data" in o &&
    o.data != null &&
    typeof o.data === "object" &&
    !Array.isArray(o.data)
  ) {
    node = o.data as Record<string, unknown>;
  }
  const contentVal = node.content ?? node.text ?? node.body ?? node.message;
  if (contentVal == null || String(contentVal).trim() === "") return null;
  const messageId = node.messageId ?? node.message_id ?? node.id;
  const senderUserId =
    node.senderUserId ?? node.sender_user_id ?? node.userId ?? node.user_id;
  const createdAt = node.createdAt ?? node.created_at ?? node.timestamp ?? node.sentAt;
  return {
    messageId: messageId as string | number | undefined,
    senderUserId: senderUserId as string | number | undefined,
    content: String(contentVal).trim(),
    createdAt: createdAt != null ? String(createdAt) : undefined,
  };
}
