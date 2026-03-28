import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, Sparkles } from "lucide-react";
import { PageContainer } from "../components/PageContainer";

export function OnboardingCompletePage() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // 애니메이션을 위한 딜레이
    setTimeout(() => setShowContent(true), 100);

    // 3초 후 자동으로 홈으로 이동
    const timer = setTimeout(() => {
      navigate("/home");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <PageContainer className="items-center justify-center px-5 bg-gradient-to-b from-white to-[#FDF5E6]">
      <div
        className={`text-center transition-all duration-700 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Success Icon */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-32 h-32 rounded-full animate-pulse"
              style={{ backgroundColor: "#FDF5E6" }}
            />
          </div>
          <div className="relative flex items-center justify-center">
            <CheckCircle2
              className="w-32 h-32 animate-bounce"
              style={{ color: "#A71930" }}
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Lion Emoji */}
        <div className="text-7xl mb-6 animate-bounce">🦁</div>

        {/* Success Message */}
        <h1
          className="text-3xl font-bold mb-4"
          style={{ color: "#A71930" }}
        >
          시간표 등록 완료!
        </h1>

        <p className="text-base text-gray-600 mb-2">
          이제 쿠넥트의 모든 기능을 사용할 수 있어요
        </p>

        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="w-5 h-5" style={{ color: "#E6A620" }} />
          <p className="text-sm" style={{ color: "#E6A620" }}>
            곧 홈 화면으로 이동합니다
          </p>
          <Sparkles className="w-5 h-5" style={{ color: "#E6A620" }} />
        </div>

        {/* Features Preview */}
        <div className="space-y-3 mb-8">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border-2"
            style={{ borderColor: "#E6A620", backgroundColor: "#FDF5E6" }}
          >
            <span className="text-2xl">💬</span>
            <span className="text-sm font-medium text-gray-700">
              수업별 익명 채팅
            </span>
          </div>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border-2"
            style={{ borderColor: "#E6A620", backgroundColor: "#FDF5E6" }}
          >
            <span className="text-2xl">🤝</span>
            <span className="text-sm font-medium text-gray-700">
              공강 시간 매칭
            </span>
          </div>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border-2"
            style={{ borderColor: "#E6A620", backgroundColor: "#FDF5E6" }}
          >
            <span className="text-2xl">🎨</span>
            <span className="text-sm font-medium text-gray-700">
              나만의 쿠옹이 꾸미기
            </span>
          </div>
        </div>

        {/* Skip Button */}
        <button
          onClick={() => navigate("/home")}
          className="text-sm text-gray-500 underline hover:text-gray-700 active:text-gray-900"
        >
          바로 시작하기
        </button>
      </div>

      {/* Loading dots */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-center gap-2">
        <div
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ backgroundColor: "#A71930", animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ backgroundColor: "#E6A620", animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ backgroundColor: "#A71930", animationDelay: "300ms" }}
        />
      </div>
    </PageContainer>
  );
}
