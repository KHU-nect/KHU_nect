export type DmMessage = {
  id: string;
  senderUserId: string;
  content: string;
  createdAt: string;
};

export type DmRoom = {
  id: string;
  participantIds: [string, string];
  /** 수업에서 같이 앉기로 연결된 경우 */
  sourceCourseId?: string;
  /** 같이 앉기 / 공강 매칭 등 */
  matchSource?: "sit" | "freeSlot" | "classMatch";
  labelsByUserId: Record<string, string>;
  messages: DmMessage[];
  createdAt: string;
};
