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
import type { ClassChatMessage, InputMode, SitTogetherRequestStatus } from "../types/classChat";
import { useAuth } from "./AuthContext";
import { useTimetable } from "./TimetableContext";
import type { CourseChatMessageDto, CourseChatMessageMode } from "../api/courseChatApi";
import { ApiError } from "../api/client";
import {
  acceptSitTogetherMessage,
  enterCourseChatRoom,
  getCourseChatMessages,
  postCourseChatMessage,
} from "../api/courseChatApi";
import { buildStompBrokerUrls } from "../utils/stompBrokerUrls";
import { sameAppUserId } from "../utils/userIdMatch";

const STORAGE_KEY = "khu-nect_class_chat";
const ACCESS_TOKEN_KEY = "khu-nect_access_token";

const SIT_TOGETHER_TTL_MS = 5 * 60 * 1000;

type MessagesState = Record<string, ClassChatMessage[]>;
const QUESTION_PREFIX = "[Q]";
const SIT_PREFIX = "[SIT]";
const LOCAL_MSG_PREFIX = "local-";

function normalizeMessageId(id: unknown): string {
  return String(id ?? "");
}

/** 백엔드가 `/app/...` 를 쓰면 `.env`에 예: `VITE_COURSE_CHAT_STOMP_SEND_BASE=/app/course-chat/rooms` */
function courseChatStompSendDestination(roomId: string): string {
  const base = (import.meta.env.VITE_COURSE_CHAT_STOMP_SEND_BASE as string | undefined)?.trim();
  if (base) return `${base.replace(/\/$/, "")}/${roomId}/messages`;
  return `/pub/course-chat/rooms/${roomId}/messages`;
}

const STOMP_JSON_HEADERS = { "content-type": "application/json" };

const COURSE_CHAT_HTTP_SEND =
  String(import.meta.env.VITE_COURSE_CHAT_HTTP_SEND ?? "").toLowerCase() === "true";

/** `false`면 STOMP(WebSocket) 비활성 — 백엔드에 WS 없을 때 콘솔 재시도 스팸 방지. HTTP 폴링(7초)은 유지 */
const CLASS_CHAT_WS_ENABLED =
  String(import.meta.env.VITE_CLASS_CHAT_WS ?? "true").toLowerCase() !== "false";

/**
 * STOMP 재연결 간격(ms). `0`이면 자동 재연결 끔(@stomp/stompjs 규약).
 * 미설정 시 5000. 서버 WS 미구동 시 스팸 줄이려면 `30000` 또는 `0` + WS 끄기 권장.
 */
function stompReconnectDelayMs(): number {
  const raw = import.meta.env.VITE_STOMP_RECONNECT_DELAY_MS as string | undefined;
  if (raw === undefined || raw === "") return 5000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 5000;
  return n;
}

