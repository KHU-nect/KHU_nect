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
import { parseDirectChatStompBody } from "../utils/parseDirectChatStomp";
import { buildStompBrokerUrls } from "../utils/stompBrokerUrls";
import { stompReconnectDelayMs } from "../utils/stompReconnectDelayMs";

const STOMP_JSON_HEADERS = { "content-type": "application/json" };

/**
 * 수업 채팅과 동일하게 기본은 `/pub/.../messages`.
 * 백엔드가 `/app/...`만 열어둔 경우 `.env`에 `VITE_DIRECT_CHAT_STOMP_SEND_BASE=/app/direct-chat/rooms`
 */
function directChatStompSendDestination(roomId: string): string {
  const base = (import.meta.env.VITE_DIRECT_CHAT_STOMP_SEND_BASE as string | undefined)?.trim();
  if (base) return `${base.replace(/\/$/, "")}/${roomId}/messages`;
  return `/pub/direct-chat/rooms/${roomId}/messages`;
}

const DIRECT_CHAT_HTTP_SEND =
  String(import.meta.env.VITE_DIRECT_CHAT_HTTP_SEND ?? "").toLowerCase() === "true";

/** `false`면 DM STOMP 비활성(수업 채팅 `VITE_CLASS_CHAT_WS`와 대칭) — GET 폴링만 */
const DIRECT_CHAT_WS_ENABLED =
  String(import.meta.env.VITE_DIRECT_CHAT_WS ?? "true").toLowerCase() !== "false";

type PendingDirectPublish = {
  destination: string;
  body: string;
  roomId: string;
};

function devDirectChat(label: string, payload: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.log(`[direct-chat] ${label}`, payload);
  }
}

/** STOMP 직후 화면에 바로 보이게; 서버 행 도착 시 같은 본문·발신이면 제거 */
const LOCAL_DM_PREFIX = "local-dm-";

function dmMessageFingerprint(senderUserId: string, content: string): string {
  return `${String(senderUserId).trim()}|${content.trim()}`;
}

