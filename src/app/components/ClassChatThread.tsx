import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HandshakeIcon, HelpCircle, Send } from "lucide-react";
import { useNavigate } from "react-router";
import { ApiError } from "../api/client";
import { MatchSuccessModal } from "./MatchSuccessModal";
import { useAuth } from "../context/AuthContext";
import { useClassChat } from "../context/ClassChatContext";
import { useDmChat } from "../context/DmChatContext";
import { useProfile } from "../context/ProfileContext";
import type { ClassChatMessage, InputMode } from "../types/classChat";
import { parseBackendInstantMs } from "../utils/parseBackendInstant";
import { getSitTogetherEndMs } from "../utils/sitTogetherExpiry";
import { sameAppUserId } from "../utils/userIdMatch";

type QuickMode = "none" | "question" | "sitTogether";

function toInputMode(quick: QuickMode): InputMode {
  if (quick === "question") return "question";
  if (quick === "sitTogether") return "sitTogether";
  return "normal";
}

function formatMessageTime(iso: string) {
  const ms = parseBackendInstantMs(iso);
  if (ms == null) return "—";
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? "오후" : "오전";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const clock = `${period} ${displayHours}:${minutes.toString().padStart(2, "0")}`;
  if (sameDay) return clock;
  return `${d.getMonth() + 1}/${d.getDate()} ${clock}`;
}

