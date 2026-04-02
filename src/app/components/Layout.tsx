import { Outlet, useLocation, Link, useNavigate } from "react-router";
import { Home, BookOpen, Users, User, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useDmChat } from "../context/DmChatContext";
import { useDmUnreadCount } from "../hooks/useDmUnreadCount";
import { useProfile } from "../context/ProfileContext";
import { useTimetable } from "../context/TimetableContext";
import { getStoredProfile } from "../utils/profileStorage";
import { getMatchAlertForUser } from "../utils/matchAlertStorage";
import { useEffect, useMemo } from "react";
import { MatchSuccessModal } from "./MatchSuccessModal";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { profile, isProfileReady } = useProfile();
  const { courses, isTimetableReady } = useTimetable();
  const { dismissMatchAlert, inboxRevision } = useDmChat();
  const isOnboarding = location.pathname === "/onboarding" || location.pathname === "/onboarding-profile";

  const matchAlert = useMemo(() => {
    if (!user?.id) return null;
    return getMatchAlertForUser(user.id);
  }, [user?.id, inboxRevision]);

  const chatUnread = useDmUnreadCount(user?.id);

  const effectiveProfile = useMemo(
    () => profile ?? (user ? getStoredProfile(user) : null),
    [profile, user]
  );

  // 온보딩을 끝내지 않은 사용자는 /home 진입 시 온보딩으로 유도
  useEffect(() => {
    if (!isProfileReady || !isTimetableReady) return;
    if (location.pathname.startsWith("/home")) {
      if (!isAuthenticated || !user?.id) {
        navigate("/", { replace: true });
      } else if (!effectiveProfile) {
        navigate("/onboarding-profile", { replace: true });
      } else if (!courses.length) {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [
    location.pathname,
    effectiveProfile,
    courses.length,
    navigate,
    isProfileReady,
    isTimetableReady,
    isAuthenticated,
    user?.id,
  ]);

  const navItems = [
    { path: "/home/classes", icon: BookOpen, label: "수업" },
    { path: "/home/chat", icon: MessageCircle, label: "채팅" },
    { path: "/home", icon: Home, label: "홈" },
    { path: "/home/matching", icon: Users, label: "공강매칭" },
    { path: "/home/mypage", icon: User, label: "마이페이지" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md md:max-w-2xl lg:max-w-3xl mx-auto relative">
      <MatchSuccessModal
        open={Boolean(user?.id && matchAlert)}
        peerLabel={matchAlert?.peerLabel ?? ""}
        onClose={() => user?.id && dismissMatchAlert(user.id)}
        onGoToChat={() => {
          if (!user?.id || !matchAlert) return;
          const roomId = matchAlert.roomId;
          dismissMatchAlert(user.id);
          navigate(`/home/chat?dm=${encodeURIComponent(roomId)}`);
        }}
      />

      {/* Main Content */}
      <main className={`flex-1 ${!isOnboarding ? "pb-20" : ""}`}>
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      {!isOnboarding && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-bottom max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
          <div className="flex items-center justify-around h-16 px-2 relative">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path || 
                (path === "/home/classes" && location.pathname.startsWith("/home/class")) ||
                (path === "/home/chat" && location.pathname.startsWith("/home/chat"));
              
              const isHome = path === "/home";
              const showChatBadge = path === "/home/chat" && chatUnread > 0;

              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex flex-col items-center justify-center gap-1 transition-all min-w-0 flex-1 ${
                    isHome ? "relative" : "px-3 py-2 rounded-lg relative"
                  }`}
                  style={{
                    color: isActive && !isHome ? "#A71930" : "#9CA3AF",
                  }}
                >
                  {isHome ? (
                    <>
                      {/* 홈 버튼 - 특별 스타일 */}
                      <div 
                        className="absolute -top-7 flex flex-col items-center justify-center"
                      >
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                          style={{
                            background: isActive 
                              ? "linear-gradient(135deg, #A71930 0%, #8B1526 100%)" 
                              : "linear-gradient(135deg, #E6A620 0%, #D4941C 100%)"
                          }}
                        >
                          <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-semibold mt-1" style={{ color: isActive ? "#A71930" : "#E6A620" }}>
                          {label}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="relative inline-flex">
                        <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                        {showChatBadge && (
                          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#A71930] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white leading-none">
                            {chatUnread > 99 ? "99+" : chatUnread}
                          </span>
                        )}
                      </span>
                      <span className={`text-xs ${isActive ? "font-semibold" : ""}`}>
                        {label}
                      </span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}