function stripOptimisticMatchingFingerprint(
  list: DmMessage[],
  senderUserId: string,
  content: string
): DmMessage[] {
  const fp = dmMessageFingerprint(senderUserId, content);
  return list.filter(
    (m) =>
      !String(m.id).startsWith(LOCAL_DM_PREFIX) ||
      dmMessageFingerprint(m.senderUserId, m.content) !== fp
  );
}

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
  const pendingDirectChatPublishesRef = useRef<PendingDirectPublish[]>([]);
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
    if (!user?.id) {
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
      if (!user?.id) return;
      const response = await getDirectChatMessages(roomId, 80);
      const mapped: DmMessage[] = response.messages
        .map((m) => ({
          id: String(m.messageId),
          senderUserId: String(m.senderUserId),
          content: m.content,
          createdAt: m.createdAt,
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setServerMessagesByRoomId((prev) => {
        const prevList = prev[roomId] ?? [];
        const optimistic = prevList.filter((m) => String(m.id).startsWith(LOCAL_DM_PREFIX));
        const keptOptimistic = optimistic.filter(
          (o) =>
            !mapped.some(
              (s) =>
                dmMessageFingerprint(s.senderUserId, s.content) ===
                dmMessageFingerprint(o.senderUserId, o.content)
            )
        );
        const next = [...mapped, ...keptOptimistic].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt)
        );
        return { ...prev, [roomId]: next };
      });
      bumpInbox();
    },
    [user?.id, bumpInbox]
  );

  const appendServerMessage = useCallback((roomId: string, msg: DmMessage) => {
    setServerMessagesByRoomId((prev) => {
      const list = prev[roomId] ?? [];
      const base = stripOptimisticMatchingFingerprint(list, msg.senderUserId, msg.content);
      if (base.some((m) => String(m.id) === String(msg.id))) return prev;
      const next = [...base, msg].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { ...prev, [roomId]: next };
    });
    bumpInbox();
  }, [bumpInbox]);

  const subscribeOneRoom = useCallback(
    (client: Client, roomId: string) => {
      if (subsRef.current[roomId]) return;
      devDirectChat("구독 시작", { roomId, subscribePath: `/sub/direct-chat/rooms/${roomId}` });
      subsRef.current[roomId] = client.subscribe(
        `/sub/direct-chat/rooms/${roomId}`,
        (frame: IMessage) => {
          devDirectChat("STOMP 수신(raw)", {
            roomId,
            bodyLength: frame.body?.length ?? 0,
            bodyPreview: frame.body?.slice(0, 200) ?? "",
          });
          try {
            const parsed = parseDirectChatStompBody(frame.body);
            if (!parsed) {
              devDirectChat("STOMP 수신 파싱 null → GET 갱신(수업 채팅과 동일)", { roomId });
              void loadRoomMessages(roomId);
              return;
            }
            devDirectChat("STOMP 수신 → 목록 반영", {
              roomId,
              messageId: parsed.messageId,
              senderUserId: parsed.senderUserId,
              contentLength: parsed.content.length,
            });
            appendServerMessage(roomId, {
              id: String(parsed.messageId ?? `ws-${Date.now()}`),
              senderUserId: String(parsed.senderUserId ?? ""),
              content: parsed.content,
              createdAt: parsed.createdAt ?? new Date().toISOString(),
            });
          } catch (e) {
            devDirectChat("STOMP 수신 처리 실패 → GET 시도", { roomId, error: String(e) });
            void loadRoomMessages(roomId);
          }
        }
      );
    },
    [appendServerMessage, loadRoomMessages]
  );

  const prefetchDirectChatRoom = useCallback(
    async (roomId: string) => {
      if (!user?.id) return;
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
        const publishBody = JSON.stringify({ content: trimmed });
        const destination = directChatStompSendDestination(roomId);

        devDirectChat("sendDm(서버 방) — 수업 채팅과 동일 흐름", {
          roomId,
          senderUserId,
          contentLength: trimmed.length,
          destination,
          DIRECT_CHAT_HTTP_SEND,
          DIRECT_CHAT_WS_ENABLED,
          stompConnected: stompRef.current?.connected ?? false,
        });

        appendServerMessage(roomId, {
          id: `${LOCAL_DM_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          senderUserId: String(senderUserId),
          content: trimmed,
          createdAt: new Date().toISOString(),
        });

        const sendToBackendRoom = () => {
          if (DIRECT_CHAT_HTTP_SEND) {
            devDirectChat("경로: REST POST", { roomId, body: { content: trimmed } });
            void (async () => {
              try {
                await postDirectChatMessage(roomId, trimmed);
                await loadRoomMessages(roomId);
              } catch (e) {
                devDirectChat("REST POST 실패", { roomId, error: String(e) });
                window.alert("메시지를 서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
              }
            })();
            return;
          }

          if (!DIRECT_CHAT_WS_ENABLED) {
            devDirectChat("경로: STOMP 끔 — GET 폴링만", { roomId });
            window.setTimeout(() => void loadRoomMessages(roomId), 500);
            window.setTimeout(() => void loadRoomMessages(roomId), 1800);
            return;
          }

          const client = stompRef.current;
          if (client?.connected) {
            devDirectChat("경로: STOMP publish (연결됨)", {
              roomId,
              destination,
              brokerURL: client.webSocket?.url ?? null,
              body: { content: trimmed },
            });
            client.publish({
              destination,
              body: publishBody,
              headers: STOMP_JSON_HEADERS,
            });
            window.setTimeout(() => void loadRoomMessages(roomId), 500);
            window.setTimeout(() => void loadRoomMessages(roomId), 1800);
            return;
          }

          const q = pendingDirectChatPublishesRef.current;
          q.push({ destination, body: publishBody, roomId });
          devDirectChat("경로: STOMP 대기열 (WS 미연결)", {
            roomId,
            destination,
            대기개수: q.length,
            설명: "연결되면 publish 후 GET으로 확인",
          });
        };

        sendToBackendRoom();
        return;
      }
      const trimmed = content.trim();
      if (!trimmed) return;
      devDirectChat("sendDm 로컬 전용 방(서버 전송 없음)", { roomId, contentLength: trimmed.length });
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
    [bumpInbox, serverRoomsById, loadRoomMessages, appendServerMessage]
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
    if (!user?.id) return;
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
    if (!DIRECT_CHAT_WS_ENABLED) return;
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token || !user?.id) return;

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
        reconnectDelay: stompReconnectDelayMs(),
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          connected = true;
          const roomIds = Object.keys(serverRoomsByIdRef.current);
          devDirectChat("STOMP 연결됨", { brokerURL, roomCount: roomIds.length, roomIds });
          roomIds.forEach((rid) => {
            subscribeOneRoom(client, rid);
          });

          const pubClient = stompRef.current;
          if (pubClient?.connected) {
            const batch = pendingDirectChatPublishesRef.current.splice(0);
            if (import.meta.env.DEV && batch.length > 0) {
              console.log("[direct-chat] STOMP 대기열 flush", {
                count: batch.length,
                items: batch.map((p) => ({ roomId: p.roomId, destination: p.destination })),
              });
            }
            for (const p of batch) {
              pubClient.publish({
                destination: p.destination,
                body: p.body,
                headers: STOMP_JSON_HEADERS,
              });
            }
            const refreshRooms = new Set(batch.map((p) => p.roomId));
            for (const rid of refreshRooms) {
              window.setTimeout(() => void loadRoomMessages(rid), 450);
            }
          }
        },
        onStompError: (frame) => {
          devDirectChat("STOMP 에러 프레임", {
            brokerURL,
            headers: frame.headers,
            body: frame.body?.slice(0, 500),
          });
        },
        onWebSocketError: (evt) => {
          const e = evt as Event;
          devDirectChat("WebSocket 에러", {
            brokerURL,
            type: e?.type,
            isTrusted: e?.isTrusted,
          });
        },
        onDisconnect: () => {
          devDirectChat("STOMP 연결 해제", { brokerURL });
        },
        onWebSocketClose: () => {
          devDirectChat("WebSocket close", { brokerURL, hadConnected: connected });
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
    // deps에 serverRoomsById 넣지 않음 — 폴링마다 새 객체로 STOMP가 끊겼다가 /ws부터 재시도하는 문제 방지
  }, [user?.id, wsBrokerURLs, subscribeOneRoom, loadRoomMessages]);

  useEffect(() => {
    if (!DIRECT_CHAT_WS_ENABLED) return;
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
