export type ClassChatMessageKind = "text" | "question" | "sitTogether";

/** 서버 `CourseChatMessage` 같이 앉기 상태 (히스토리·WS) */
export type SitTogetherRequestStatus = "NOT_APPLICABLE" | "PENDING" | "ACCEPTED";

export type ClassChatMessage = {
  id: string;
  courseId: string;
  kind: ClassChatMessageKind;
  content: string;
  createdAt: string;
  senderLabel: string;
  /** 보낸 계정 id (없으면 예전 저장본 — isMe로만 구분) */
  senderUserId?: string;
  /** 같이 앉기 전용: 수락·만료 구분 */
  sitRequestId?: string;
  /** 같이 앉기: 이 시각 이후 목록에서 숨김 (ISO) */
  expiresAt?: string;
  /** 서버 저장 같이 앉기 상태 (없으면 클라이언트 TTL만 사용) */
  sitTogetherStatus?: SitTogetherRequestStatus;
  /** 수락 후 서버가 만든 1:1 방 id */
  sitTogetherDirectRoomId?: string | null;
  /** @deprecated senderUserId로 대체, 구버전 호환 */
  isMe: boolean;
};

export type InputMode = "normal" | "question" | "sitTogether";
