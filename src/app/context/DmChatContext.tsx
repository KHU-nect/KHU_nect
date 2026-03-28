import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DmMessage, DmRoom } from "../types/dmChat";
import {
  countUnreadDm,
  markDmRoomRead as persistMarkRead,
  totalUnreadForUser,
} from "../utils/dmReadState";
import {
  dismissMatchAlert as dismissMatchStorage,
  getMatchAlertForUser,
  setMatchAlertsForBothUsers,
} from "../utils/matchAlertStorage";

const STORAGE_KEY = "khu-nect_dm_rooms";

type RoomsState = Record<string, DmRoom>;

type DmChatContextValue = {
  getRoom: (roomId: string) => DmRoom | undefined;
  getRoomsForUser: (userId: string) => DmRoom[];
  createRoomFromSitMatch: (params: {
    courseId: string;
    posterUserId: string;
    accepterUserId: string;
    posterLabel: string;
    accepterLabel: string;
  }) => string;
  createRoomFromFreeSlotMatch: (params: {
    posterUserId: string;
    accepterUserId: string;
    posterLabel: string;
    accepterLabel: string;
  }) => string;
  createRoomFromClassMatch: (params: {
    posterUserId: string;
    accepterUserId: string;
    posterLabel: string;
    accepterLabel: string;
    sourceCourseId?: string;
  }) => string;
  sendDm: (roomId: string, senderUserId: string, content: string) => void;
  markDmRoomRead: (userId: string, roomId: string) => void;
  getUnreadCountForRoom: (roomId: string, userId: string) => number;
  getTotalUnreadCount: (userId: string) => number;
  /** 매칭 알림 모달용 (localStorage 동기) */
  getPendingMatchAlert: (userId: string | undefined) => ReturnType<typeof getMatchAlertForUser>;
  dismissMatchAlert: (userId: string) => void;
  /** 알림/읽음 갱신 시 레이아웃·홈 배지 리렌더 */
  inboxRevision: number;
};

const DmChatContext = createContext<DmChatContextValue | undefined>(undefined);

function stablePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function DmChatProvider({ children }: { children: ReactNode }) {
  const [roomsById, setRoomsById] = useState<RoomsState>({});
  const [inboxRevision, setInboxRevision] = useState(0);

  const bumpInbox = useCallback(() => setInboxRevision((n) => n + 1), []);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setRoomsById(JSON.parse(raw) as RoomsState);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roomsById));
  }, [roomsById]);

  const getRoom = useCallback(
    (roomId: string) => roomsById[roomId],
    [roomsById]
  );

  const getRoomsForUser = useCallback(
    (userId: string) => {
      return Object.values(roomsById)
        .filter((r) => r.participantIds.includes(userId))
        .sort((a, b) => {
          const lastA = a.messages[a.messages.length - 1]?.createdAt ?? a.createdAt;
          const lastB = b.messages[b.messages.length - 1]?.createdAt ?? b.createdAt;
          return lastB.localeCompare(lastA);
        });
    },
    [roomsById]
  );

  const createRoomFromSitMatch = useCallback(
    (params: {
      courseId: string;
      posterUserId: string;
      accepterUserId: string;
      posterLabel: string;
      accepterLabel: string;
    }) => {
      const id = `dm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const participantIds = stablePair(params.posterUserId, params.accepterUserId);
      const room: DmRoom = {
        id,
        participantIds,
        sourceCourseId: params.courseId,
        matchSource: "sit",
        labelsByUserId: {
          [params.posterUserId]: params.posterLabel,
          [params.accepterUserId]: params.accepterLabel,
        },
        messages: [],
        createdAt: new Date().toISOString(),
      };
      setRoomsById((prev) => ({ ...prev, [id]: room }));
      setMatchAlertsForBothUsers(
        params.posterUserId,
        params.accepterUserId,
        id,
        params.accepterLabel,
        params.posterLabel
      );
      bumpInbox();
      return id;
    },
    [bumpInbox]
  );

  const createRoomFromFreeSlotMatch = useCallback(
    (params: {
      posterUserId: string;
      accepterUserId: string;
      posterLabel: string;
      accepterLabel: string;
    }) => {
      const id = `dm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const participantIds = stablePair(params.posterUserId, params.accepterUserId);
      const room: DmRoom = {
        id,
        participantIds,
        matchSource: "freeSlot",
        labelsByUserId: {
          [params.posterUserId]: params.posterLabel,
          [params.accepterUserId]: params.accepterLabel,
        },
        messages: [],
        createdAt: new Date().toISOString(),
      };
      setRoomsById((prev) => ({ ...prev, [id]: room }));
      setMatchAlertsForBothUsers(
        params.posterUserId,
        params.accepterUserId,
        id,
        params.accepterLabel,
        params.posterLabel
      );
      bumpInbox();
      return id;
    },
    [bumpInbox]
  );

  const createRoomFromClassMatch = useCallback(
    (params: {
      posterUserId: string;
      accepterUserId: string;
      posterLabel: string;
      accepterLabel: string;
      sourceCourseId?: string;
    }) => {
      const id = `dm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const participantIds = stablePair(params.posterUserId, params.accepterUserId);
      const room: DmRoom = {
        id,
        participantIds,
        matchSource: "classMatch",
        sourceCourseId: params.sourceCourseId,
        labelsByUserId: {
          [params.posterUserId]: params.posterLabel,
          [params.accepterUserId]: params.accepterLabel,
        },
        messages: [],
        createdAt: new Date().toISOString(),
      };
      setRoomsById((prev) => ({ ...prev, [id]: room }));
      setMatchAlertsForBothUsers(
        params.posterUserId,
        params.accepterUserId,
        id,
        params.accepterLabel,
        params.posterLabel
      );
      bumpInbox();
      return id;
    },
    [bumpInbox]
  );

  const sendDm = useCallback(
    (roomId: string, senderUserId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const msg: DmMessage = {
        id: `dm-m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        senderUserId,
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setRoomsById((prev) => {
        const room = prev[roomId];
        if (!room) return prev;
        return {
          ...prev,
          [roomId]: {
            ...room,
            messages: [...room.messages, msg],
          },
        };
      });
      bumpInbox();
    },
    [bumpInbox]
  );

  const markDmRoomRead = useCallback(
    (userId: string, roomId: string) => {
      const room = roomsById[roomId];
      if (!room) return;
      persistMarkRead(userId, room);
      bumpInbox();
    },
    [roomsById, bumpInbox]
  );

  const getUnreadCountForRoom = useCallback(
    (roomId: string, userId: string) => {
      const room = roomsById[roomId];
      if (!room) return 0;
      return countUnreadDm(room, userId);
    },
    [roomsById, inboxRevision]
  );

  const getTotalUnreadCount = useCallback(
    (userId: string) => {
      const rooms = Object.values(roomsById).filter((r) =>
        r.participantIds.includes(userId)
      );
      return totalUnreadForUser(userId, rooms, countUnreadDm);
    },
    [roomsById, inboxRevision]
  );

  const getPendingMatchAlert = useCallback((userId: string | undefined) => {
    if (!userId) return null;
    return getMatchAlertForUser(userId);
  }, []);

  const dismissMatchAlert = useCallback(
    (userId: string) => {
      dismissMatchStorage(userId);
      bumpInbox();
    },
    [bumpInbox]
  );

  const value = useMemo(
    () => ({
      getRoom,
      getRoomsForUser,
      createRoomFromSitMatch,
      createRoomFromFreeSlotMatch,
      createRoomFromClassMatch,
      sendDm,
      markDmRoomRead,
      getUnreadCountForRoom,
      getTotalUnreadCount,
      getPendingMatchAlert,
      dismissMatchAlert,
      inboxRevision,
    }),
    [
      getRoom,
      getRoomsForUser,
      createRoomFromSitMatch,
      createRoomFromFreeSlotMatch,
      createRoomFromClassMatch,
      sendDm,
      markDmRoomRead,
      getUnreadCountForRoom,
      getTotalUnreadCount,
      getPendingMatchAlert,
      dismissMatchAlert,
      inboxRevision,
    ]
  );

  return <DmChatContext.Provider value={value}>{children}</DmChatContext.Provider>;
}

export function useDmChat() {
  const ctx = useContext(DmChatContext);
  if (!ctx) {
    throw new Error("useDmChat must be used within DmChatProvider");
  }
  return ctx;
}
