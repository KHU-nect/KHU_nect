import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, X, Check, Filter, MessageCircle } from "lucide-react";
import { Link } from "react-router";
import { LionAvatar } from "../components/LionAvatar";
import { UserProfileDialog } from "../components/UserProfileDialog";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { useDmChat } from "../context/DmChatContext";
import {
  DEFAULT_USER_HOBBIES,
  getPeersForMatchingTab,
  type FreeSlotPeer,
} from "../mocks/freeSlotPeers";
import { sanitizeHobbies } from "../constants/hobbyOptions";

function resolveUserHobbies(profile: { hobbies?: string[] } | null): string[] {
  if (profile?.hobbies === undefined) return DEFAULT_USER_HOBBIES;
  const cleaned = sanitizeHobbies(profile.hobbies);
  return cleaned.length > 0 ? cleaned : DEFAULT_USER_HOBBIES;
}

/** DM 상대 식별: 데모는 userId, 일반 목업은 가상 id */
function peerPosterUserId(peer: FreeSlotPeer): string {
  return peer.userId ?? `free-slot-peer-${peer.id}`;
}

export function MatchingPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { createRoomFromFreeSlotMatch } = useDmChat();
  const userHobbies = useMemo(() => resolveUserHobbies(profile), [profile]);

  const [selectedFilter, setSelectedFilter] = useState<"all" | string>("all");
  const [acceptedMatches, setAcceptedMatches] = useState<
    { card: FreeSlotPeer; roomId: string }[]
  >([]);
  const [showResult, setShowResult] = useState<"accept" | "reject" | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profilePeer, setProfilePeer] = useState<FreeSlotPeer | undefined>(undefined);
  const [timeKey, setTimeKey] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTimeKey((k) => k + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(), [timeKey]);

  const matchQueue = useMemo(() => {
    const filter: "all" | string = selectedFilter === "all" ? "all" : selectedFilter;
    return getPeersForMatchingTab(userHobbies, filter, now, user?.id).filter(
      (p) => !dismissedIds.has(p.id)
    );
  }, [userHobbies, selectedFilter, now, user?.id, dismissedIds]);

  const currentCard = matchQueue[0];

  useEffect(() => {
    setDismissedIds(new Set());
  }, [selectedFilter, userHobbies]);

  useEffect(() => {
    if (selectedFilter !== "all" && !userHobbies.includes(selectedFilter)) {
      setSelectedFilter("all");
    }
  }, [userHobbies, selectedFilter]);

  const filterChips = useMemo(() => {
    const chips: { id: "all" | string; label: string }[] = [{ id: "all", label: "전체" }];
    userHobbies.forEach((h) => chips.push({ id: h, label: h }));
    return chips;
  }, [userHobbies]);

  const accepterLabel = useMemo(() => {
    const dept = profile?.department?.trim();
    return dept ? `${dept} 쿠옹이` : "쿠옹이";
  }, [profile?.department]);

  const handleReject = useCallback(() => {
    if (!currentCard) return;
    setShowResult("reject");
    setDismissedIds((prev) => new Set([...prev, currentCard.id]));
    window.setTimeout(() => setShowResult(null), 800);
  }, [currentCard]);

  const handleSendMessage = useCallback(() => {
    if (!currentCard || !user?.id) return;
    const posterUserId = peerPosterUserId(currentCard);
    const posterLabel = currentCard.name;
    const roomId = createRoomFromFreeSlotMatch({
      posterUserId,
      accepterUserId: user.id,
      posterLabel,
      accepterLabel,
    });
    setAcceptedMatches((prev) => [...prev, { card: currentCard, roomId }]);
    setShowResult("accept");
    setDismissedIds((prev) => new Set([...prev, currentCard.id]));
    window.setTimeout(() => setShowResult(null), 800);
  }, [currentCard, user?.id, createRoomFromFreeSlotMatch, accepterLabel]);

  const totalInFilter = useMemo(
    () =>
      getPeersForMatchingTab(
        userHobbies,
        selectedFilter === "all" ? "all" : selectedFilter,
        now,
        user?.id
      ).length,
    [userHobbies, selectedFilter, now, user?.id]
  );

  const noneAvailable = totalInFilter === 0;

  return (
    <div className="min-h-screen bg-gray-50 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
      <div className="bg-white border-b border-gray-100 px-5 py-4">
        <h1 className="text-2xl font-bold text-gray-800">공강 매칭</h1>
        <p className="text-sm text-gray-500">지금 공강이면서 취미가 맞는 쿠옹이만 보여요</p>
      </div>

      <div className="px-5 py-5">
        {userHobbies.length === 0 && (
          <div className="mb-4 rounded-2xl border-2 border-amber-200 bg-[#FDF5E6] px-4 py-3 text-sm text-gray-700">
            <p className="font-semibold text-[#A71930] mb-1">취미를 추가해 주세요</p>
            <p className="text-xs text-gray-600 mb-2">
              마이페이지에서 취미·관심사를 등록하면 공강 매칭에 맞는 상대가 표시됩니다.
            </p>
            <Link
              to="/home/mypage"
              className="inline-block text-sm font-semibold underline"
              style={{ color: "#A71930" }}
            >
              마이페이지로 이동
            </Link>
          </div>
        )}

        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          {filterChips.map(({ id, label }) => {
            const active = selectedFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedFilter(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all flex-shrink-0 ${
                  active ? "shadow-sm" : "bg-white hover:shadow-sm"
                }`}
                style={{
                  backgroundColor: active ? "#FDF5E6" : "white",
                  borderWidth: "2px",
                  borderColor: active ? "#E6A620" : "#E5E7EB",
                }}
              >
                {id === "all" && (
                  <Filter
                    className="w-4 h-4"
                    style={{ color: active ? "#E6A620" : "#9CA3AF" }}
                  />
                )}
                <span
                  className="font-semibold text-sm max-w-[140px] truncate"
                  style={{
                    color: active ? "#E6A620" : "#6B7280",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {userHobbies.length > 0 && currentCard ? (
          <div className="relative">
            {showResult && (
              <div
                className="absolute inset-0 flex items-center justify-center z-10 rounded-2xl"
                style={{
                  backgroundColor:
                    showResult === "accept"
                      ? "rgba(167, 25, 48, 0.95)"
                      : "rgba(107, 114, 128, 0.95)",
                }}
              >
                <div className="text-center">
                  {showResult === "accept" ? (
                    <>
                      <Check className="w-20 h-20 text-white mx-auto mb-3" />
                      <p className="text-2xl font-bold text-white">연결됐어요!</p>
                    </>
                  ) : (
                    <>
                      <X className="w-20 h-20 text-white mx-auto mb-3" />
                      <p className="text-2xl font-bold text-white">다음 카드</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
              <button
                type="button"
                className="w-full text-center"
                onClick={() => {
                  setProfilePeer(currentCard);
                  setProfileDialogOpen(true);
                }}
              >
                <div className="flex flex-col items-center gap-4">
                  <LionAvatar department={currentCard.department} size="lg" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {currentCard.department} 쿠옹이
                    </h3>
                    <div
                      className="inline-block px-4 py-1.5 rounded-full font-semibold text-sm"
                      style={{ backgroundColor: "#FDF5E6", color: "#E6A620" }}
                    >
                      {currentCard.time} 공강
                    </div>
                  </div>
                </div>
              </button>

              <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                <p className="text-lg font-semibold text-gray-800 text-center">
                  &quot;{currentCard.activity}&quot;
                </p>
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <span className="text-2xl">📍</span>
                  <span className="text-sm">{currentCard.location}</span>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {currentCard.hobbies
                    .filter((h) => userHobbies.includes(h))
                    .map((h) => (
                      <span
                        key={h}
                        className="text-xs font-medium px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: "#FDF5E6", color: "#A71930" }}
                      >
                        {h}
                      </span>
                    ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReject}
                  className="flex-1 py-4 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-6 h-6 text-gray-600" />
                  <span className="font-semibold text-gray-700">거절</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!user?.id}
                  title={!user?.id ? "로그인이 필요해요" : undefined}
                  className="flex-1 py-4 rounded-xl text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: "#A71930" }}
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="font-semibold">메시지 보내기</span>
                </button>
              </div>

              <div className="text-center text-sm text-gray-500">
                <span className="font-bold" style={{ color: "#A71930" }}>
                  {dismissedIds.size + 1}
                </span>
                {" / "}
                {totalInFilter} 카드
              </div>
            </div>
          </div>
        ) : userHobbies.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
            <div className="text-7xl mb-4">🦁</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {noneAvailable ? "조건에 맞는 쿠옹이가 없어요" : "모든 카드를 확인했어요"}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {noneAvailable
                ? "지금 이 시간대에 공강이면서 취미가 겹치는 사람이 없거나, 다른 필터를 눌러 보세요."
                : "새로운 매칭을 기다려주세요!"}
            </p>
            <button
              type="button"
              onClick={() => setDismissedIds(new Set())}
              className="px-6 py-3 rounded-xl text-white font-semibold"
              style={{ backgroundColor: "#A71930" }}
            >
              처음부터 다시 보기
            </button>
          </div>
        ) : null}

        {acceptedMatches.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-4">최근 매칭</h3>
            <div className="space-y-3">
              {acceptedMatches
                .slice()
                .reverse()
                .slice(0, 5)
                .map(({ card, roomId }) => (
                  <Link
                    key={`${card.id}-${roomId}`}
                    to={`/home/chat?dm=${encodeURIComponent(roomId)}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-transparent hover:border-[#E6A620]"
                  >
                    <LionAvatar department={card.department} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">
                        {card.department} 쿠옹이
                      </p>
                      <p className="text-xs text-gray-500 truncate">{card.activity}</p>
                    </div>
                    <MessageSquare
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: "#E6A620" }}
                    />
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>

      <UserProfileDialog
        isOpen={isProfileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        user={
          profilePeer
            ? {
                department: profilePeer.department,
                name: profilePeer.name,
                year: profilePeer.year,
                todayQuestion: profilePeer.activity,
                hobbies: profilePeer.hobbies,
                bio: profilePeer.bio,
              }
            : undefined
        }
      />
    </div>
  );
}
