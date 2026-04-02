import { useEffect, useMemo, useState } from "react";
import { HandshakeIcon, HelpCircle, Send } from "lucide-react";
import { useNavigate } from "react-router";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useClassChat } from "../context/ClassChatContext";
import { useDmChat } from "../context/DmChatContext";
import { useProfile } from "../context/ProfileContext";
import type { ClassChatMessage, InputMode } from "../types/classChat";
import { sameAppUserId } from "../utils/userIdMatch";

type QuickMode = "none" | "question" | "sitTogether";

function toInputMode(quick: QuickMode): InputMode {
  if (quick === "question") return "question";
  if (quick === "sitTogether") return "sitTogether";
  return "normal";
}

function formatMessageTime(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
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

type Props = {
  courseId: string;
  serverCourseId?: number;
};

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
    getVisibleMessages,
    sendMessage,
    deleteMessage,
    acceptSitTogetherRequest,
    getCourseChatLoadError,
  } = useClassChat();
  const { createRoomFromSitMatch, refreshServerRooms } = useDmChat();
  const { profile } = useProfile();
  const [messageInput, setMessageInput] = useState("");
  const [quickMode, setQuickMode] = useState<QuickMode>("none");
  const [, setTick] = useState(0);
  const [sitAcceptingId, setSitAcceptingId] = useState<string | null>(null);

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

    const isDemo = user.id.startsWith("demo-user-");
    if (isDemo) {
      createRoomFromSitMatch({
        courseId,
        posterUserId: msg.senderUserId,
        accepterUserId: user.id,
        posterLabel: msg.senderLabel,
        accepterLabel: senderLabel,
      });
      deleteMessage(courseId, msg.id);
      return;
    }

    setSitAcceptingId(msg.id);
    try {
      const { directRoomId } = await acceptSitTogetherRequest(courseId, msg.id);
      openDirectRoom(directRoomId);
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

  const sitRemainingSec = (msg: ClassChatMessage): number | null => {
    if (msg.kind !== "sitTogether" || msg.sitTogetherStatus === "ACCEPTED") return null;
    if (!msg.expiresAt) return null;
    const ms = new Date(msg.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  };

  const renderBubble = (msg: ClassChatMessage) => {
    const isQuestion = msg.kind === "question";
    const isSit = msg.kind === "sitTogether";
    const mine = isMessageMine(msg, user?.id);
    const remain = isSit ? sitRemainingSec(msg) : null;
    const sitPendingExpired = isSit && remain !== null && remain <= 0;

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
              {isSit && remain !== null && (
                <span className="text-[#A71930] font-medium ml-1.5">
                  · {remain > 0 ? `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")} 남음` : "만료 임박"}
                </span>
              )}
            </span>
            {isSit &&
              msg.sitTogetherStatus === "PENDING" &&
              !mine &&
              user?.id &&
              !user.id.startsWith("demo-user-") &&
              !sitPendingExpired && (
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
            {isSit &&
              msg.sitTogetherStatus === "PENDING" &&
              mine &&
              user?.id?.startsWith("demo-user-") &&
              remain !== null &&
              remain > 0 && (
                <p className="mt-2 text-xs text-gray-500 max-w-[220px]">
                  데모 모드: 상대가 수락하면 로컬 1:1 방이 열립니다.
                </p>
              )}
            {isSit &&
              user?.id?.startsWith("demo-user-") &&
              !mine &&
              remain !== null &&
              remain > 0 && (
                <button
                  type="button"
                  onClick={() => void handleAcceptSit(msg)}
                  className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white w-full max-w-[220px]"
                  style={{ backgroundColor: "#A71930" }}
                >
                  같이 앉기 수락 (데모)
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

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50">
      {loadError && (
        <div
          className="mx-4 mt-3 px-3 py-2 rounded-xl text-xs text-red-800 bg-red-50 border border-red-200"
          role="alert"
        >
          {loadError} (이 상태에서는 남이 쓴 글이 서버에서 내려오지 않을 수 있습니다.)
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-4">
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
