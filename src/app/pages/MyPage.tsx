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
  Plus,
  X,
  Star,
  ThumbsUp,
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
import { DEFAULT_USER_HOBBIES } from "../mocks/freeSlotPeers";

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

export function MyPage() {
  const navigate = useNavigate();
  const { courses } = useTimetable();
  const { user: authUser } = useAuth();
  const { profile, commitProfile } = useProfile();

  const user = {
    department: profile?.department ?? "도예학과",
    name: profile?.nickname ? `${profile.nickname}님` : "쿠옹이님",
    studentId: "2026****",
    email: authUser?.email ?? "lion@khu.ac.kr",
    points: 850,
  };

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
  const [newHobby, setNewHobby] = useState("");

  useEffect(() => {
    if (profile && profile.hobbies !== undefined) {
      setHobbies(profile.hobbies);
    }
  }, [profile?.id, profile?.hobbies]);

  const persistHobbies = (next: string[]) => {
    setHobbies(next);
    if (profile && authUser) {
      commitProfile({ ...profile, hobbies: next });
    }
  };

  const handleAddHobby = () => {
    const t = newHobby.trim();
    if (!t || hobbies.includes(t)) return;
    persistHobbies([...hobbies, t]);
    setNewHobby("");
  };

  const handleRemoveHobby = (hobbyToRemove: string) => {
    persistHobbies(hobbies.filter((h) => h !== hobbyToRemove));
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

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="새 취미 추가..."
                  value={newHobby}
                  onChange={(e) => setNewHobby(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddHobby();
                    }
                  }}
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={handleAddHobby}
                  size="icon"
                  style={{ backgroundColor: "#A71930" }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
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
          onClick={() => navigate('/')}
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
    </div>
  );
}