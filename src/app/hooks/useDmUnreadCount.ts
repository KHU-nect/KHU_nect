import { useMemo } from "react";
import { useDmChat } from "../context/DmChatContext";

/**
 * DM 방·메시지 변경 시 홈 배너·하단 네비 배지가 항상 갱신되도록
 * 방별 메시지 지문을 의존성에 포함합니다.
 * (공강 매칭 / 같이 앉기 구분 없이 동일한 total 미읽음)
 */
export function useDmUnreadCount(userId: string | undefined): number {
  const { getTotalUnreadCount, getRoomsForUser, inboxRevision } = useDmChat();
  const rooms = useMemo(
    () => (userId ? getRoomsForUser(userId) : []),
    [userId, getRoomsForUser, inboxRevision]
  );
  const messageFingerprint = useMemo(
    () =>
      rooms
        .map(
          (r) =>
            `${r.id}:${r.messages.length}:${r.messages[r.messages.length - 1]?.id ?? ""}`
        )
        .join("|"),
    [rooms]
  );

  return useMemo(
    () => (userId ? getTotalUnreadCount(userId) : 0),
    [userId, getTotalUnreadCount, inboxRevision, messageFingerprint]
  );
}
