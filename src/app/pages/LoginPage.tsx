import { ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PageContainer } from "../components/PageContainer";
import { getGoogleLoginStartUrl } from "../utils/backendAuth";

export function LoginPage() {
  const { logout, isAuthenticated, user } = useAuth();

  const handleMainLogin = () => {
    const url = getGoogleLoginStartUrl();
    console.log("[auth] login start redirect", { url });
    window.location.href = url;
  };

  return (
    <PageContainer className="items-center justify-between px-6 py-8">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="mb-6 text-center animate-bounce-slow">
          <div
            className="text-[140px] leading-none mb-4"
            style={{
              filter: "drop-shadow(0 4px 20px rgba(167, 25, 48, 0.15))",
            }}
          >
            🦁
          </div>
        </div>

        <h1 className="text-5xl font-bold mb-3" style={{ color: "#A71930" }}>
          쿠넥트
        </h1>

        <p className="text-sm font-semibold mb-2" style={{ color: "#E6A620" }}>
          KHU-nect
        </p>

        <p className="text-sm text-gray-400 mb-8 text-center px-4 leading-relaxed">
          강의실에서 공강까지, 경희대를 잇다.
        </p>

        <div className="w-full space-y-2 mb-6">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <ChevronRight className="w-3 h-3" style={{ color: "#A71930" }} />
            <span>수업별 익명 채팅방</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <ChevronRight className="w-3 h-3" style={{ color: "#A71930" }} />
            <span>공강 메이트 매칭</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <ChevronRight className="w-3 h-3" style={{ color: "#A71930" }} />
            <span>쿠옹이 아바타 꾸미기</span>
          </div>
        </div>
      </div>

      <div className="w-full space-y-4 mb-6">
        {isAuthenticated && user && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-600 truncate">
              로그인: <span className="font-semibold text-gray-800">{user.email}</span>
            </p>
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-1 shrink-0 text-xs font-semibold text-[#A71930]"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleMainLogin}
          className="w-full h-14 text-white font-bold rounded-2xl text-base shadow-lg transition-all active:scale-95 hover:shadow-xl"
          style={{ backgroundColor: "#A71930" }}
        >
          경희대학교 이메일로 시작하기
        </button>

        <p className="text-center text-xs text-gray-400 mt-2">
          경희대학교 재학생만 이용 가능합니다
        </p>
      </div>

      <div className="text-center text-xs text-gray-400 pb-2">
        <p>© 2026 쿠넥트 KHU-nect. All rights reserved.</p>
      </div>
    </PageContainer>
  );
}
