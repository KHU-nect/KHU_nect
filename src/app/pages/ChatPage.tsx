import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useDmChat } from "../context/DmChatContext";
import type { DmMessage, DmRoom } from "../types/dmChat";

function formatDmTime(iso: string) {
  const d = new Date(iso);
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

function peerLabel(room: DmRoom, meId: string): string {
  const other = room.participantIds.find((id) => id !== meId) ?? room.participantIds[0];
  return room.labelsByUserId[other] ?? "쿠옹이";
}

function lastMessagePreview(room: DmRoom): { text: string; time: string } {
  const last = room.messages[room.messages.length - 1];
  if (!last) {
    return { text: "대화를 시작해 보세요", time: "" };
  }
  return { text: last.content, time: formatDmTime(last.createdAt) };
}

function DmRoomListRow({
  room,
  userId,
  onOpen,
}: {
  room: DmRoom;
  userId: string;
  onOpen: (roomId: string) => void;
}) {
  const { getUnreadCountForRoom, inboxRevision } = useDmChat();
  const lastMsgId = room.messages[room.messages.length - 1]?.id ?? "";
  const unread = useMemo(
    () => getUnreadCountForRoom(room.id, userId),
    [
      room.id,
      userId,
      getUnreadCountForRoom,
      inboxRevision,
      room.messages.length,
      lastMsgId,
    ]
  );
  const preview = lastMessagePreview(room);
  const name = peerLabel(room, userId);

  return (
    <button
      type="button"
      onClick={() => onOpen(room.id)}
      className="w-full px-4 py-4 bg-white hover:bg-gray-50 transition-colors flex items-start gap-3 text-left"
    >
      <div className="relative text-3xl flex-shrink-0">
        🦁
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#A71930] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
          {preview.time && (
            <span className="text-xs text-gray-500 flex-shrink-0">{preview.time}</span>
          )}
        </div>
        <p className="text-sm text-gray-600 truncate">{preview.text}</p>
      </div>
    </button>
  );
}

export function ChatPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dmParam = searchParams.get("dm");
  const { user } = useAuth();
  const {
    getRoomsForUser,
    getRoom,
    sendDm,
    markDmRoomRead,
    inboxRevision,
  } = useDmChat();
  const [messageInput, setMessageInput] = useState("");

  const rooms = useMemo(
    () => (user?.id ? getRoomsForUser(user.id) : []),
    [getRoomsForUser, user?.id, inboxRevision]
  );

  const openRoomId = dmParam ?? null;
  const currentRoom = openRoomId && user?.id ? getRoom(openRoomId) : undefined;
  const partnerName =
    user?.id && currentRoom ? peerLabel(currentRoom, user.id) : "";

  useEffect(() => {
    if (!openRoomId || !user?.id || !currentRoom) return;
    markDmRoomRead(user.id, openRoomId);
  }, [openRoomId, user?.id, currentRoom?.id, currentRoom?.messages.length, markDmRoomRead]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !openRoomId || !user?.id) return;
    sendDm(openRoomId, user.id, messageInput);
    setMessageInput("");
  };

  const goToList = () => {
    setSearchParams({}, { replace: true });
  };

  const openRoom = (roomId: string) => {
    setSearchParams({ dm: roomId }, { replace: false });
  };

  const renderDmBubble = (msg: DmMessage, meId: string) => {
    const mine = msg.senderUserId === meId;
    return (
      <div
        key={msg.id}
        className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}
      >
        <div className={`flex gap-2 max-w-[75%] ${mine ? "flex-row-reverse" : ""}`}>
          <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
            <div
              className={`px-4 py-2 rounded-2xl ${
                mine ? "bg-[#E6A620] text-white" : "bg-white text-gray-900 border border-gray-200"
              }`}
            >
              <p className="text-sm break-words">{msg.content}</p>
            </div>
            <span className="text-xs text-gray-600 mt-1 tabular-nums">{formatDmTime(msg.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (openRoomId && user?.id) {
    if (!currentRoom) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
          <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
            <button
              type="button"
              onClick={goToList}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">채팅</h1>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <p className="text-gray-600 text-sm">대화방을 찾을 수 없어요.</p>
            <button
              type="button"
              onClick={goToList}
              className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: "#A71930" }}
            >
              목록으로
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col bg-[#ABC1D1] max-w-md md:max-w-2xl lg:max-w-3xl mx-auto w-full">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={goToList}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-3xl">🦁</div>
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">{partnerName}</h2>
            <p className="text-xs text-gray-500 truncate">
              {currentRoom.matchSource === "freeSlot"
                ? "공강 매칭 · 1:1"
                : currentRoom.matchSource === "classMatch"
                  ? "수업 매칭 · 1:1"
                  : currentRoom.matchSource === "sit" || currentRoom.sourceCourseId
                    ? "같이 앉기 · 1:1"
                    : "1:1 대화"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {currentRoom.messages.map((msg) => renderDmBubble(msg, user.id))}
        </div>

        <div className="bg-white border-t border-gray-200 px-4 py-3 pb-safe flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#A71930]"
            />
            <button
              type="button"
              onClick={handleSendMessage}
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

  return (
    <div className="min-h-screen bg-gray-50 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">채팅</h1>
        <p className="text-xs text-gray-500 mt-0.5">1:1 대화 · 공강 매칭 · 수업 매칭 · 같이 앉기</p>
      </div>

      <div className="divide-y divide-gray-200">
        {!user?.id ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">로그인이 필요해요.</p>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="text-6xl mb-4">🦁</div>
            <p className="text-gray-600 text-sm text-center font-medium">1:1 대화가 없어요</p>
            <p className="text-gray-400 text-xs mt-2 text-center leading-relaxed">
              공강 매칭에서 메시지 보내기 또는
              <br />
              수업 채팅의 &apos;같이 앉기&apos;로 방이 열려요.
            </p>
            <button
              type="button"
              onClick={() => navigate("/home/classes")}
              className="mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "#A71930" }}
            >
              내 수업으로 가기
            </button>
          </div>
        ) : (
          rooms.map((room) => (
            <DmRoomListRow
              key={room.id}
              room={room}
              userId={user.id}
              onOpen={openRoom}
            />
          ))
        )}
      </div>
    </div>
  );
}
