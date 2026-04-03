import { BookOpen, Clock, Users, MessageCircle, Footprints, BookOpen as BookIcon, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { LionAvatar } from "../components/LionAvatar";
import { UserProfileDialog } from "../components/UserProfileDialog";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useClassChat } from "../context/ClassChatContext";
import { useDmUnreadCount } from "../hooks/useDmUnreadCount";
import { useTimetable } from "../context/TimetableContext";
import {
  getCourseIdsInGroup,
  getLatestChatPreviewContent,
  groupCoursesBySubject,
} from "../utils/courseGroups";
import { getCourseListenerCount } from "../utils/courseListenerCount";
import { getFreePeriodMatches, mapFreePeriodUsersToPeers } from "../api/matchingApi";
import {
  peerCardHeadline,
  peerCardQuote,
  peerHomeFreePillText,
  type FreeSlotPeer,
} from "../mocks/freeSlotPeers";
import { resolveViewerHobbies } from "../utils/resolveViewerHobbies";
import { useOpenDmFromFreeSlotPeer } from "../hooks/useOpenDmFromFreeSlotPeer";

export function HomePage() {
  const [timeKey, setTimeKey] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTimeKey((k) => k + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(), [timeKey]);
  const currentTime = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const { user } = useAuth();
  const { profile } = useProfile();
  const homeNickname = useMemo(() => {
    const n = profile?.nickname?.trim() || user?.nickname?.trim();
    return n || "쿠옹이";
  }, [profile?.nickname, user?.nickname]);
  const viewerHobbies = useMemo(() => resolveViewerHobbies(profile), [profile]);
  const { openDmFromFreeSlotPeer } = useOpenDmFromFreeSlotPeer();
  const { courses } = useTimetable();
  const { getVisibleMessages } = useClassChat();
  const dmUnread = useDmUnreadCount(user?.id);
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FreeSlotPeer | undefined>(undefined);
  const [apiFreeNowPeers, setApiFreeNowPeers] = useState<FreeSlotPeer[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setApiFreeNowPeers([]);
      return;
    }
    let cancelled = false;
    void getFreePeriodMatches()
      .then((rows) => {
        if (cancelled) return;
        const mapped = mapFreePeriodUsersToPeers(rows);
        const self = user.id;
        setApiFreeNowPeers(mapped.filter((p) => p.userId !== self));
      })
      .catch(() => {
        if (!cancelled) setApiFreeNowPeers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, timeKey]);

  const freeNowPeers = useMemo(() => {
    if (!user?.id) return [];
    return apiFreeNowPeers;
  }, [user?.id, apiFreeNowPeers]);

  const handleUserClick = (mate: FreeSlotPeer) => {
    setSelectedUser(mate);
    setProfileDialogOpen(true);
  };

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [courses]
  );
  const nextCourse = sortedCourses[0];
  const courseGroups = useMemo(() => groupCoursesBySubject(courses), [courses]);

  return (
    <div className="min-h-screen bg-gray-50 pb-6 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#A71930" }}>
          🦁 오늘의 쿠넥트
        </h1>
        <p className="text-sm text-gray-500">좋은 하루 되세요, {homeNickname}님!</p>
      </div>

      {/* Main Content */}
      <div className="px-5 py-5 space-y-5">
        {user && dmUnread > 0 && (
          <Link
            to="/home/chat"
            className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border-2 shadow-sm transition-colors hover:opacity-95 active:scale-[0.99]"
            style={{ backgroundColor: "#FDF5E6", borderColor: "#A71930" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <MessageCircle className="w-6 h-6" style={{ color: "#A71930" }} />
                <span className="absolute -top-1.5 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-[#A71930] text-white text-[11px] font-bold flex items-center justify-center border-2 border-white">
                  {dmUnread > 99 ? "99+" : dmUnread}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">1:1 채팅</p>
                <p className="text-xs text-gray-600">
                  확인하지 않은 메시지 <span className="font-semibold text-[#A71930]">{dmUnread}</span>개
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 flex-shrink-0 text-gray-400" />
          </Link>
        )}

        {/* Time Card - 현재 시간과 다음 수업 */}
        <div 
          className="rounded-2xl p-5 shadow-sm border-2"
          style={{ backgroundColor: "#FDF5E6", borderColor: "#E6A620" }}
        >
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 mt-0.5 flex-shrink-0" style={{ color: "#A71930" }} />
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">현재 시각: {currentTime}</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: "#A71930", color: "white" }}>
                  다음 수업
                </span>
              </div>
              {nextCourse ? (
                <>
                  <p className="font-bold text-base" style={{ color: "#A71930" }}>
                    {nextCourse.name}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {nextCourse.startTime} · {nextCourse.location}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600 mt-1">오늘 예정된 수업이 없어요</p>
              )}
            </div>
          </div>
        </div>

        {/* 수업 라운지 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <BookIcon className="w-6 h-6" style={{ color: "#A71930" }} />
            <h2 className="text-lg font-bold text-gray-800">수업 라운지</h2>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {courseGroups.map((group) => {
              const ids = getCourseIdsInGroup(group);
              const previewText = getLatestChatPreviewContent(getVisibleMessages, ids);
              const routeId = group.slots[0]?.serverCourseId
                ? `course-${group.slots[0].serverCourseId}`
                : group.representativeId;

              return (
              <Link
                key={group.representativeId}
                to={`/home/class/${routeId}`}
                className="block p-4 rounded-xl border-2 border-gray-100 hover:border-[#E6A620] transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm mb-1 truncate">
                      {group.name}
                    </h3>
                    <p className="text-xs text-gray-500">{group.professor} 교수님</p>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 flex-shrink-0 ml-2">
                    <Users className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs font-bold text-green-600">
                      {getCourseListenerCount(group.slots[0])}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 mb-2">
                  {group.slots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#A71930" }} />
                      <span>
                        {slot.days.join("·")} {slot.startTime}-{slot.endTime}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#E6A620" }} />
                  <span className="truncate">{group.slots[0]?.location}</span>
                </div>
                <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                  <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#A71930" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 mb-0.5">최근 메시지</p>
                    <p className="text-xs text-gray-700 line-clamp-2 leading-snug">{previewText}</p>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </div>

        {/* 공강 메이트 - 시간표 겹침 기준 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Footprints className="w-6 h-6" style={{ color: "#E6A620" }} />
              <h3 className="text-lg font-bold text-gray-800">공강이 겹치는 쿠옹이들</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: "#FDF5E6" }}>
              <Users className="w-4 h-4" style={{ color: "#E6A620" }} />
              <span className="text-sm font-bold" style={{ color: "#A71930" }}>{freeNowPeers.length}명</span>
            </div>
          </div>
          
          <div className="space-y-3 max-h-[min(520px,70vh)] overflow-y-auto pr-1">
            {freeNowPeers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                시간표 기준으로 겹치는 공강이 있는 쿠옹이가 없어요. 잠시 후 다시 확인해 보세요!
              </p>
            ) : (
              freeNowPeers.map((mate) => {
                const freePill = peerHomeFreePillText(mate, now);
                return (
                <div
                  key={mate.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100"
                  onClick={() => handleUserClick(mate)}
                >
                  <LionAvatar department={mate.department} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">
                      {mate.department} 쿠옹이
                    </p>
                    <p className="text-xs text-gray-500 truncate">{mate.activity}</p>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 max-w-[min(52vw,200px)] text-center truncate"
                    style={{ backgroundColor: "#FFF5E6", color: "#F2994A" }}
                    title={freePill}
                  >
                    {freePill}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/home/matching"
            className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100 hover:border-[#A71930] transition-all"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FDF5E6" }}>
                <Users className="w-7 h-7" style={{ color: "#A71930" }} />
              </div>
              <span className="text-sm font-bold text-gray-800">공강 매칭</span>
              <p className="text-xs text-gray-500">취미 쿠옹이 찾기</p>
            </div>
          </Link>

          <Link
            to="/home/class-matching"
            className="bg-white rounded-2xl p-5 shadow-sm border-2 border-gray-100 hover:border-[#E6A620] transition-all"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FDF5E6" }}>
                <BookIcon className="w-7 h-7" style={{ color: "#E6A620" }} />
              </div>
              <span className="text-sm font-bold text-gray-800">수업 매칭</span>
              <p className="text-xs text-gray-500">같은 수업 찾기</p>
            </div>
          </Link>
        </div>
      </div>

      <UserProfileDialog
        isOpen={isProfileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        viewerHobbies={user?.id ? viewerHobbies : undefined}
        onSendMessage={() => {
          const peer = selectedUser;
          setProfileDialogOpen(false);
          if (peer) void openDmFromFreeSlotPeer(peer);
        }}
        showOutlineCloseButton
        user={
          selectedUser
            ? {
                department: selectedUser.department,
                name: selectedUser.name,
                year: selectedUser.year,
                todayQuestion: selectedUser.todayQuestion,
                activity: selectedUser.activity,
                hobbies: selectedUser.hobbies,
                bio: selectedUser.bio,
                matchingRate: selectedUser.matchingRate,
              }
            : undefined
        }
      />
    </div>
  );
}