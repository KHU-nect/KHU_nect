import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { ArrowLeft, BookOpen, Filter, MessageCircle, Users } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { LionAvatar } from "../components/LionAvatar";
import { UserProfileDialog } from "../components/UserProfileDialog";
import { useAuth } from "../context/AuthContext";
import { useDmChat } from "../context/DmChatContext";
import { useProfile } from "../context/ProfileContext";
import { useTimetable } from "../context/TimetableContext";
import {
  classMatchUserDtoToBackendRow,
  getClassMatches,
  acceptMatching,
  type ClassMatchMateRow,
} from "../api/matchingApi";
import { getMyInterests, type MyInterest } from "../api/interestApi";
import { acceptMatchPost } from "../api/matchPostApi";
import { firstSharedCourseId } from "../mocks/classMatchPeers";
import { resolveViewerHobbies } from "../utils/resolveViewerHobbies";

type BackendClassMate = ClassMatchMateRow;

export function ClassMatchingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { courses } = useTimetable();
  const {
    createRoomFromClassMatch,
    refreshServerRooms,
    prefetchDirectChatRoom,
    recordMatchSuccessAlert,
  } = useDmChat();
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BackendClassMate | undefined>(undefined);
  const [backendMates, setBackendMates] = useState<BackendClassMate[]>([]);
  const [loadingMates, setLoadingMates] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | string>("all");
  const [interestIdByName, setInterestIdByName] = useState<Record<string, number>>({});
  const [myInterests, setMyInterests] = useState<MyInterest[]>([]);
  const [interestsLoaded, setInterestsLoaded] = useState(false);

  const userHobbies = useMemo(() => resolveViewerHobbies(profile), [profile]);

  const filterChips = useMemo(() => {
    const chips: { id: "all" | string; label: string }[] = [{ id: "all", label: "전체" }];
    myInterests.forEach((i) => chips.push({ id: i.name, label: i.name }));
    return chips;
  }, [myInterests]);

  useEffect(() => {
    if (!user?.id) {
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
  }, [user?.id]);

  useEffect(() => {
    if (selectedFilter === "all") return;
    if (!myInterests.some((i) => i.name === selectedFilter)) setSelectedFilter("all");
  }, [myInterests, selectedFilter]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setBackendMates([]);
      setLoadingMates(false);
      return;
    }
    if (selectedFilter !== "all" && !interestsLoaded) {
      setLoadingMates(true);
      return () => {
        cancelled = true;
      };
    }
    const run = async () => {
      setLoadingMates(true);
      try {
        let interestId: number | undefined;
        if (selectedFilter !== "all") {
          const id = interestIdByName[selectedFilter];
          if (id != null && Number.isFinite(id)) interestId = id;
        }
        const rows = await getClassMatches(interestId);
        if (cancelled) return;
        let list = rows
          .map((d, i) => classMatchUserDtoToBackendRow(d, courses, i))
          .filter((m): m is BackendClassMate => m != null)
          .filter((m) => m.userId !== user.id);
        if (
          selectedFilter !== "all" &&
          (interestId === undefined || interestIdByName[selectedFilter] == null)
        ) {
          list = list.filter((m) => m.hobbies.includes(selectedFilter));
        }
        list.sort((a, b) => {
          if (b.sharedCount !== a.sharedCount) return b.sharedCount - a.sharedCount;
          return b.matchingRate - a.matchingRate;
        });
        setBackendMates(list);
      } catch {
        if (!cancelled) setBackendMates([]);
      } finally {
        if (!cancelled) setLoadingMates(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, selectedFilter, interestIdByName, interestsLoaded, courses]);

  const accepterLabel = useMemo(() => {
    const dept = profile?.department?.trim();
    return dept ? `${dept} 쿠옹이` : "쿠옹이";
  }, [profile?.department]);

  const handleUserClick = (mate: BackendClassMate) => {
    setSelectedUser(mate);
    setProfileDialogOpen(true);
  };

  const startClassMatchChat = useCallback(
    (mate: BackendClassMate) => {
      if (!user?.id) return;

      const numericUserId = /^\d+$/.test(mate.userId) ? Number(mate.userId) : NaN;

      const acceptWithLocal = () => {
        const sourceCourseId = firstSharedCourseId(courses, mate.sharedKeys);
        createRoomFromClassMatch({
          posterUserId: mate.userId,
          accepterUserId: user.id,
          posterLabel: mate.name,
          accepterLabel,
          sourceCourseId,
        });
      };

      void (async () => {
        try {
          if (mate.matchPostId != null) {
            const accepted = await acceptMatchPost(mate.matchPostId);
            await refreshServerRooms();
            const roomId = String(accepted.directChatRoomId);
            await prefetchDirectChatRoom(roomId);
            recordMatchSuccessAlert(user.id, roomId, mate.name);
            return;
          }
          if (Number.isFinite(numericUserId)) {
            const { directChatRoomId } = await acceptMatching(numericUserId);
            await refreshServerRooms();
            await prefetchDirectChatRoom(directChatRoomId);
            recordMatchSuccessAlert(user.id, directChatRoomId, mate.name);
            return;
          }
          acceptWithLocal();
        } catch {
          if (Number.isFinite(numericUserId)) {
            window.alert("채팅방을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
            return;
          }
          acceptWithLocal();
        }
      })();
    },
    [
      user?.id,
      courses,
      createRoomFromClassMatch,
      accepterLabel,
      refreshServerRooms,
      prefetchDirectChatRoom,
      recordMatchSuccessAlert,
    ]
  );

  const handleStartChat = useCallback(
    (e: MouseEvent<HTMLButtonElement>, mate: BackendClassMate) => {
      e.stopPropagation();
      startClassMatchChat(mate);
    },
    [startClassMatchChat]
  );

  return (
    <div className="min-h-screen bg-gray-50 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">수업 매칭</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              같은 수업 듣는 쿠옹이들을 만나보세요
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-0 px-4 py-5 space-y-4">
        {user?.id && interestsLoaded && myInterests.length === 0 && (
            <div className="rounded-2xl border-2 border-amber-200 bg-[#FDF5E6] px-4 py-3 text-sm text-gray-700">
              <p className="font-semibold text-[#A71930] mb-1">취미·관심사를 추가해 주세요</p>
              <p className="text-xs text-gray-600 mb-2">
                마이페이지에서 관심사를 등록하면 수업 매칭 필터와 API 질의에 반영됩니다.
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

        {user?.id && (
          <div className="flex gap-2 overflow-x-auto pb-2">
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
                    style={{ color: active ? "#E6A620" : "#6B7280" }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div
          className="rounded-2xl p-4 border-2"
          style={{ backgroundColor: "#FDF5E6", borderColor: "#E6A620" }}
        >
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#A71930" }} />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1" style={{ color: "#A71930" }}>
                내 시간표: {courses.length}개 수업
              </p>
              <p className="text-xs text-gray-600">
                같은 수업을 듣는 쿠옹이예요. 칩으로 취미가 맞는 쿠옹이를 발견해보세요!
              </p>
            </div>
          </div>
        </div>

        {loadingMates ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">수업 매칭 목록을 불러오는 중이에요.</p>
          </div>
        ) : user?.id && courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">시간표에 수업을 추가하면 매칭할 수 있어요.</p>
            <button
              type="button"
              onClick={() => navigate("/home/timetable")}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "#A71930" }}
            >
              시간표로 가기
            </button>
          </div>
        ) : backendMates.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">
              조건에 맞는 쿠옹이가 아직 없어요. 시간표·관심사 칩을 바꿔 보거나 나중에 다시 확인해 주세요.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <Users className="w-5 h-5" style={{ color: "#A71930" }} />
              <p className="text-sm font-semibold text-gray-700">
                {backendMates.length}명의 쿠옹이 발견!
              </p>
            </div>

            <div className="space-y-3">
              {backendMates.map((mate) => (
                <div
                  key={mate.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleUserClick(mate)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      handleUserClick(mate);
                    }
                  }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-[#E6A620] transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <LionAvatar department={mate.department} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 text-sm">{`${mate.department} 쿠옹이`}</h3>
                        <span className="text-xs text-gray-500">{mate.year}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{mate.bio}</p>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${mate.matchingRate}%`,
                              backgroundColor: mate.matchingRate >= 80 ? "#A71930" : "#E6A620",
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-bold"
                          style={{
                            color: mate.matchingRate >= 80 ? "#A71930" : "#E6A620",
                          }}
                        >
                          {mate.matchingRate}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-semibold text-gray-700">
                        공통 수업 {mate.sharedClasses.length}개
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {mate.sharedClasses.map((className, idx) => (
                        <div
                          key={`${mate.userId}-${idx}`}
                          className="text-xs text-gray-600 pl-2 py-1 border-l-2"
                          style={{ borderColor: "#E6A620" }}
                        >
                          {className}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!user?.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#A71930", color: "white" }}
                    onClick={(e) => handleStartChat(e, mate)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>대화하기</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <UserProfileDialog
        isOpen={isProfileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        viewerHobbies={user?.id ? userHobbies : undefined}
        onSendMessage={() => {
          const mate = selectedUser;
          setProfileDialogOpen(false);
          if (mate) startClassMatchChat(mate);
        }}
        showOutlineCloseButton
        user={
          selectedUser
            ? {
                department: selectedUser.department,
                name: selectedUser.name,
                year: selectedUser.year,
                hobbies: selectedUser.hobbies,
                bio: selectedUser.bio,
                matchingRate: selectedUser.matchingRate,
                todayQuestion: selectedUser.todayQuestion,
              }
            : undefined
        }
      />
    </div>
  );
}
