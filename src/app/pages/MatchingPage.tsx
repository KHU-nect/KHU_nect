import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, X, Check, Filter, MessageCircle } from "lucide-react";
import { Link } from "react-router";
import { LionAvatar } from "../components/LionAvatar";
import { UserProfileDialog } from "../components/UserProfileDialog";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";
import { getFreePeriodMatches, mapFreePeriodUsersToPeers } from "../api/matchingApi";
import { useOpenDmFromFreeSlotPeer } from "../hooks/useOpenDmFromFreeSlotPeer";
import { getMyInterests, type MyInterest } from "../api/interestApi";
import {
  getPeersForMatchingTab,
  peerCardHeadline,
  peerCardIntro,
  peerCardQuote,
  type FreeSlotPeer,
} from "../mocks/freeSlotPeers";
import { resolveViewerHobbies } from "../utils/resolveViewerHobbies";

export function MatchingPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { openDmFromFreeSlotPeer } = useOpenDmFromFreeSlotPeer();
  const userHobbies = useMemo(() => resolveViewerHobbies(profile), [profile]);
  const isDemoUser = user?.id?.startsWith("demo-user-") ?? false;

  const [selectedFilter, setSelectedFilter] = useState<"all" | string>("all");
  const [acceptedMatches, setAcceptedMatches] = useState<
    { card: FreeSlotPeer; roomId: string }[]
  >([]);
  const [showResult, setShowResult] = useState<"accept" | "reject" | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profilePeer, setProfilePeer] = useState<FreeSlotPeer | undefined>(undefined);
  const [timeKey, setTimeKey] = useState(0);
  const [backendPeers, setBackendPeers] = useState<FreeSlotPeer[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [interestIdByName, setInterestIdByName] = useState<Record<string, number>>({});
  const [myInterests, setMyInterests] = useState<MyInterest[]>([]);
  const [interestsLoaded, setInterestsLoaded] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setTimeKey((k) => k + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(), [timeKey]);

  useEffect(() => {
    if (!user?.id || isDemoUser) {
      setInterestIdByName({});
      setMyInterests([]);
      setInterestsLoaded(false);
      return;
    }
    let cancelled = false;
    setInterestsLoaded(false);
    void getMyInterests()
      .then((list) => {
        if (cancelled) return;
        const m: Record<string, number> = {};
        const cleaned: MyInterest[] = [];
        const seen = new Set<string>();
        for (const i of list) {
          const n = i?.name?.trim();
          if (!n || i.interestId == null || seen.has(n)) continue;
          seen.add(n);
          m[n] = i.interestId;
          cleaned.push({ interestId: i.interestId, name: n });
        }
        setInterestIdByName(m);
        setMyInterests(cleaned);
        setInterestsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setInterestIdByName({});
          setMyInterests([]);
          setInterestsLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isDemoUser]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || isDemoUser) {
      setBackendPeers([]);
      setLoadingPeers(false);
      return;
    }
    if (selectedFilter !== "all" && !interestsLoaded) {
      setLoadingPeers(true);
      return () => {
        cancelled = true;
      };
    }
    const run = async () => {
      setLoadingPeers(true);
      try {
        let interestId: number | undefined;
        if (selectedFilter !== "all") {
          const id = interestIdByName[selectedFilter];
          if (id != null && Number.isFinite(id)) interestId = id;
        }
        const rows = await getFreePeriodMatches(interestId);
        if (cancelled) return;
        let peers = mapFreePeriodUsersToPeers(rows).filter((p) => p.userId !== user.id);
        if (
          selectedFilter !== "all" &&
          (interestId === undefined || interestIdByName[selectedFilter] == null)
        ) {
          peers = peers.filter((p) => p.hobbies.includes(selectedFilter));
        }
        setBackendPeers(peers);
      } catch {
        if (!cancelled) setBackendPeers([]);
      } finally {
        if (!cancelled) setLoadingPeers(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isDemoUser, selectedFilter, interestIdByName, interestsLoaded]);

  const matchQueue = useMemo(() => {
    if (!isDemoUser && user?.id) {
      return backendPeers.filter((p) => !dismissedIds.has(p.id));
    }
    const filter: "all" | string = selectedFilter === "all" ? "all" : selectedFilter;
    return getPeersForMatchingTab(userHobbies, filter, now, user?.id).filter(
      (p) => !dismissedIds.has(p.id)
    );
  }, [isDemoUser, user?.id, backendPeers, dismissedIds, userHobbies, selectedFilter, now]);

  const currentCard = matchQueue[0];

  const currentCardIntro = useMemo(
    () => (currentCard ? peerCardIntro(currentCard) : ""),
    [currentCard]
  );

  useEffect(() => {
    setDismissedIds(new Set());
  }, [selectedFilter, userHobbies, myInterests]);

  useEffect(() => {
    if (selectedFilter === "all") return;
    if (isDemoUser) {
      if (!userHobbies.includes(selectedFilter)) setSelectedFilter("all");
    } else {
      if (!myInterests.some((i) => i.name === selectedFilter)) setSelectedFilter("all");
    }
  }, [userHobbies, myInterests, selectedFilter, isDemoUser]);

  const filterChips = useMemo(() => {
    const chips: { id: "all" | string; label: string }[] = [{ id: "all", label: "전체" }];
    if (isDemoUser || !user?.id) {
      userHobbies.forEach((h) => chips.push({ id: h, label: h }));
    } else {
      myInterests.forEach((i) => chips.push({ id: i.name, label: i.name }));
    }
    return chips;
  }, [isDemoUser, user?.id, userHobbies, myInterests]);

  /** 실계정: 칩·매칭률은 API 관심사 기준, 데모는 프로필 취미 */
  const viewerInterestNames = useMemo(() => {
    if (isDemoUser) return userHobbies;
    const names = myInterests.map((i) => i.name);
    return names.length > 0 ? names : userHobbies;
  }, [isDemoUser, myInterests, userHobbies]);

  const highlightInterestSet = useMemo(
    () => new Set(viewerInterestNames),
    [viewerInterestNames]
  );

  const handleReject = useCallback(() => {
    if (!currentCard) return;
    setShowResult("reject");
    setDismissedIds((prev) => new Set([...prev, currentCard.id]));
    window.setTimeout(() => setShowResult(null), 800);
  }, [currentCard]);

  const sendMessageToPeer = useCallback(
    (peer: FreeSlotPeer) => {
      void (async () => {
        try {
          const roomId = await openDmFromFreeSlotPeer(peer);
          if (roomId) {
            setAcceptedMatches((prev) => [...prev, { card: peer, roomId }]);
          }
        } finally {
          setShowResult("accept");
          setDismissedIds((prev) => new Set([...prev, peer.id]));
          window.setTimeout(() => setShowResult(null), 800);
        }
      })();
    },
    [openDmFromFreeSlotPeer]
  );

  const handleSendMessage = useCallback(() => {
    if (!currentCard) return;
    sendMessageToPeer(currentCard);
  }, [currentCard, sendMessageToPeer]);

  const totalInFilter = useMemo(
    () => {
      if (!isDemoUser && user?.id) return backendPeers.length;
      return getPeersForMatchingTab(
        userHobbies,
        selectedFilter === "all" ? "all" : selectedFilter,
        now,
        user?.id
      ).length;
    },
    [isDemoUser, user?.id, backendPeers.length, userHobbies, selectedFilter, now]
  );

  const noneAvailable = totalInFilter === 0;

  return (
    <div className="min-h-screen bg-gray-50 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
      <div className="bg-white border-b border-gray-100 px-5 py-4">
        <h1 className="text-2xl font-bold text-gray-800">공강 매칭</h1>
        <p className="text-sm text-gray-500">
          시간표 기준 겹치는 공강이 있는 쿠옹이예요. 취미 칩으로 관심사를 좁힐 수 있어요.
        </p>
      </div>

      <div className="px-5 py-5">
        {((isDemoUser && userHobbies.length === 0) ||
          (!isDemoUser && interestsLoaded && myInterests.length === 0)) && (
          <div className="mb-4 rounded-2xl border-2 border-amber-200 bg-[#FDF5E6] px-4 py-3 text-sm text-gray-700">
            <p className="font-semibold text-[#A71930] mb-1">취미·관심사를 추가해 주세요</p>
            <p className="text-xs text-gray-600 mb-2">
              마이페이지에서 관심사를 등록하면 여기 필터와 공강 매칭에 반영됩니다.
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

        {loadingPeers && !isDemoUser ? (
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center text-sm text-gray-500">
            매칭 목록 불러오는 중...
          </div>
        ) : (isDemoUser ? userHobbies.length > 0 : true) && currentCard ? (
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
                      {peerCardHeadline(currentCard)}
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
                <p className="text-base text-gray-800 text-center leading-relaxed whitespace-pre-wrap break-words">
                  {currentCardIntro ? (
                    <>{currentCardIntro}</>
                  ) : (
                    <span className="text-gray-500 font-medium">
                      아직 등록된 소개글이 없어요
                    </span>
                  )}
                </p>
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <span className="text-2xl">📍</span>
                  <span className="text-sm">{currentCard.location}</span>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {currentCard.hobbies.map((h) => (
                    <span
                      key={h}
                      className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                        highlightInterestSet.has(h) ? "ring-2 ring-[#E6A620]/60" : ""
                      }`}
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
        ) : (isDemoUser ? userHobbies.length > 0 : true) ? (
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
            <div className="text-7xl mb-4">🦁</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {noneAvailable ? "조건에 맞는 쿠옹이가 없어요" : "모든 카드를 확인했어요"}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {noneAvailable
                ? "겹치는 공강이 있는 쿠옹이가 없거나, 다른 필터를 눌러 보세요."
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
                        {peerCardHeadline(card)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {peerCardIntro(card) || peerCardQuote(card) || "공강 매칭"}
                      </p>
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
        viewerHobbies={!isDemoUser ? viewerInterestNames : undefined}
        onSendMessage={() => {
          const peer = profilePeer;
          setProfileDialogOpen(false);
          if (peer) sendMessageToPeer(peer);
        }}
        onRequestMatch={() => setProfileDialogOpen(false)}
        user={
          profilePeer
            ? {
                department: profilePeer.department,
                name: profilePeer.name,
                year: profilePeer.year,
                todayQuestion: profilePeer.todayQuestion,
                activity: profilePeer.activity,
                hobbies: profilePeer.hobbies,
                bio: profilePeer.bio,
                matchingRate: profilePeer.matchingRate,
              }
            : undefined
        }
      />
    </div>
  );
}
