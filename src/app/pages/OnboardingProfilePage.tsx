import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useProfile, type Profile } from "../context/ProfileContext";
import { PageContainer } from "../components/PageContainer";
import { completeSignup } from "../api/userApi";
import { ApiError } from "../api/client";

const departments = [
  "기계공학과",
  "산업경영공학과",
  "원자력공학과",
  "화학공학과",
  "정보전자신소재공학과",
  "사회기반시스템공학과",
  "건축공학과",
  "환경학및환경공학과",
  "건축학과",
  "전자공학과",
  "생체공학과",
  "반도체공학과",
  "컴퓨터공학과",
  "소프트웨어융합학과",
  "인공지능학과",
  "응용수학과",
  "응용물리학과",
  "응용화학과",
  "우주과학과",
  "유전생명공학과",
  "식품생명공학과",
  "한방생명공학과",
  "식물·환경신소재공학과",
  "스마트팜과학과",
  "국제학과",
  "프랑스어학과",
  "스페인어학과",
  "러시아어학과",
  "중국어학과",
  "일본어학과",
  "한국어학과",
  "영미어문학과",
  "영미문화학과",
  "글로벌커뮤니케이션학부",
  "산업디자인학과",
  "시각디자인학과",
  "환경조경디자인학과",
  "의류디자인학과",
  "디지털콘텐츠학과",
  "도예학과",
  "회화과",
  "조소과",
  "포스트모던음악학과",
  "체육학과",
  "스포츠지도학과",
  "스포츠의학학과",
  "골프산업학과",
  "태권도학과",
];

export function OnboardingProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, draftProfile, commitProfile } = useProfile();
  const [nickname, setNickname] = useState("");
  const [department, setDepartment] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [showDepartmentList, setShowDepartmentList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isValidNickname = (value: string) => /^[A-Za-z0-9가-힣_]{2,20}$/.test(value.trim());
  const isValidMajor = (value: string) => value.trim().length >= 2 && value.trim().length <= 50;

  // 이미 저장된 프로필이 있으면 폼 초기값으로 사용
  useEffect(() => {
    const source = draftProfile ?? profile;
    if (source) {
      setNickname(source.nickname ?? "");
      setDepartment(source.department ?? "");
      setStudentNumber(source.studentNumber ?? "");
    } else if (user) {
      setNickname(user.nickname ?? "");
      setDepartment(user.department ?? "");
      setStudentNumber("");
    }
  }, [draftProfile, profile, user]);

  const filteredDepartments = departments.filter(dept => 
    dept.includes(searchTerm)
  );

  const handleNext = async () => {
    if (!nickname || !department || !studentNumber) return;
    if (!user?.id) {
      setSubmitError("로그인이 필요합니다.");
      return;
    }
    if (!/^\d{10}$/.test(studentNumber)) {
      setSubmitError("학번은 숫자 10자리로 입력해주세요.");
      return;
    }
    if (!isValidNickname(nickname)) {
      setSubmitError("닉네임은 2~20자, 한글/영문/숫자/_만 입력할 수 있어요.");
      return;
    }
    if (!isValidMajor(department)) {
      setSubmitError("전공은 2~50자로 입력해주세요.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    const base: Profile =
      draftProfile ??
      profile ??
      ({
        id: user?.id ?? "mock-user-1",
        email: user?.email ?? "student@khu.ac.kr",
        nickname: "",
        department: "",
        grade: "",
      } as Profile);

    const updated: Profile = {
      ...base,
      nickname,
      department,
      studentNumber,
      grade: `${studentNumber.slice(0, 2)}학번`,
    };

    try {
      await completeSignup({
        nickname,
        major: department,
        studentNumber,
      });
      commitProfile(updated);
      navigate("/onboarding");
    } catch (e) {
      if (e instanceof ApiError) {
        const fieldReason = e.payload?.fieldErrors?.[0]?.reason;
        setSubmitError(fieldReason ?? e.message);
      } else {
        setSubmitError("프로필 저장 중 오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    isValidNickname(nickname) && isValidMajor(department) && /^\d{10}$/.test(studentNumber);

  return (
    <PageContainer>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold" style={{ color: "#A71930" }}>
          프로필 설정
        </h1>
        <p className="text-sm text-gray-500 mt-1">쿠옹이 정보를 입력해주세요</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-5 py-6 space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: "#A71930" }}>
            1
          </div>
          <div className="w-8 h-1 rounded-full bg-gray-200"></div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-gray-200 text-gray-400">
            2
          </div>
        </div>

        {/* Lion Character */}
        <div className="flex justify-center mb-6">
          <div className="text-[100px] leading-none" style={{ filter: "drop-shadow(0 4px 20px rgba(167, 25, 48, 0.15))" }}>
            🦁
          </div>
        </div>

        {/* Nickname Input */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            닉네임
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="쿠옹이123"
            maxLength={20}
            className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-[#A71930] focus:outline-none transition-colors"
          />
          <p className="text-xs text-gray-500">2~20자, 한글/영문/숫자/_만 입력 가능합니다</p>
        </div>

        {/* Department Select */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            전공
          </label>
          <div className="relative">
            <button
              onClick={() => {
                setShowDepartmentList(!showDepartmentList);
              }}
              className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-[#A71930] transition-colors flex items-center justify-between bg-white"
            >
              <span className={department ? "text-gray-800" : "text-gray-400"}>
                {department || "전공을 선택해주세요"}
              </span>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showDepartmentList ? "rotate-90" : ""}`} />
            </button>

            {showDepartmentList && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-80 overflow-hidden z-20">
                <div className="sticky top-0 bg-white p-3 border-b border-gray-100">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="전공 검색..."
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-[#A71930] focus:outline-none text-sm"
                  />
                </div>
                <div className="overflow-y-auto max-h-60">
                  {filteredDepartments.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => {
                        setDepartment(dept);
                        setShowDepartmentList(false);
                        setSearchTerm("");
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm border-b border-gray-50 last:border-b-0"
                    >
                      {dept}
                    </button>
                  ))}
                  {filteredDepartments.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Student Number Input */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            학번
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={studentNumber}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
              setStudentNumber(onlyDigits);
            }}
            placeholder="예: 2026123456"
            maxLength={10}
            className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-[#A71930] focus:outline-none transition-colors"
          />
          <p className="text-xs text-gray-500">숫자 10자리로 입력해주세요.</p>
        </div>
        {submitError && (
          <p className="text-sm text-red-600 text-center">{submitError}</p>
        )}
      </div>

      {/* Bottom Button */}
      <div className="p-5 bg-white border-t border-gray-200">
        <button
          onClick={handleNext}
          disabled={!isFormValid || submitting}
          className="w-full h-14 text-white font-bold rounded-2xl text-base shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          style={{ backgroundColor: "#A71930" }}
        >
          {submitting ? "저장 중..." : "다음"}
        </button>
      </div>
    </PageContainer>
  );
}
