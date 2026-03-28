import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useProfile, type Profile } from "../context/ProfileContext";
import { PageContainer } from "../components/PageContainer";

const departments = [
  "국어국문학과",
  "영어영문학과",
  "사학과",
  "철학과",
  "경영학과",
  "회계·세무학과",
  "경제학과",
  "국제통상·금융투자학과",
  "컴퓨터공학과",
  "소프트웨어융합학과",
  "전자공학과",
  "정보디스플레이학과",
  "생체의공학과",
  "산업경영공학과",
  "건축학과",
  "건축공학과",
  "화학공학과",
  "생명공학과",
  "한의예과",
  "한의학과",
  "간호학과",
  "약학과",
  "의예과",
  "의학과",
  "치의예과",
  "치의학과",
  "예술디자인대학",
  "도예학과",
  "환경조경디자인학과",
  "의류디자인학과",
  "시각디자인학과",
  "산업디자인학과",
  "무용학부",
  "체육학과",
  "태권도학과",
  "스포츠의학과",
  "골프산업학과",
  "국제학과",
  "한국어학과",
  "응용영어통번역학과",
  "글로벌커뮤니케이션학부",
  "정치외교학과",
  "행정학과",
  "사회학과",
  "미디어학과",
  "경영학부",
];

const grades = ["20학번", "21학번", "22학번", "23학번", "24학번", "25학번", "26학번"];

export function OnboardingProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, draftProfile, commitProfile } = useProfile();
  const [nickname, setNickname] = useState("");
  const [department, setDepartment] = useState("");
  const [grade, setGrade] = useState("");
  const [showDepartmentList, setShowDepartmentList] = useState(false);
  const [showGradeList, setShowGradeList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 이미 저장된 프로필이 있으면 폼 초기값으로 사용
  useEffect(() => {
    const source = draftProfile ?? profile;
    if (source) {
      setNickname(source.nickname ?? "");
      setDepartment(source.department ?? "");
      setGrade(source.grade ?? "");
    } else if (user) {
      setNickname(user.nickname ?? "");
      setDepartment(user.department ?? "");
      setGrade(user.grade ?? "");
    }
  }, [draftProfile, profile, user]);

  const filteredDepartments = departments.filter(dept => 
    dept.includes(searchTerm)
  );

  const handleNext = () => {
    if (!nickname || !department || !grade) return;

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
      grade,
    };

    commitProfile(updated);
    navigate("/onboarding");
  };

  const isFormValid = nickname.trim() !== "" && department !== "" && grade !== "";

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
            maxLength={12}
            className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-[#A71930] focus:outline-none transition-colors"
          />
          <p className="text-xs text-gray-500">최대 12자까지 입력 가능합니다</p>
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
                setShowGradeList(false);
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

        {/* Grade Select */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            학번
          </label>
          <div className="relative">
            <button
              onClick={() => {
                setShowGradeList(!showGradeList);
                setShowDepartmentList(false);
              }}
              className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-[#A71930] transition-colors flex items-center justify-between bg-white"
            >
              <span className={grade ? "text-gray-800" : "text-gray-400"}>
                {grade || "학번을 선택해주세요"}
              </span>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showGradeList ? "rotate-90" : ""}`} />
            </button>

            {showGradeList && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-20">
                {grades.map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      setGrade(g);
                      setShowGradeList(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm border-b border-gray-50 last:border-b-0"
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="p-5 bg-white border-t border-gray-200">
        <button
          onClick={handleNext}
          disabled={!isFormValid}
          className="w-full h-14 text-white font-bold rounded-2xl text-base shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          style={{ backgroundColor: "#A71930" }}
        >
          다음
        </button>
      </div>
    </PageContainer>
  );
}