function parseTimeMs(iso: string | undefined): number | null {
  if (iso == null || iso === "") return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function sitExpiresAtMs(m: ClassChatMessage): number {
  if (m.kind !== "sitTogether") return Number.POSITIVE_INFINITY;
  if (m.sitTogetherStatus === "ACCEPTED") return Number.POSITIVE_INFINITY;
  const fromCreated = parseTimeMs(m.createdAt) ?? Date.now();
  const fallbackEnd = fromCreated + SIT_TOGETHER_TTL_MS;
  if (m.expiresAt != null && String(m.expiresAt).trim() !== "") {
    const exp = parseTimeMs(String(m.expiresAt));
    /** 미래 만료만 신뢰. 과거/0이면 서버·병합 오류로 보고 작성 시각+TTL 사용(바로 사라짐 방지) */
    if (exp != null && Number.isFinite(exp) && exp > fromCreated && exp > Date.now()) {
      return exp;
    }
  }
  return fallbackEnd;
}

export function isSitTogetherVisible(m: ClassChatMessage, now = Date.now()): boolean {
  if (m.kind !== "sitTogether") return true;
  if (m.sitTogetherStatus === "ACCEPTED") return true;
  /** 모드는 같이 앉기인데 상태만 NOT_APPLICABLE인 응답은 PENDING처럼 취급 */
  if (m.sitTogetherStatus === "NOT_APPLICABLE") return now <= sitExpiresAtMs({ ...m, sitTogetherStatus: "PENDING" });
  return now <= sitExpiresAtMs(m);
}

type ClassChatContextValue = {
  messagesByCourseId: MessagesState;
  bindCourseRoom: (courseId: string, serverCourseId?: number) => Promise<void>;
  getMessages: (courseId: string) => ClassChatMessage[];
  /** 만료된 같이 앉기 제외 (목록·미리보기용) */
  getVisibleMessages: (courseId: string) => ClassChatMessage[];
  sendMessage: (
    courseId: string,
    content: string,
    mode: InputMode,
    senderLabel: string,
    senderUserId: string,
    serverCourseId?: number
  ) => void;
  deleteMessage: (courseId: string, messageId: string) => void;
  /** 서버 같이 앉기 수락 → directRoomId 반환 후 메시지 목록 갱신 */
  acceptSitTogetherRequest: (courseId: string, messageId: string) => Promise<{ directRoomId: string }>;
  /** 목록 GET/입장 실패 시(예: 500) 사용자 안내 문구 */
  getCourseChatLoadError: (courseId: string) => string | undefined;
};

const ClassChatContext = createContext<ClassChatContextValue | undefined>(undefined);

function kindFromMode(mode: InputMode): ClassChatMessage["kind"] {
  if (mode === "question") return "question";
  if (mode === "sitTogether") return "sitTogether";
  return "text";
}

function decodeIncomingContent(
  raw: string,
  createdAt: string
): Pick<ClassChatMessage, "kind" | "content" | "expiresAt" | "sitRequestId"> {
  const s = typeof raw === "string" ? raw.trimStart() : String(raw);
  if (s.startsWith(QUESTION_PREFIX)) {
    return { kind: "question", content: s.slice(QUESTION_PREFIX.length).trim() };
  }
  if (s.startsWith(SIT_PREFIX)) {
    const baseMs = parseTimeMs(createdAt) ?? Date.now();
    return {
      kind: "sitTogether",
      content: s.slice(SIT_PREFIX.length).trim(),
      expiresAt: new Date(baseMs + SIT_TOGETHER_TTL_MS).toISOString(),
      sitRequestId: `sit-${createdAt || baseMs}`,
    };
  }
  return { kind: "text", content: s };
}

function normalizeSitTogetherStatusDto(raw: unknown): SitTogetherRequestStatus | undefined {
  const s = String(raw ?? "").toUpperCase();
  if (s === "NOT_APPLICABLE" || s === "PENDING" || s === "ACCEPTED") return s;
  return undefined;
}

function inputModeToApiMode(mode: InputMode): CourseChatMessageMode {
  if (mode === "question") return "QUESTION";
  if (mode === "sitTogether") return "SIT_TOGETHER";
  return "GENERAL";
}

function courseChatDtoToClassMessage(
  m: CourseChatMessageDto,
  courseId: string,
  userId: string
): ClassChatMessage {
  const rawContent = m.content != null ? String(m.content) : "";
  const createdAt =
    m.createdAt && String(m.createdAt).trim() !== ""
      ? String(m.createdAt)
      : new Date().toISOString();

  const apiMode = String(m.mode ?? "").toUpperCase();
  let decoded: Pick<ClassChatMessage, "kind" | "content" | "expiresAt" | "sitRequestId">;

  if (apiMode === "QUESTION") {
    decoded = { kind: "question", content: rawContent.trim() };
  } else if (apiMode === "SIT_TOGETHER") {
    const baseMs = parseTimeMs(createdAt) ?? Date.now();
    decoded = {
      kind: "sitTogether",
      content: rawContent.trim(),
      expiresAt: new Date(baseMs + SIT_TOGETHER_TTL_MS).toISOString(),
      sitRequestId: `sit-${String(m.messageId)}`,
    };
  } else {
    decoded = decodeIncomingContent(rawContent, createdAt);
  }

  const serverSit = normalizeSitTogetherStatusDto(m.sitTogetherStatus);
  const directRaw = m.sitTogetherDirectRoomId;
  const directId =
    directRaw != null && String(directRaw).trim() !== "" ? String(directRaw) : null;

  let sitTogetherStatus: SitTogetherRequestStatus | undefined;
  let sitTogetherDirectRoomId: string | null | undefined;

  if (decoded.kind === "sitTogether") {
    if (serverSit) {
      sitTogetherStatus = serverSit;
    } else if (directId) {
      sitTogetherStatus = "ACCEPTED";
    } else {
      sitTogetherStatus = "PENDING";
    }
    sitTogetherDirectRoomId = directId;
  } else {
    sitTogetherStatus = serverSit === "NOT_APPLICABLE" ? "NOT_APPLICABLE" : undefined;
    sitTogetherDirectRoomId = undefined;
  }

  if (decoded.kind === "sitTogether" && directId) {
    sitTogetherStatus = "ACCEPTED";
    sitTogetherDirectRoomId = directId;
  }

  if (decoded.kind === "sitTogether" && sitTogetherStatus === "NOT_APPLICABLE") {
    sitTogetherStatus = "PENDING";
  }

  const sid = String(m.senderUserId);
  const isMe = sameAppUserId(userId, m.senderUserId);

  return {
    id: String(m.messageId),
    courseId,
    kind: decoded.kind,
    content: decoded.content,
    createdAt,
    senderLabel: m.senderNickname || "쿠옹이",
    senderUserId: sid === "-1" ? undefined : sid,
    sitRequestId: decoded.sitRequestId,
    expiresAt: sitTogetherStatus === "ACCEPTED" ? undefined : decoded.expiresAt,
    sitTogetherStatus,
    sitTogetherDirectRoomId,
    isMe,
  };
}

type IncomingCourseChatMessage = {
  messageId?: string | number;
  senderUserId?: number;
  senderNickname?: string;
  content?: string;
  createdAt?: string;
  mode?: string;
  sitTogetherStatus?: string;
  sitTogetherDirectRoomId?: string | number;
};

function unwrapCourseChatFrame(body: string): IncomingCourseChatMessage | null {
  try {
    const parsed = JSON.parse(body) as
      | IncomingCourseChatMessage
      | { success?: boolean; data?: IncomingCourseChatMessage | null };
    if (parsed && "data" in parsed) {
      return parsed.data ?? null;
    }
    return parsed as IncomingCourseChatMessage;
  } catch {
    return null;
  }
}

type PendingCoursePublish = {
  destination: string;
  body: string;
  courseId: string;
  roomId: string;
};

function buildOptimisticClassMessage(
  courseId: string,
  mode: InputMode,
  trimmed: string,
  senderLabel: string,
  senderUserId: string
): ClassChatMessage {
  const kind = kindFromMode(mode);
  const createdAt = new Date().toISOString();
  const base: ClassChatMessage = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    courseId,
    kind,
    content: trimmed,
    createdAt,
    senderLabel,
    senderUserId,
    isMe: true,
  };
  return kind === "sitTogether"
    ? {
        ...base,
        sitRequestId: `sit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        expiresAt: new Date(Date.now() + SIT_TOGETHER_TTL_MS).toISOString(),
        sitTogetherStatus: "PENDING",
        sitTogetherDirectRoomId: null,
      }
    : base;
}

function messagesLikelyDuplicate(a: ClassChatMessage, b: ClassChatMessage): boolean {
  const sa = a.senderUserId;
  const sb = b.senderUserId;
  const saSet = sa != null && String(sa).trim() !== "";
  const sbSet = sb != null && String(sb).trim() !== "";
  if (saSet && sbSet) {
    if (!sameAppUserId(sa, sb)) return false;
  } else if (String(sa ?? "") !== String(sb ?? "")) {
    return false;
  }
  const ca = String(a.content ?? "").trim();
  const cb = String(b.content ?? "").trim();
  if (ca === cb) return true;
  if (ca === `${SIT_PREFIX}${cb}` || ca === `${QUESTION_PREFIX}${cb}`) return true;
  if (cb === `${SIT_PREFIX}${ca}` || cb === `${QUESTION_PREFIX}${ca}`) return true;
  return false;
}

/**
 * 낙관적 local-* 와 서버에 잡힌 동일 메시지가 한 프레임 겹칠 때 말풍선이 2개로 보이는 현상 완화.
 * (둘 다 서버 id인 동일 본문은 실제로 두 번 보낸 경우일 수 있어 합치지 않음)
 */
function dedupeOptimisticDuplicates(messages: ClassChatMessage[]): ClassChatMessage[] {
  if (messages.length < 2) return messages;
  const sorted = [...messages].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const out: ClassChatMessage[] = [];

  outer: for (const m of sorted) {
    const mLocal = normalizeMessageId(m.id).startsWith(LOCAL_MSG_PREFIX);
    for (let i = 0; i < out.length; i++) {
      const x = out[i];
      const xLocal = normalizeMessageId(x.id).startsWith(LOCAL_MSG_PREFIX);
      if (!mLocal && !xLocal) continue;
      if (m.kind !== x.kind) continue;
      if (!messagesLikelyDuplicate(x, m)) continue;

      if (xLocal && !mLocal) {
        out[i] = m;
        continue outer;
      }
      if (!xLocal && mLocal) {
        continue outer;
      }
      continue outer;
    }
    out.push(m);
  }
  return out;
}

/**
 * 서버가 [SIT]를 저장하지 않고 일반 text로만 내려주면, 폴링 직후 같이 앉기 카드가 일반 말풍선으로 바뀌거나 사라진 것처럼 보임.
 * 직전 렌더에 sitTogether였던 메시지(동일 id·발신·본문)는 서버 행을 sitTogether로 유지.
 */
function alignSitTogetherFromPrev(
  serverList: ClassChatMessage[],
  prevList: ClassChatMessage[] | undefined
): ClassChatMessage[] {
  if (!prevList?.length) return serverList;
  const prevById = new Map(prevList.map((m) => [normalizeMessageId(m.id), m]));
  return serverList.map((s) => {
    const prevM = prevById.get(normalizeMessageId(s.id));
    if (
      prevM?.kind === "sitTogether" &&
      s.kind === "text" &&
      sameAppUserId(prevM.senderUserId, s.senderUserId) &&
      String(prevM.content ?? "").trim() === String(s.content ?? "").trim()
    ) {
      const baseMs = parseTimeMs(s.createdAt) ?? Date.now();
      const exp =
        prevM.expiresAt && parseTimeMs(prevM.expiresAt) != null
          ? prevM.expiresAt
          : new Date(baseMs + SIT_TOGETHER_TTL_MS).toISOString();
      return {
        ...s,
        kind: "sitTogether",
        expiresAt: exp,
        sitRequestId: prevM.sitRequestId ?? `sit-${normalizeMessageId(s.id)}`,
        sitTogetherStatus: prevM.sitTogetherStatus ?? "PENDING",
        sitTogetherDirectRoomId: prevM.sitTogetherDirectRoomId ?? null,
      };
    }
    return s;
  });
}

/** 서버 히스토리로 덮어쓸 때, 아직 서버에 안 잡힌 local- 전송분은 유지 */
function mergeServerAndPendingLocals(
  serverList: ClassChatMessage[],
  prevList: ClassChatMessage[] | undefined,
  currentUserId: string
): ClassChatMessage[] {
  let base = alignSitTogetherFromPrev(serverList, prevList);

  const pending = (prevList ?? []).filter(
    (m) =>
      normalizeMessageId(m.id).startsWith(LOCAL_MSG_PREFIX) &&
      sameAppUserId(currentUserId, m.senderUserId)
  );

  if (pending.length === 0) {
    return base.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }

  const merged = [...base];
  for (const p of pending) {
    const dupIdx = merged.findIndex((s) => messagesLikelyDuplicate(s, p));
    if (dupIdx === -1) {
      merged.push(p);
      continue;
    }
    const s = merged[dupIdx];
    if (p.kind === "sitTogether" && s.kind === "text") {
      const baseMs = parseTimeMs(s.createdAt) ?? Date.now();
      merged[dupIdx] = {
        ...s,
        kind: "sitTogether",
        content: String(p.content ?? "").trim(),
        expiresAt:
          p.expiresAt && parseTimeMs(p.expiresAt) != null
            ? p.expiresAt
            : new Date(baseMs + SIT_TOGETHER_TTL_MS).toISOString(),
        sitRequestId: p.sitRequestId ?? `sit-${normalizeMessageId(s.id)}`,
        sitTogetherStatus: p.sitTogetherStatus ?? "PENDING",
        sitTogetherDirectRoomId: p.sitTogetherDirectRoomId ?? null,
      };
    }
  }
  merged.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  return merged;
}

export function ClassChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { courses } = useTimetable();
  const [messagesByCourseId, setMessagesByCourseId] = useState<MessagesState>({});
  const [courseRoomMap, setCourseRoomMap] = useState<Record<string, string>>({});
  const [courseChatLoadErrors, setCourseChatLoadErrors] = useState<Record<string, string>>({});
  const stompRef = useRef<Client | null>(null);
  const subsRef = useRef<Record<string, StompSubscription>>({});
  const pendingCourseChatPublishesRef = useRef<PendingCoursePublish[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as MessagesState;
        const migrated: MessagesState = {};
        for (const [cid, list] of Object.entries(parsed)) {
          migrated[cid] = list.map((m) => {
            let next: ClassChatMessage = {
              ...m,
              id: normalizeMessageId(m.id),
              courseId: typeof m.courseId === "string" ? m.courseId : String(m.courseId ?? ""),
            };
            if (!next.senderUserId) {
              next = {
                ...next,
                senderUserId: m.isMe ? "mock-user-1" : undefined,
              };
            }
            if (next.kind === "sitTogether" && !next.expiresAt) {
              const base = parseTimeMs(next.createdAt) ?? Date.now();
              next = {
                ...next,
                expiresAt: new Date(base + SIT_TOGETHER_TTL_MS).toISOString(),
                sitRequestId:
                  next.sitRequestId ?? `sit-legacy-${next.id}`,
              };
            }
            if (next.kind === "sitTogether" && next.sitTogetherStatus == null) {
              next = {
                ...next,
                sitTogetherStatus: next.sitTogetherDirectRoomId ? "ACCEPTED" : "PENDING",
              };
            }
            return next;
          });
        }
        setMessagesByCourseId(migrated);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesByCourseId));
  }, [messagesByCourseId]);

  const wsBrokerURLs = useMemo(() => buildStompBrokerUrls(), []);

  const loadCourseMessages = useCallback(
    async (courseId: string, roomId: string) => {
      if (!user?.id || user.id.startsWith("demo-user-")) return;
      try {
        const response = await getCourseChatMessages(roomId, 80);
        const mapped: ClassChatMessage[] = [];
        for (const m of response.messages) {
          try {
            mapped.push(courseChatDtoToClassMessage(m, courseId, user.id));
          } catch {
            /* 잘못된 행은 건너뜀 — 전체 목록 로드 실패로 화면이 멈추지 않게 */
          }
        }
        mapped.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        setCourseChatLoadErrors((prev) => {
          if (!prev[courseId]) return prev;
          const next = { ...prev };
          delete next[courseId];
          return next;
        });
        setMessagesByCourseId((prev) => {
          const uid = user?.id;
          const merged =
            uid && !uid.startsWith("demo-user-")
              ? mergeServerAndPendingLocals(mapped, prev[courseId], uid)
              : mapped;
          return { ...prev, [courseId]: merged };
        });
      } catch (e) {
        const hint =
          e instanceof ApiError && e.status === 500
            ? "서버 오류(500)로 수업 채팅 목록을 불러오지 못했습니다. 백엔드 로그를 확인해 주세요."
            : e instanceof ApiError
              ? e.message
              : "수업 채팅 목록을 불러오지 못했습니다.";
        console.error("[course-chat] get messages failed", { courseId, roomId, err: e });
        setCourseChatLoadErrors((prev) => ({ ...prev, [courseId]: hint }));
      }
    },
    [user?.id]
  );

  const bindCourseRoom = useCallback(
    async (courseId: string, serverCourseId?: number) => {
      if (!serverCourseId || !user?.id || user.id.startsWith("demo-user-")) return;
      try {
        const entered = await enterCourseChatRoom(serverCourseId, true);
        const roomId = String(entered.roomId);
        setCourseRoomMap((prev) => ({ ...prev, [courseId]: roomId }));
        await loadCourseMessages(courseId, roomId);
      } catch (e) {
        const hint =
          e instanceof ApiError && e.status === 500
            ? "수업 채팅방 입장 API에서 서버 오류(500)가 났습니다."
            : e instanceof ApiError
              ? e.message
              : "수업 채팅방에 연결하지 못했습니다.";
        console.error("[course-chat] enter room failed", { courseId, serverCourseId, err: e });
        setCourseChatLoadErrors((prev) => ({ ...prev, [courseId]: hint }));
      }
    },
    [user?.id, loadCourseMessages]
  );

  /** 시간표 수업방 미리 입장 → 홈/수업 목록 미리보기·폴링·WS 구독이 바로 동작 */
  const timetableChatKey = useMemo(
    () =>
      courses
        .filter((c) => c.serverCourseId != null)
        .map((c) => `${c.id}:${c.serverCourseId}`)
        .sort()
        .join("|"),
    [courses]
  );

  const coursesRef = useRef(courses);
  coursesRef.current = courses;

  useEffect(() => {
    if (!user?.id || user.id.startsWith("demo-user-")) return;
    if (!timetableChatKey) return;
    let cancelled = false;

    const run = async () => {
      const targets = coursesRef.current.filter((c) => c.serverCourseId != null);
      if (targets.length === 0) return;

      const results = await Promise.allSettled(
        targets.map(async (c) => {
          const entered = await enterCourseChatRoom(c.serverCourseId!, true);
          return { courseId: c.id, roomId: String(entered.roomId) };
        })
      );

      if (cancelled) return;

      const mapUpdates: Record<string, string> = {};
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          mapUpdates[r.value.courseId] = r.value.roomId;
        }
      }
      if (Object.keys(mapUpdates).length === 0) return;

      setCourseRoomMap((prev) => ({ ...prev, ...mapUpdates }));

      await Promise.all(
        Object.entries(mapUpdates).map(([courseId, roomId]) =>
          loadCourseMessages(courseId, roomId).catch(() => {
            /* 개별 방 실패는 무시 */
          })
        )
      );
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, timetableChatKey, loadCourseMessages]);

  /** 주기적으로 만료된 같이 앉기 메시지 제거 */
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setMessagesByCourseId((prev) => {
        let changed = false;
        const next: MessagesState = {};
        for (const [cid, list] of Object.entries(prev)) {
          const filtered = list.filter((m) => {
            if (m.kind !== "sitTogether") return true;
            if (now <= sitExpiresAtMs(m)) return true;
            changed = true;
            return false;
          });
          next[cid] = filtered;
        }
        return changed ? next : prev;
      });
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  const getMessages = useCallback(
    (courseId: string) => dedupeOptimisticDuplicates(messagesByCourseId[courseId] ?? []),
    [messagesByCourseId]
  );

  const getVisibleMessages = useCallback(
    (courseId: string) =>
      dedupeOptimisticDuplicates(messagesByCourseId[courseId] ?? []).filter((m) =>
        isSitTogetherVisible(m)
      ),
    [messagesByCourseId]
  );

  const deleteMessage = useCallback((courseId: string, messageId: string) => {
    setMessagesByCourseId((prev) => {
      const list = prev[courseId];
      if (!list) return prev;
      const target = normalizeMessageId(messageId);
      const filtered = list.filter((m) => normalizeMessageId(m.id) !== target);
      if (filtered.length === list.length) return prev;
      return { ...prev, [courseId]: filtered };
    });
  }, []);

  const sendMessage = useCallback(
    (
      courseId: string,
      content: string,
      mode: InputMode,
      senderLabel: string,
      senderUserId: string,
      serverCourseId?: number
    ) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const apiMode = inputModeToApiMode(mode);
      const publishBody = JSON.stringify({ content: trimmed, mode: apiMode });
      const httpPayload = { content: trimmed, mode: apiMode };

      /**
       * 예전 동작 복원: 기본은 STOMP → 미연결이면 전송 대기 큐.
       * `.env`에 VITE_COURSE_CHAT_HTTP_SEND=true 일 때만 REST만 사용(백엔드에 WS 없을 때).
       */
      const sendToBackendRoom = (roomId: string, reloadCourseId: string) => {
        const dest = courseChatStompSendDestination(roomId);

        if (COURSE_CHAT_HTTP_SEND) {
          void (async () => {
            try {
              await postCourseChatMessage(roomId, httpPayload);
              await loadCourseMessages(reloadCourseId, roomId);
            } catch {
              window.alert(
                "수업 채팅 메시지를 서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
              );
            }
          })();
          return;
        }

        const client = stompRef.current;
        if (client?.connected) {
          client.publish({ destination: dest, body: publishBody, headers: STOMP_JSON_HEADERS });
          window.setTimeout(() => void loadCourseMessages(reloadCourseId, roomId), 500);
          window.setTimeout(() => void loadCourseMessages(reloadCourseId, roomId), 1800);
          return;
        }

        pendingCourseChatPublishesRef.current.push({
          destination: dest,
          body: publishBody,
          courseId: reloadCourseId,
          roomId,
        });
      };

      const tryPublishOrQueue = (roomId: string, addOptimistic: boolean) => {
        if (addOptimistic) {
          const msg = buildOptimisticClassMessage(
            courseId,
            mode,
            trimmed,
            senderLabel,
            senderUserId
          );
          setMessagesByCourseId((prev) => ({
            ...prev,
            [courseId]: [...(prev[courseId] ?? []), msg],
          }));
        }

        sendToBackendRoom(roomId, courseId);
      };

      const mappedRoomId = courseRoomMap[courseId];
      if (user?.id && !user.id.startsWith("demo-user-")) {
        if (mappedRoomId) {
          tryPublishOrQueue(mappedRoomId, true);
          return;
        }
        if (serverCourseId) {
          const early = buildOptimisticClassMessage(
            courseId,
            mode,
            trimmed,
            senderLabel,
            senderUserId
          );
          setMessagesByCourseId((prev) => ({
            ...prev,
            [courseId]: [...(prev[courseId] ?? []), early],
          }));
          void (async () => {
            try {
              const entered = await enterCourseChatRoom(serverCourseId, true);
              const roomId = String(entered.roomId);
              setCourseRoomMap((prev) => ({ ...prev, [courseId]: roomId }));
              tryPublishOrQueue(roomId, false);
            } catch {
              /* 낙관적 메시지(early)만 유지 */
            }
          })();
          return;
        }
        setMessagesByCourseId((prev) => ({
          ...prev,
          [courseId]: [
            ...(prev[courseId] ?? []),
            buildOptimisticClassMessage(courseId, mode, trimmed, senderLabel, senderUserId),
          ],
        }));
        return;
      }

      // 데모 계정: 실서버 방이 매핑된 경우에도 HTTP 우선(실계정과 동일)
      if (mappedRoomId) {
        setMessagesByCourseId((prev) => ({
          ...prev,
          [courseId]: [
            ...(prev[courseId] ?? []),
            buildOptimisticClassMessage(courseId, mode, trimmed, senderLabel, senderUserId),
          ],
        }));
        sendToBackendRoom(mappedRoomId, courseId);
        return;
      }

      const msg = buildOptimisticClassMessage(courseId, mode, trimmed, senderLabel, senderUserId);
      setMessagesByCourseId((prev) => ({
        ...prev,
        [courseId]: [...(prev[courseId] ?? []), msg],
      }));
    },
    [courseRoomMap, user?.id, loadCourseMessages]
  );

  const getCourseChatLoadError = useCallback(
    (courseId: string) => courseChatLoadErrors[courseId],
    [courseChatLoadErrors]
  );

  const acceptSitTogetherRequest = useCallback(
    async (courseId: string, messageId: string) => {
      const roomId = courseRoomMap[courseId];
      if (!roomId) {
        throw new Error("수업 채팅방이 연결되지 않았습니다.");
      }
      const res = await acceptSitTogetherMessage(roomId, String(messageId));
      const directRoomId = String(res.directRoomId);
      await loadCourseMessages(courseId, roomId);
      return { directRoomId };
    },
    [courseRoomMap, loadCourseMessages]
  );

  const value = useMemo(
    () => ({
      messagesByCourseId,
      bindCourseRoom,
      getMessages,
      getVisibleMessages,
      sendMessage,
      deleteMessage,
      acceptSitTogetherRequest,
      getCourseChatLoadError,
    }),
    [
      messagesByCourseId,
      bindCourseRoom,
      getMessages,
      getVisibleMessages,
      sendMessage,
      deleteMessage,
      acceptSitTogetherRequest,
      getCourseChatLoadError,
    ]
  );

  useEffect(() => {
    if (!user?.id || user.id.startsWith("demo-user-")) return;
    const entries = Object.entries(courseRoomMap);
    if (entries.length === 0) return;
    const tick = async () => {
      for (const [courseId, roomId] of entries) {
        await loadCourseMessages(courseId, roomId);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 7000);
    return () => window.clearInterval(id);
  }, [courseRoomMap, loadCourseMessages, user?.id]);

  useEffect(() => {
    if (!CLASS_CHAT_WS_ENABLED) return;
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
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: stompReconnectDelayMs(),
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          connected = true;
          for (const [courseId, roomId] of Object.entries(courseRoomMap)) {
            if (subsRef.current[roomId]) continue;
            subsRef.current[roomId] = client.subscribe(
              `/sub/course-chat/rooms/${roomId}`,
              (frame: IMessage) => {
                const parsed = unwrapCourseChatFrame(frame.body);
                if (!parsed) {
                  void loadCourseMessages(courseId, roomId);
                  return;
                }
                setMessagesByCourseId((prev) => {
                  try {
                    const list = prev[courseId] ?? [];
                    const id =
                      parsed.messageId != null
                        ? normalizeMessageId(parsed.messageId)
                        : `ws-${Date.now()}`;
                    const createdAtWs =
                      parsed.createdAt && String(parsed.createdAt).trim() !== ""
                        ? String(parsed.createdAt)
                        : new Date().toISOString();
                    const incoming = courseChatDtoToClassMessage(
                      {
                        messageId: id,
                        roomId,
                        senderUserId: parsed.senderUserId ?? 0,
                        senderNickname: parsed.senderNickname ?? "쿠옹이",
                        content: String(parsed.content ?? ""),
                        createdAt: createdAtWs,
                        mode: parsed.mode,
                        sitTogetherStatus: parsed.sitTogetherStatus,
                        sitTogetherDirectRoomId: parsed.sitTogetherDirectRoomId,
                      },
                      courseId,
                      user.id
                    );
                    const idx = list.findIndex((m) => normalizeMessageId(m.id) === id);
                    const mergedList =
                      idx === -1
                        ? [...list, incoming]
                        : list.map((m, i) => (i === idx ? incoming : m));
                    const next = mergedList.sort((a, b) =>
                      String(a.createdAt).localeCompare(String(b.createdAt))
                    );
                    return { ...prev, [courseId]: next };
                  } catch {
                    return prev;
                  }
                });
              }
            );
          }
          const pubClient = stompRef.current;
          if (pubClient?.connected) {
            const batch = pendingCourseChatPublishesRef.current.splice(0);
            for (const p of batch) {
              pubClient.publish({
                destination: p.destination,
                body: p.body,
                headers: STOMP_JSON_HEADERS,
              });
            }
            const refreshRooms = new Map<string, string>();
            for (const p of batch) refreshRooms.set(p.courseId, p.roomId);
            for (const [cid, rid] of refreshRooms) {
              window.setTimeout(() => void loadCourseMessages(cid, rid), 450);
            }
          }
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
  }, [courseRoomMap, wsBrokerURLs, user?.id]);

  return (
    <ClassChatContext.Provider value={value}>{children}</ClassChatContext.Provider>
  );
}

export function useClassChat() {
  const ctx = useContext(ClassChatContext);
  if (!ctx) {
    throw new Error("useClassChat must be used within ClassChatProvider");
  }
  return ctx;
}