/** 같이 앉기 PENDING: 남은 시간 `M:SS 남음`(1초 단위). 만료 시 빈 문자열(목록에서 제거됨) */
function formatSitTogetherRemaining(msg: ClassChatMessage): string {
  const endMs = getSitTogetherEndMs(msg);
  if (endMs == null) return "";
  const remainingMs = endMs - Date.now();
  if (remainingMs <= 0) return "";
  const totalSec = Math.floor(remainingMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")} 남음`;
}

type Props = {
  courseId: string;
  serverCourseId?: number;
};

function normalizeMessageId(id: unknown): string {
  return String(id ?? "");
}

function isMessageMine(msg: ClassChatMessage, currentUserId: string | undefined) {
  if (currentUserId && msg.senderUserId != null && String(msg.senderUserId).trim() !== "") {
    return sameAppUserId(currentUserId, msg.senderUserId);
  }
  return msg.isMe;
}

export function ClassChatThread({ courseId, serverCourseId }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    bindCourseRoom,
    getMessages,
    getVisibleMessages,
    sendMessage,
    deleteMessage,
    acceptSitTogetherRequest,
    getCourseChatLoadError,
  } = useClassChat();
  const { refreshServerRooms } = useDmChat();
  const { profile } = useProfile();
  const [messageInput, setMessageInput] = useState("");
  const [quickMode, setQuickMode] = useState<QuickMode>("none");
  const [, setTick] = useState(0);
  const [sitAcceptingId, setSitAcceptingId] = useState<string | null>(null);
  const [sitMatchModal, setSitMatchModal] = useState<{
    directRoomId: string;
    peerLabel: string;
  } | null>(null);
  const sitTogetherStatusByIdRef = useRef<Map<string, string>>(new Map());
  const sitMatchModalShownIdRef = useRef<Set<string>>(new Set());
  const classChatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void bindCourseRoom(courseId, serverCourseId);
  }, [bindCourseRoom, courseId, serverCourseId]);

  const senderLabel = useMemo(() => {
    const dept = profile?.department?.trim();
    return dept ? `${dept} 쿠옹이` : "쿠옹이";
  }, [profile?.department]);

  const messages = getVisibleMessages(courseId);
  const loadError = getCourseChatLoadError(courseId);

  useLayoutEffect(() => {
    const el = classChatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [courseId, messages.length]);

  /** 요청자: 전체 목록 기준 PENDING → ACCEPTED 전환 시 모달(ACCEPTED 행은 화면에서 숨김) */
  useEffect(() => {
    if (!user?.id) return;
    const all = getMessages(courseId);
    for (const m of all) {
      if (m.kind !== "sitTogether") continue;
      const id = normalizeMessageId(m.id);
      const prev = sitTogetherStatusByIdRef.current.get(id);
      sitTogetherStatusByIdRef.current.set(id, m.sitTogetherStatus ?? "");
      if (m.sitTogetherStatus !== "ACCEPTED" || !m.sitTogetherDirectRoomId) continue;
      if (!isMessageMine(m, user.id)) continue;
      if (sitMatchModalShownIdRef.current.has(id)) continue;
      if (prev !== "PENDING" && prev !== "NOT_APPLICABLE") continue;
      sitMatchModalShownIdRef.current.add(id);
      setSitMatchModal({
        directRoomId: String(m.sitTogetherDirectRoomId),
        peerLabel: "수락한 쿠옹이",
      });
      break;
    }
  }, [messages, courseId, user?.id, getMessages]);

  const handleSend = () => {
    if (!messageInput.trim() || !user?.id) return;
    sendMessage(courseId, messageInput, toInputMode(quickMode), senderLabel, user.id, serverCourseId);
    setMessageInput("");
    setQuickMode("none");
  };

  const openDirectRoom = (roomId: string) => {
    void refreshServerRooms().finally(() => {
      navigate(`/home/chat?dm=${encodeURIComponent(roomId)}`);
    });
  };

  const handleAcceptSit = async (msg: ClassChatMessage) => {
    if (!user?.id || !msg.senderUserId || msg.kind !== "sitTogether") return;
    if (msg.senderUserId === user.id) return;

    setSitAcceptingId(msg.id);
    try {
      const { directRoomId } = await acceptSitTogetherRequest(courseId, msg.id);
      sitMatchModalShownIdRef.current.add(normalizeMessageId(msg.id));
      setSitMatchModal({
        directRoomId: String(directRoomId),
        peerLabel: msg.senderLabel || "쿠옹이",
      });
    } catch (e) {
      const msgText =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "수락 처리에 실패했습니다.";
      window.alert(msgText);
    } finally {
      setSitAcceptingId(null);
    }
  };

  const handleOpenSitDirectRoom = (msg: ClassChatMessage) => {
    const rid = msg.sitTogetherDirectRoomId;
    if (!rid) return;
    openDirectRoom(rid);
  };

  const renderBubble = (msg: ClassChatMessage) => {
    const isQuestion = msg.kind === "question";
    const isSit = msg.kind === "sitTogether";
    const mine = isMessageMine(msg, user?.id);
    const sitRemainLine =
      isSit && msg.sitTogetherStatus === "PENDING" ? formatSitTogetherRemaining(msg) : "";

    return (
      <div
        key={msg.id}
        className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}
      >
        <div className={`flex gap-2 max-w-[85%] ${mine ? "flex-row-reverse" : ""}`}>
          <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
            {!mine && (
              <span className="text-xs font-semibold text-gray-600 mb-1">{msg.senderLabel}</span>
            )}
            <div
              className={`px-4 py-2.5 rounded-2xl ${
                isQuestion
                  ? "bg-[#FDF5E6] border-2 border-[#E6A620] text-gray-900"
                  : isSit
                    ? "bg-[#FDF5E6] border-2 border-[#A71930] text-gray-900"
                    : "bg-white border border-gray-200 text-gray-900"
              }`}
            >
              {isQuestion && (
                <HelpCircle className="w-4 h-4 inline mr-1.5 align-text-bottom" style={{ color: "#E6A620" }} />
              )}
              {isSit && (
                <HandshakeIcon className="w-4 h-4 inline mr-1.5 align-text-bottom" style={{ color: "#A71930" }} />
              )}
              <span className="text-sm break-words">{msg.content}</span>
            </div>
            <span className="text-xs text-gray-500 mt-1 tabular-nums">
              {formatMessageTime(msg.createdAt)}
            </span>
            {sitRemainLine ? (
              <span
                className="text-[11px] mt-0.5 tabular-nums block leading-snug font-medium"
                style={{ color: "#A71930" }}
              >
                {sitRemainLine}
              </span>
            ) : null}
            {isSit &&
              msg.sitTogetherStatus === "PENDING" &&
              !mine &&
              user?.id && (
                <button
                  type="button"
                  disabled={sitAcceptingId === msg.id}
                  onClick={() => void handleAcceptSit(msg)}
                  className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white w-full max-w-[220px] disabled:opacity-60"
                  style={{ backgroundColor: "#A71930" }}
                >
                  {sitAcceptingId === msg.id ? "처리 중…" : "같이 앉기 수락 → 1:1 채팅"}
                </button>
              )}
            {isSit && msg.sitTogetherStatus === "ACCEPTED" && msg.sitTogetherDirectRoomId && (
              <button
                type="button"
                onClick={() => handleOpenSitDirectRoom(msg)}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 w-full max-w-[220px]"
                style={{ borderColor: "#A71930", color: "#A71930", backgroundColor: "#FDF5E6" }}
              >
                1:1 채팅 열기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const closeSitMatchModal = () => setSitMatchModal(null);
  const goToSitMatchChat = () => {
    if (!sitMatchModal) return;
    openDirectRoom(sitMatchModal.directRoomId);
    setSitMatchModal(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50">
      <MatchSuccessModal
        open={sitMatchModal != null}
        peerLabel={sitMatchModal?.peerLabel ?? ""}
        onClose={closeSitMatchModal}
        onGoToChat={goToSitMatchChat}
      />
      {loadError && (
        <div
          className="mx-4 mt-3 px-3 py-2 rounded-xl text-xs text-red-800 bg-red-50 border border-red-200"
          role="alert"
        >
          {loadError} (이 상태에서는 남이 쓴 글이 서버에서 내려오지 않을 수 있습니다.)
        </div>
      )}
      <div ref={classChatScrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-8">첫 메시지를 남겨보세요.</p>
        ) : (
          messages.map(renderBubble)
        )}
      </div>

      <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-2 safe-area-bottom flex-shrink-0">
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setQuickMode((m) => (m === "question" ? "none" : "question"))}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
              quickMode === "question"
                ? "border-[#E6A620] bg-[#FDF5E6] text-[#A71930] shadow-sm"
                : "border-gray-200 bg-gray-50 text-gray-600"
            }`}
          >
            <HelpCircle
              className="w-4 h-4 shrink-0"
              style={{ color: quickMode === "question" ? "#E6A620" : "#9CA3AF" }}
            />
            질문하기
          </button>
          <button
            type="button"
            onClick={() => setQuickMode((m) => (m === "sitTogether" ? "none" : "sitTogether"))}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
              quickMode === "sitTogether"
                ? "border-[#A71930] bg-[#FDF5E6] text-[#A71930] shadow-sm"
                : "border-gray-200 bg-gray-50 text-gray-600"
            }`}
          >
            <HandshakeIcon
              className="w-4 h-4 shrink-0"
              style={{ color: quickMode === "sitTogether" ? "#A71930" : "#9CA3AF" }}
            />
            같이 앉기
          </button>
        </div>
        <div className="flex items-center gap-2 pb-3">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#A71930]"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!messageInput.trim()}
            className="p-3 rounded-full bg-[#A71930] text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
