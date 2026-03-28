import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ClassChatMessage, InputMode } from "../types/classChat";

const STORAGE_KEY = "khu-nect_class_chat";

const SIT_TOGETHER_TTL_MS = 5 * 60 * 1000;

type MessagesState = Record<string, ClassChatMessage[]>;

function sitExpiresAtMs(m: ClassChatMessage): number {
  if (m.kind !== "sitTogether") return Number.POSITIVE_INFINITY;
  if (m.expiresAt) return new Date(m.expiresAt).getTime();
  return new Date(m.createdAt).getTime() + SIT_TOGETHER_TTL_MS;
}

export function isSitTogetherVisible(m: ClassChatMessage, now = Date.now()): boolean {
  if (m.kind !== "sitTogether") return true;
  return now <= sitExpiresAtMs(m);
}

type ClassChatContextValue = {
  messagesByCourseId: MessagesState;
  getMessages: (courseId: string) => ClassChatMessage[];
  /** 만료된 같이 앉기 제외 (목록·미리보기용) */
  getVisibleMessages: (courseId: string) => ClassChatMessage[];
  sendMessage: (
    courseId: string,
    content: string,
    mode: InputMode,
    senderLabel: string,
    senderUserId: string
  ) => void;
  deleteMessage: (courseId: string, messageId: string) => void;
};

const ClassChatContext = createContext<ClassChatContextValue | undefined>(undefined);

function kindFromMode(mode: InputMode): ClassChatMessage["kind"] {
  if (mode === "question") return "question";
  if (mode === "sitTogether") return "sitTogether";
  return "text";
}

export function ClassChatProvider({ children }: { children: ReactNode }) {
  const [messagesByCourseId, setMessagesByCourseId] = useState<MessagesState>({});

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as MessagesState;
        const migrated: MessagesState = {};
        for (const [cid, list] of Object.entries(parsed)) {
          migrated[cid] = list.map((m) => {
            let next = m;
            if (!m.senderUserId) {
              next = {
                ...m,
                senderUserId: m.isMe ? "mock-user-1" : undefined,
              };
            }
            if (next.kind === "sitTogether" && !next.expiresAt) {
              next = {
                ...next,
                expiresAt: new Date(
                  new Date(next.createdAt).getTime() + SIT_TOGETHER_TTL_MS
                ).toISOString(),
                sitRequestId:
                  next.sitRequestId ?? `sit-legacy-${next.id}`,
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
    (courseId: string) => messagesByCourseId[courseId] ?? [],
    [messagesByCourseId]
  );

  const getVisibleMessages = useCallback(
    (courseId: string) =>
      (messagesByCourseId[courseId] ?? []).filter((m) => isSitTogetherVisible(m)),
    [messagesByCourseId]
  );

  const deleteMessage = useCallback((courseId: string, messageId: string) => {
    setMessagesByCourseId((prev) => {
      const list = prev[courseId];
      if (!list) return prev;
      const filtered = list.filter((m) => m.id !== messageId);
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
      senderUserId: string
    ) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const kind = kindFromMode(mode);
      const createdAt = new Date().toISOString();
      const base: ClassChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        courseId,
        kind,
        content: trimmed,
        createdAt,
        senderLabel,
        senderUserId,
        isMe: true,
      };

      const msg: ClassChatMessage =
        kind === "sitTogether"
          ? {
              ...base,
              sitRequestId: `sit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              expiresAt: new Date(Date.now() + SIT_TOGETHER_TTL_MS).toISOString(),
            }
          : base;

      setMessagesByCourseId((prev) => ({
        ...prev,
        [courseId]: [...(prev[courseId] ?? []), msg],
      }));
    },
    []
  );

  const value = useMemo(
    () => ({
      messagesByCourseId,
      getMessages,
      getVisibleMessages,
      sendMessage,
      deleteMessage,
    }),
    [messagesByCourseId, getMessages, getVisibleMessages, sendMessage, deleteMessage]
  );

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
