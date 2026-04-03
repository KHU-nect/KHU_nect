import {
  Settings,
  Award,
  Calendar,
  Users,
  ChevronRight,
  Mail,
  Bell,
  Shield,
  LogOut,
  ShoppingBag,
  Sparkles,
  Heart,
  X,
  Star,
  ThumbsUp,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { LionAvatar } from "../components/LionAvatar";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTimetable } from "../context/TimetableContext";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { DEFAULT_USER_HOBBIES } from "../mocks/freeSlotPeers";
import { addMyInterest, deleteMyInterest, getMyInterests } from "../api/interestApi";
import { ApiError } from "../api/client";
import { updateMyProfile } from "../api/userApi";
import { HOBBY_CATEGORY_OPTIONS, sanitizeHobbies } from "../constants/hobbyOptions";

interface ItemData {
  id: string;
  emoji: string;
  name: string;
  price: number;
  type: "hat" | "glasses" | "background";
  owned: boolean;
}

interface Review {
  id: string;
  from: string;
  department: string;
  rating: number;
  message: string;
  date: string;
}

const MAJOR_OPTIONS = [
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
  "산업디자인학과",
  "시각디자인학과",
  "환경조경디자인학과",
  "의류디자인학과",
  "디지털콘텐츠학과",
  "도예학과",
  "회화과",
  "조소과",
  "포스트모던음악학과",
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
  "건축학과",
  "체육학과",
  "스포츠지도학과",
  "스포츠의학학과",
  "골프산업학과",
  "태권도학과",
];

function maskedStudentNumber(studentNumber?: string, fallback = "2026****"): string {
  if (!studentNumber || studentNumber.length < 4) return fallback;
  return `${studentNumber.slice(0, 4)}****`;
}

