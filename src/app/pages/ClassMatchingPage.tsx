import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { ArrowLeft, BookOpen, Users, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { LionAvatar } from "../components/LionAvatar";
import { UserProfileDialog } from "../components/UserProfileDialog";
import { useAuth } from "../context/AuthContext";
import { useDmChat } from "../context/DmChatContext";
import { useProfile } from "../context/ProfileContext";
import { useTimetable } from "../context/TimetableContext";
import {
  computeClassMatches,
  firstSharedCourseId,
  isDemoAccountUserId,
  type ClassMatchComputed,
} from "../mocks/classMatchPeers";

export function ClassMatchingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { courses } = useTimetable();
  const { createRoomFromClassMatch } = useDmChat();
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClassMatchComputed | undefined>(undefined);

  const mates = useMemo(
    () => computeClassMatches(courses, { excludeUserId: user?.id }),
    [courses, user?.id]
  );

  const isDemoUser = isDemoAccountUserId(user?.id);

  const accepterLabel = useMemo(() => {
    const dept = profile?.department?.trim();
    return dept ? `${dept} 쿠옹이` : "쿠옹이";
  }, [profile?.department]);

  const handleUserClick = (mate: ClassMatchComputed) => {
    setSelectedUser(mate);
    setProfileDialogOpen(true);
  };

  const handleStartChat = useCallback(
    (e: MouseEvent<HTMLButtonElement>, mate: ClassMatchComputed) => {
      e.stopPropagation();
      if (!user?.id) return;
      const sourceCourseId = firstSharedCourseId(courses, mate.sharedKeys);
      createRoomFromClassMatch({
        posterUserId: mate.userId,
        accepterUserId: user.id,
        posterLabel: mate.name,
        accepterLabel,
        sourceCourseId,
      });
    },
    [user?.id, courses, createRoomFromClassMatch, accepterLabel]
  );

  return (
    <div className="min-h-screen bg-gray-50 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
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

      <div className="px-4 py-5 space-y-4">
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
                {isDemoUser
                  ? "데모 계정 5명끼리 같은 시드 시간표로 수업이 겹쳐요. 공통 수업이 많은 순으로 보여요."
                  : "수업 매칭 목록은 데모 계정(demo1~5@khu.ac.kr)으로 로그인하면 테스트할 수 있어요."}
              </p>
            </div>
          </div>
        </div>

        {!isDemoUser ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-600 leading-relaxed">
              수업 매칭은 데모 계정 5명으로만 표시됩니다.
              <br />
              마이페이지 등에서 demo1@khu.ac.kr ~ demo5@khu.ac.kr 로 전환해 보세요.
            </p>
          </div>
        ) : courses.length === 0 ? (
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
        ) : mates.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">지금은 공통 수업이 있는 다른 데모 쿠옹이가 없어요.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <Users className="w-5 h-5" style={{ color: "#A71930" }} />
              <p className="text-sm font-semibold text-gray-700">
                {mates.length}명의 쿠옹이 발견!
              </p>
            </div>

            <div className="space-y-3">
              {mates.map((mate) => (
                <div
                  key={mate.userId}
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
                        <h3 className="font-bold text-gray-800 text-sm">{mate.department}</h3>
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
        user={
          selectedUser
            ? {
                department: selectedUser.department,
                name: selectedUser.name,
                year: selectedUser.year,
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
