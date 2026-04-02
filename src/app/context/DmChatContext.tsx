import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import type { DmMessage, DmRoom } from "../types/dmChat";
import { useAuth } from "./AuthContext";
import {
  getDirectChatMessages,
  getMyDirectChatRooms,
  postDirectChatMessage,
} from "../api/directChatApi";
import {
  countUnreadDm,
  markDmRoomRead as persistMarkRead,
  totalUnreadForUser,
} from "../utils/dmReadState";
import {
  dismissMatchAlert as dismissMatchStorage,
  getMatchAlertForUser,
  setMatchAlertForUser as persistMatchAlertForUser,
  setMatchAlertsForBothUsers,
} from "../utils/matchAlertStorage";
import { buildStompBrokerUrls } from "../utils/stompBrokerUrls";

const STORAGE_KEY = "khu-nect_dm_rooms";
const ACCESS_TOKEN_KEY = "khu-nect_access_token";

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
  /** 서버 수락 직후 Layout의 매칭 성공 모달 표시 */
  recordMatchSuccessAlert: (userId: string, roomId: string, peerLabel: string) => void;
  /** 알림/읽음 갱신 시 레이아웃·홈 배지 리렌더 */
  inboxRevision: number;
  refreshServerRooms: () => Promise<void>;
  /** 매칭 수락 직후 채팅 진입 전 히스토리 선로딩 */
  prefetchDirectChatRoom: (roomId: string) => Promise<void>;
};

const DmChatContext = createContext<DmChatContextValue | undefined>(undefined);

function stablePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function DmChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [roomsById, setRoomsById] = useState<RoomsState>({});
  const [serverRoomsById, setServerRoomsById] = useState<RoomsState>({});
  const [serverMessagesByRoomId, setServerMessagesByRoomId] = useState<Record<string, DmMessage[]>>(
    {}
  );
  const [inboxRevision, setInboxRevision] = useState(0);
  const stompRef = useRef<Client | null>(null);
  const subsRef = useRef<Record<string, StompSubscription>>({});
  const serverRoomsByIdRef = useRef<RoomsState>({});
  serverRoomsByIdRef.current = serverRoomsById;

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

  const loadServerRooms = useCallback(async () => {
    if (!user?.id || user.id.startsWith("demo-user-")) {
      setServerRoomsById({});
      setServerMessagesByRoomId({});
      return;
    }
    const list = await getMyDirectChatRooms();
    const meId = user.id;
    const nextRooms: RoomsState = {};
    const nextMessageMap: Record<string, DmMessage[]> = {};
    for (const item of list) {
      const roomId = String(item.roomId);
      const opponentId = String(item.opponentUserId);
      const summaryMsg: DmMessage[] =
        item.lastMessagePreview && item.lastMessageTime
          ? [
              {
                id: `summary-${roomId}`,
                senderUserId: opponentId,
                content: item.lastMessagePreview,
                createdAt: item.lastMessageTime,
              },
            ]
          : [];
      nextRooms[roomId] = {
        id: roomId,
        participantIds: [meId, opponentId],
        labelsByUserId: {
          [meId]: "나",
          [opponentId]: item.opponentNickname || "쿠옹이",
        },
        messages: summaryMsg,
        createdAt: item.lastMessageTime ?? new Date().toISOString(),
        isServerRoom: true,
      };
      nextMessageMap[roomId] = summaryMsg;
    }
    setServerRoomsById(nextRooms);
    setServerMessagesByRoomId((prev) => ({ ...nextMessageMap, ...prev }));
    bumpInbox();
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await loadServerRooms();
      } catch {
        if (!cancelled) {
          // ignore and keep local fallback
        }
      }
    };
    void run();
    const id = window.setInterval(() => {
      void run();
    }, 7000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [loadServerRooms]);

  const getRoom = useCallback(
    (roomId: string) => {
      const serverRoom = serverRoomsById[roomId];
      if (serverRoom) {
        return {
          ...serverRoom,
          messages: serverMessagesByRoomId[roomId] ?? serverRoom.messages,
        };
      }
      return roomsById[roomId];
    },
    [roomsById, serverRoomsById, serverMessagesByRoomId]
  );

  const getRoomsForUser = useCallback(
    (userId: string) => {
      const merged = { ...roomsById, ...serverRoomsById };
      return Object.values(merged)
        .filter((r) => r.participantIds.includes(userId))
        .map((r) =>
          r.isServerRoom
            ? {
                ...r,
                messages: serverMessagesByRoomId[r.id] ?? r.messages,
              }
            : r
        )
        .sort((a, b) => {
          const lastA = a.messages[a.messages.length - 1]?.createdAt ?? a.createdAt;
          const lastB = b.messages[b.messages.length - 1]?.createdAt ?? b.createdAt;
          return lastB.localeCompare(lastA);
        });
    },
    [roomsById, serverRoomsById, serverMessagesByRoomId]
  );

  const loadRoomMessages = useCallback(
    async (roomId: string) => {
      if (!user?.id || user.id.startsWith("demo-user-")) return;
      const response = await getDirectChatMessages(roomId, 80);
      const mapped: DmMessage[] = response.messages
        .map((m) => ({
          id: m.messageId,
          senderUserId: String(m.senderUserId),
          content: m.content,
          createdAt: m.createdAt,
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setServerMessagesByRoomId((prev) => ({ ...prev, [roomId]: mapped }));
      bumpInbox();
    },
    [user?.id, bumpInbox]
  );

  const appendServerMessage = useCallback((roomId: string, msg: DmMessage) => {
    setServerMessagesByRoomId((prev) => {
      const list = prev[roomId] ?? [];
      if (list.some((m) => m.id === msg.id)) return prev;
      const next = [...list, msg].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { ...prev, [roomId]: next };
    });
    bumpInbox();
  }, [bumpInbox]);

  const subscribeOneRoom = useCallback(
    (client: Client, roomId: string) => {
      if (subsRef.current[roomId]) return;
      subsRef.current[roomId] = client.subscribe(
        `/sub/direct-chat/rooms/${roomId}`,
        (frame: IMessage) => {
          try {
            const parsed = JSON.parse(frame.body) as {
              messageId?: string | number;
              senderUserId?: number;
              content?: string;
              createdAt?: string;
            };
            if (!parsed.content) return;
            appendServerMessage(roomId, {
              id: String(parsed.messageId ?? `ws-${Date.now()}`),
              senderUserId: String(parsed.senderUserId ?? ""),
              content: parsed.content,
              createdAt: parsed.createdAt ?? new Date().toISOString(),
            });
          } catch {
            // ignore malformed frame
          }
        }
      );
    },
    [appendServerMessage]
  );

  const prefetchDirectChatRoom = useCallback(
    async (roomId: string) => {
      if (!user?.id || user.id.startsWith("demo-user-")) return;
      try {
        await loadRoomMessages(String(roomId));
      } catch {
        /* 방만 생성된 직후 등 */
      }
    },
    [user?.id, loadRoomMessages]
  );

  const wsBrokerURLs = useMemo(() => buildStompBrokerUrls(), []);

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
      if (serverRoomsById[roomId]) {
        const trimmed = content.trim();
        if (!trimmed) return;
        void (async () => {
          try {
            await postDirectChatMessage(roomId, trimmed);
            await loadRoomMessages(roomId);
            return;
          } catch {
            /* REST 미구현·실패 시 기존 STOMP 경로 */
          }
          const client = stompRef.current;
          if (client?.connected) {
            client.publish({
              destination: `/pub/direct-chat/rooms/${roomId}/messages`,
              body: JSON.stringify({ content: trimmed }),
            });
            window.setTimeout(() => void loadRoomMessages(roomId), 400);
            window.setTimeout(() => void loadRoomMessages(roomId), 1800);
          } else {
            window.alert(
              "메시지를 서버에 보내지 못했습니다. WebSocket 연결을 확인하거나 잠시 후 다시 시도해 주세요."
            );
          }
        })();
        return;
      }
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
    [bumpInbox, serverRoomsById, loadRoomMessages]
  );

  const markDmRoomRead = useCallback(
    (userId: string, roomId: string) => {
      const room = getRoom(roomId);
      if (!room) return;
      persistMarkRead(userId, room);
      bumpInbox();
    },
    [getRoom, bumpInbox]
  );

  const getUnreadCountForRoom = useCallback(
    (roomId: string, userId: string) => {
      const room = getRoom(roomId);
      if (!room) return 0;
      return countUnreadDm(room, userId);
    },
    [getRoom, inboxRevision]
  );

  const getTotalUnreadCount = useCallback(
    (userId: string) => {
      const merged = { ...roomsById, ...serverRoomsById };
      const rooms = Object.values(merged)
        .filter((r) => r.participantIds.includes(userId))
        .map((r) =>
          r.isServerRoom
            ? {
                ...r,
                messages: serverMessagesByRoomId[r.id] ?? r.messages,
              }
            : r
        );
      return totalUnreadForUser(userId, rooms, countUnreadDm);
    },
    [roomsById, serverRoomsById, serverMessagesByRoomId, inboxRevision]
  );

  const refreshServerRooms = useCallback(async () => {
    await loadServerRooms();
  }, [loadServerRooms]);

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

  const recordMatchSuccessAlert = useCallback(
    (userId: string, roomId: string, peerLabel: string) => {
      persistMatchAlertForUser(userId, roomId, peerLabel);
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
      recordMatchSuccessAlert,
      inboxRevision,
      refreshServerRooms,
      prefetchDirectChatRoom,
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
      recordMatchSuccessAlert,
      inboxRevision,
      refreshServerRooms,
      prefetchDirectChatRoom,
    ]
  );

  useEffect(() => {
    if (!user?.id || user.id.startsWith("demo-user-")) return;
    const roomIds = Object.keys(serverRoomsById);
    if (roomIds.length === 0) return;
    let cancelled = false;
    const tick = async () => {
      for (const roomId of roomIds) {
        try {
          await loadRoomMessages(roomId);
        } catch {
          if (cancelled) return;
        }
      }
    };
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, 7000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user?.id, serverRoomsById, loadRoomMessages]);

  useEffect(() => {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token || !user?.id || user.id.startsWith("demo-user-")) return;

    let activeClient: Client | null = null;
    const tried = new Set<number>();
    const activateWithFallback = (idx: number) => {
      if (idx >= wsBrokerURLs.length || tried.has(idx)) return;
      tried.add(idx);
      const brokerURL = wsBrokerURLs[idx];
      let connected = false;
      const client = new Client({
        brokerURL,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          connected = true;
          Object.keys(serverRoomsByIdRef.current).forEach((roomId) => {
            subscribeOneRoom(client, roomId);
          });
        },
        onWebSocketClose: () => {
          if (!connected && idx + 1 < wsBrokerURLs.length) {
            activateWithFallback(idx + 1);
          }
        },
      });
      activeClient = client;
      stompRef.current = client;
      client.activate();
    };

    activateWithFallback(0);
    return () => {
      Object.values(subsRef.current).forEach((s) => s.unsubscribe());
      subsRef.current = {};
      activeClient?.deactivate();
      stompRef.current = null;
    };
  }, [user?.id, serverRoomsById, wsBrokerURLs, subscribeOneRoom]);

  useEffect(() => {
    const client = stompRef.current;
    if (!client?.connected) return;
    Object.keys(serverRoomsById).forEach((roomId) => subscribeOneRoom(client, roomId));
  }, [serverRoomsById, subscribeOneRoom]);

  return <DmChatContext.Provider value={value}>{children}</DmChatContext.Provider>;
}

export function useDmChat() {
  const ctx = useContext(DmChatContext);
  if (!ctx) {
    throw new Error("useDmChat must be used within DmChatProvider");
  }
  return ctx;
}