export function MyPage() {
  const navigate = useNavigate();
  const { courses } = useTimetable();
  const { user: authUser, logout } = useAuth();
  const { profile, commitProfile } = useProfile();
  const isValidNickname = (value: string) => /^[A-Za-z0-9가-힣_]{2,20}$/.test(value.trim());
  const isValidMajor = (value: string) => value.trim().length >= 2 && value.trim().length <= 50;

  const user = {
    department: profile?.department ?? "도예학과",
    name: profile?.nickname ? `${profile.nickname}님` : "쿠옹이님",
    studentId: maskedStudentNumber(profile?.studentNumber),
    email: authUser?.email ?? "lion@khu.ac.kr",
    points: 850,
  };

  const [isProfileEditOpen, setProfileEditOpen] = useState(false);
  const [editNickname, setEditNickname] = useState(profile?.nickname ?? "");
  const [editMajor, setEditMajor] = useState(profile?.department ?? "");
  const [editStudentNumber, setEditStudentNumber] = useState(profile?.studentNumber ?? "");
  const [editTodayQuestion, setEditTodayQuestion] = useState(profile?.todayQuestion ?? "");
  const [editBio, setEditBio] = useState(profile?.bio ?? "");
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [reviews] = useState<Review[]>([
    {
      id: "1",
      from: "경영 쿠옹이",
      department: "경영학과",
      rating: 5,
      message: "덕분에 과제 해결했어요! 정말 감사합니다 😊",
      date: "2026.03.20"
    },
    {
      id: "2",
      from: "컴공 쿠옹이",
      department: "컴퓨터공학과",
      rating: 5,
      message: "친절하게 설명해주셔서 이해가 잘 됐어요!",
      date: "2026.03.19"
    },
    {
      id: "3",
      from: "국제 쿠옹이",
      department: "국제학과",
      rating: 4,
      message: "같이 공부하니까 너무 좋았어요. 다음에 또 해요!",
      date: "2026.03.18"
    }
  ]);

  const [equippedItems, setEquippedItems] = useState({
    hat: "👑",
    glasses: "😎",
    background: "✨",
  });

  const [items, setItems] = useState<ItemData[]>([
    { id: "crown", emoji: "👑", name: "왕관", price: 100, type: "hat", owned: true },
    { id: "grad", emoji: "🎓", name: "졸업모자", price: 150, type: "hat", owned: true },
    { id: "cap", emoji: "🧢", name: "야구모자", price: 120, type: "hat", owned: false },
    { id: "tophat", emoji: "🎩", name: "실크햇", price: 200, type: "hat", owned: false },
    { id: "sunglasses", emoji: "😎", name: "선글라스", price: 130, type: "glasses", owned: true },
    { id: "glasses", emoji: "🤓", name: "안경", price: 100, type: "glasses", owned: false },
    { id: "monocle", emoji: "🧐", name: "단안경", price: 180, type: "glasses", owned: false },
    { id: "star", emoji: "⭐", name: "별", price: 250, type: "background", owned: false },
    { id: "sparkle", emoji: "✨", name: "반짝이", price: 200, type: "background", owned: true },
    { id: "fire", emoji: "🔥", name: "열정", price: 300, type: "background", owned: false },
    { id: "heart", emoji: "💝", name: "하트", price: 180, type: "background", owned: false },
    { id: "rainbow", emoji: "🌈", name: "무지개", price: 350, type: "background", owned: false },
  ]);

  const [userPoints, setUserPoints] = useState(user.points);

  const [hobbies, setHobbies] = useState<string[]>(DEFAULT_USER_HOBBIES);
  const [hobbyIdByName, setHobbyIdByName] = useState<Record<string, number>>({});
  const [hobbySyncError, setHobbySyncError] = useState<string | null>(null);
  const hobbyCategories = Object.keys(HOBBY_CATEGORY_OPTIONS);
  const [selectedHobbyCategory, setSelectedHobbyCategory] = useState<string>(
    hobbyCategories[0] ?? "투어"
  );

  useEffect(() => {
    if (profile && profile.hobbies !== undefined) {
      setHobbies(sanitizeHobbies(profile.hobbies));
    }
  }, [profile?.id, profile?.hobbies]);

  useEffect(() => {
    setEditNickname(profile?.nickname ?? "");
    setEditMajor(profile?.department ?? "");
    setEditStudentNumber(profile?.studentNumber ?? "");
    setEditTodayQuestion(profile?.todayQuestion ?? "");
    setEditBio(profile?.bio ?? "");
  }, [
    profile?.id,
    profile?.nickname,
    profile?.department,
    profile?.studentNumber,
    profile?.todayQuestion,
    profile?.bio,
  ]);

  const openProfileEdit = () => {
    setEditNickname(profile?.nickname ?? "");
    setEditMajor(profile?.department ?? "");
    setEditStudentNumber(profile?.studentNumber ?? "");
    setEditTodayQuestion(profile?.todayQuestion ?? "");
    setEditBio(profile?.bio ?? "");
    setProfileSaveError(null);
    setProfileEditOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!authUser || !profile) return;
    if (!editNickname.trim() || !editMajor.trim()) {
      setProfileSaveError("닉네임과 전공을 입력해주세요.");
      return;
    }
    if (!isValidNickname(editNickname)) {
      setProfileSaveError("닉네임은 2~20자, 한글/영문/숫자/_만 입력할 수 있어요.");
      return;
    }
    if (!isValidMajor(editMajor)) {
      setProfileSaveError("전공은 2~50자로 입력해주세요.");
      return;
    }
    if (!/^\d{10}$/.test(editStudentNumber)) {
      setProfileSaveError("학번은 숫자 10자리로 입력해주세요.");
      return;
    }
    setIsSavingProfile(true);
    setProfileSaveError(null);
    try {
      const nextBio = editBio.trim();
      const nextTq = editTodayQuestion.trim();
      const remote = await updateMyProfile({
        nickname: editNickname.trim(),
        major: editMajor.trim(),
        bio: nextBio,
        todayQuestion: nextTq,
      });
      const bioFromServer =
        remote.bio != null ? String(remote.bio).trim() : nextBio;
      const tqFromServer =
        remote.todayQuestion != null ? String(remote.todayQuestion).trim() : nextTq;
      commitProfile({
        ...profile,
        nickname: remote.nickname ?? editNickname.trim(),
        department: remote.major ?? editMajor.trim(),
        studentNumber: editStudentNumber,
        grade: `${editStudentNumber.slice(0, 2)}학번`,
        bio: bioFromServer || undefined,
        todayQuestion: tqFromServer || undefined,
      });
      setProfileEditOpen(false);
    } catch (e) {
      if (e instanceof ApiError) setProfileSaveError(e.message);
      else setProfileSaveError("프로필 저장 중 오류가 발생했어요.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!authUser?.id) return;

    const run = async () => {
      try {
        const list = await getMyInterests();
        if (cancelled) return;
        const names = sanitizeHobbies(list.map((i) => i.name));
        const idMap = Object.fromEntries(list.map((i) => [i.name, i.interestId] as const));
        setHobbies(names);
        setHobbyIdByName(idMap);
        setHobbySyncError(null);
        if (profile) {
          commitProfile({ ...profile, hobbies: names });
        }
      } catch {
        if (!cancelled) {
          setHobbySyncError("관심사 동기화에 실패했어요.");
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, profile?.id]);

  const persistHobbies = (next: string[]) => {
    const cleaned = sanitizeHobbies(next);
    setHobbies(cleaned);
    if (profile && authUser) {
      commitProfile({ ...profile, hobbies: cleaned });
    }
  };

  const handleAddHobby = async (hobby: string) => {
    if (!hobby || hobbies.includes(hobby)) return;
    if (!authUser?.id) {
      persistHobbies([...hobbies, hobby]);
      return;
    }
    try {
      const added = await addMyInterest(hobby);
      const next = [...hobbies, added.name];
      persistHobbies(next);
      setHobbyIdByName((prev) => ({ ...prev, [added.name]: added.interestId }));
      setHobbySyncError(null);
    } catch (e) {
      if (e instanceof ApiError) {
        setHobbySyncError(e.message);
      } else {
        setHobbySyncError("관심사 추가에 실패했어요.");
      }
    }
  };

  const handleRemoveHobby = async (hobbyToRemove: string) => {
    if (!authUser?.id) {
      persistHobbies(hobbies.filter((h) => h !== hobbyToRemove));
      return;
    }
    const interestId = hobbyIdByName[hobbyToRemove];
    if (!interestId) {
      persistHobbies(hobbies.filter((h) => h !== hobbyToRemove));
      return;
    }
    try {
      await deleteMyInterest(interestId);
      const next = hobbies.filter((h) => h !== hobbyToRemove);
      persistHobbies(next);
      setHobbyIdByName((prev) => {
        const copied = { ...prev };
        delete copied[hobbyToRemove];
        return copied;
      });
      setHobbySyncError(null);
    } catch (e) {
      if (e instanceof ApiError) {
        setHobbySyncError(e.message);
      } else {
        setHobbySyncError("관심사 삭제에 실패했어요.");
      }
    }
  };

  const handleBuyItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.owned || userPoints < item.price) return;

    setUserPoints(userPoints - item.price);
    setItems(items.map((i) => (i.id === itemId ? { ...i, owned: true } : i)));
  };

  const handleEquipItem = (item: ItemData) => {
    if (!item.owned) return;
    
    setEquippedItems((prev) => ({
      ...prev,
      [item.type]: prev[item.type] === item.emoji ? "" : item.emoji,
    }));
  };

  const stats = [
    { label: "등록 수업", value: `${courses.length}개`, icon: Calendar },
    { label: "매칭 성공", value: "12번", icon: Users },
    { label: "도움 준 횟수", value: "23번", icon: Award },
  ];

  const activityData = [
    { label: "수업 채팅 참여", count: 8 },
    { label: "공강 매칭 참여", count: 3 },
    { label: "질문 답변", count: 5 },
    { label: "같이 앉기 참여", count: 2 },
  ];

  const settingsMenu: {
    label: string;
    icon: LucideIcon;
    description: string;
    onClick?: () => void;
  }[] = [
    {
      label: "시간표 수정",
      icon: Calendar,
      description: "수업 정보 업데이트",
      onClick: () => navigate("/home/my-timetable"),
    },
    { label: "관심사 설정", icon: Settings, description: "매칭 선호도 관리" },
    { label: "알림 설정", icon: Bell, description: "푸시 알림 관리" },
    { label: "개인정보 보호", icon: Shield, description: "보안 및 프라이버시" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-4">
        <h1 className="text-xl font-bold text-gray-800">마이페이지</h1>
        <p className="text-sm text-gray-500">프로필 및 활동 관리</p>
      </div>

      <div className="px-5 py-6 space-y-5">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-[#A71930] to-[#8B1526] rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <LionAvatar 
              department={user.department} 
              size="md"
              accessories={equippedItems}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-1">{user.name}</h2>
              <p className="text-sm opacity-90 truncate">{user.department}</p>
              <p className="text-xs opacity-75">{user.studentId}</p>
            </div>
            <button
              type="button"
              onClick={openProfileEdit}
              className="w-11 h-11 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
              aria-label="프로필 수정"
            >
              <Pencil className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-xs opacity-90">보유 포인트</span>
              </div>
              <p className="text-2xl font-bold">{userPoints}P</p>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs opacity-90">활동 레벨</span>
              </div>
              <p className="text-2xl font-bold">LV 5</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100"
            >
              <Icon
                className="w-6 h-6 mx-auto mb-2"
                style={{ color: "#E6A620" }}
              />
              <p className="text-xl font-bold text-gray-800 mb-1">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Activity Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-0.5">이번 주 활동</h3>
              <p className="text-xs text-gray-500">3월 16일 - 3월 22일</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {activityData.map((activity) => (
              <div
                key={activity.label}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ backgroundColor: "#FDF5E6" }}
              >
                <span className="text-xs font-semibold text-gray-700">
                  {activity.label}
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ color: "#A71930" }}
                >
                  {activity.count}회
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Question */}
        {profile?.todayQuestion ? (
          <div
            className="rounded-2xl p-5 text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #A71930 0%, #8B1526 100%)" }}
          >
            <p className="text-sm font-semibold opacity-95">오늘의 질문</p>
            <p className="text-2xl font-bold mt-2 leading-snug">{profile.todayQuestion}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-gray-700">오늘의 질문</p>
            <p className="text-sm text-gray-500 mt-2">오늘은 질문이 없어요.</p>
          </div>
        )}

        {/* Intro */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">소개</h3>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {profile?.bio || "소개글을 작성해 주세요."}
            </p>
          </div>
        </div>

        {/* Hobbies & Interests */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" style={{ color: "#A71930" }} />
              <h3 className="font-bold text-gray-800">내 취미 & 관심사</h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">공강 매칭 필터와 동일하게 적용됩니다</p>
          </div>
          
          <div className="p-4 space-y-3">
            {hobbySyncError && (
              <p className="text-xs text-red-600">{hobbySyncError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {hobbies.map((hobby) => (
                <div
                  key={hobby}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "#FDF5E6" }}
                >
                  <span className="text-sm font-medium" style={{ color: "#A71930" }}>
                    {hobby}
                  </span>
                  <button
                    onClick={() => handleRemoveHobby(hobby)}
                    className="hover:bg-white/50 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" style={{ color: "#A71930" }} />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-500">카테고리를 선택한 뒤, 세부 항목을 골라 추가하세요.</p>

              <div className="flex flex-wrap gap-2">
                {hobbyCategories.map((category) => {
                  const active = selectedHobbyCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedHobbyCategory(category)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        active ? "text-white" : "text-gray-700 bg-gray-100 hover:bg-gray-200"
                      }`}
                      style={active ? { backgroundColor: "#A71930" } : undefined}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl p-3 border border-gray-100" style={{ backgroundColor: "#FAFAFA" }}>
                <p className="text-xs font-semibold text-gray-500 mb-2">{selectedHobbyCategory} 세부 항목</p>
                <div className="flex flex-wrap gap-2">
                  {(HOBBY_CATEGORY_OPTIONS[
                    selectedHobbyCategory as keyof typeof HOBBY_CATEGORY_OPTIONS
                  ] ?? []
                  ).map((option) => {
                    const selected = hobbies.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => (selected ? void handleRemoveHobby(option) : void handleAddHobby(option))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selected ? "text-white" : "text-gray-700"
                        }`}
                        style={
                          selected
                            ? { backgroundColor: "#A71930" }
                            : { backgroundColor: "#FDF5E6", color: "#A71930" }
                        }
                      >
                        {selected ? `✓ ${option}` : option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lion Decoration Shop */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" style={{ color: "#A71930" }} />
              <div>
                <h3 className="text-base font-bold text-gray-800">쿠옹이 꾸미기</h3>
                <p className="text-xs text-gray-500">포인트로 아이템 구매</p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#FDF5E6" }}>
              <Sparkles className="w-4 h-4" style={{ color: "#E6A620" }} />
              <span className="text-sm font-bold" style={{ color: "#A71930" }}>{items.filter(i => i.owned).length}/{items.length}</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Hats */}
            <div>
              <h4 className="text-xs font-semibold text-gray-600 mb-2">
                🎩 모자 ({items.filter(i => i.type === "hat" && i.owned).length}/{items.filter(i => i.type === "hat").length})
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {items.filter((item) => item.type === "hat").map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleEquipItem(item)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                      item.owned
                        ? equippedItems.hat === item.emoji
                          ? "ring-2 ring-[#A71930] bg-[#FDF5E6]"
                          : "bg-gray-50 hover:bg-gray-100"
                        : "bg-gray-100 opacity-50"
                    }`}
                  >
                    <div className="text-2xl mb-1">{item.emoji}</div>
                    <p className="text-[10px] font-semibold text-gray-700">{item.name}</p>
                    {!item.owned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyItem(item.id);
                        }}
                        disabled={userPoints < item.price}
                        className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                      >
                        <Award className="w-4 h-4 mb-0.5" />
                        <span className="text-xs font-bold">{item.price}P</span>
                      </button>
                    )}
                    {item.owned && equippedItems.hat === item.emoji && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#A71930" }}>
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Glasses */}
            <div>
              <h4 className="text-xs font-semibold text-gray-600 mb-2">
                👓 안경 ({items.filter(i => i.type === "glasses" && i.owned).length}/{items.filter(i => i.type === "glasses").length})
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {items.filter((item) => item.type === "glasses").map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleEquipItem(item)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                      item.owned
                        ? equippedItems.glasses === item.emoji
                          ? "ring-2 ring-[#A71930] bg-[#FDF5E6]"
                          : "bg-gray-50 hover:bg-gray-100"
                        : "bg-gray-100 opacity-50"
                    }`}
                  >
                    <div className="text-2xl mb-1">{item.emoji}</div>
                    <p className="text-[10px] font-semibold text-gray-700">{item.name}</p>
                    {!item.owned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyItem(item.id);
                        }}
                        disabled={userPoints < item.price}
                        className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                      >
                        <Award className="w-4 h-4 mb-0.5" />
                        <span className="text-xs font-bold">{item.price}P</span>
                      </button>
                    )}
                    {item.owned && equippedItems.glasses === item.emoji && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#A71930" }}>
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Background Effects */}
            <div>
              <h4 className="text-xs font-semibold text-gray-600 mb-2">
                ✨ 배경 효과 ({items.filter(i => i.type === "background" && i.owned).length}/{items.filter(i => i.type === "background").length})
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {items.filter((item) => item.type === "background").map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleEquipItem(item)}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                      item.owned
                        ? equippedItems.background === item.emoji
                          ? "ring-2 ring-[#A71930] bg-[#FDF5E6]"
                          : "bg-gray-50 hover:bg-gray-100"
                        : "bg-gray-100 opacity-50"
                    }`}
                  >
                    <div className="text-xl mb-1">{item.emoji}</div>
                    <p className="text-[9px] font-semibold text-gray-700 text-center leading-tight">{item.name}</p>
                    {!item.owned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyItem(item.id);
                        }}
                        disabled={userPoints < item.price}
                        className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                      >
                        <Award className="w-4 h-4 mb-0.5" />
                        <span className="text-xs font-bold">{item.price}P</span>
                      </button>
                    )}
                    {item.owned && equippedItems.background === item.emoji && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#A71930" }}>
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-0.5">받은 평가</h3>
              <p className="text-xs text-gray-500">쿠옹이님의 도움에 대한 평가</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <LionAvatar department={review.department} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{review.from}</p>
                        <p className="text-xs text-gray-500">{review.department}</p>
                      </div>
                      <span className="text-xs text-gray-400">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-1">
                      {Array.from({ length: review.rating }, (_, index) => (
                        <Star key={index} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-xs text-gray-700">{review.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">설정</h3>
          </div>
          
          {settingsMenu.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => item.onClick?.()}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#FDF5E6" }}
              >
                <item.icon className="w-5 h-5" style={{ color: "#A71930" }} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button 
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
            <LogOut className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-sm text-gray-800">로그아웃</p>
            <p className="text-xs text-gray-500">현재 계정에서 로그아웃</p>
          </div>
        </button>
      </div>

      <Dialog open={isProfileEditOpen} onOpenChange={setProfileEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>프로필 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <LionAvatar department={editMajor || user.department} size="lg" accessories={equippedItems} />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">닉네임</label>
              <Input
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                maxLength={20}
                placeholder="쿠옹이님"
              />
              <p className="text-xs text-gray-500">2~20자, 한글/영문/숫자/_만 입력 가능합니다</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">전공</label>
              <select
                value={editMajor}
                onChange={(e) => setEditMajor(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white"
              >
                <option value="" disabled>
                  전공을 선택해주세요
                </option>
                {MAJOR_OPTIONS.map((major) => (
                  <option key={major} value={major}>
                    {major}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">학번</label>
              <Input
                value={editStudentNumber}
                onChange={(e) =>
                  setEditStudentNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                inputMode="numeric"
                maxLength={10}
                placeholder="예: 2026123456"
              />
              <p className="text-xs text-gray-500">숫자 10자리로 입력해주세요</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">오늘의 질문</label>
              <Textarea
                value={editTodayQuestion}
                onChange={(e) => setEditTodayQuestion(e.target.value)}
                maxLength={60}
                placeholder="예: 학식 메뉴 중 뭐가 제일 맛있어요?"
                className="min-h-20"
              />
              <p className="text-xs text-gray-500">{editTodayQuestion.length}/60자</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">소개</label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={100}
                placeholder="자신을 소개해주세요 (예: 카페 좋아하는 도예학과 26학번입니다)"
                className="min-h-24"
              />
              <p className="text-xs text-gray-500">{editBio.length}/100자</p>
            </div>

            {profileSaveError && <p className="text-sm text-red-600">{profileSaveError}</p>}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setProfileEditOpen(false)}
                disabled={isSavingProfile}
              >
                취소
              </Button>
              <Button
                type="button"
                className="flex-1 text-white"
                style={{ backgroundColor: "#A71930" }}
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}