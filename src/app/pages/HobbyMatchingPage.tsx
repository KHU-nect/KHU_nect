import { useState } from "react";
import { Heart, Music, Camera, BookOpen, Gamepad2, Coffee, Palette, Plane, Search, Filter } from "lucide-react";
import { LionAvatar } from "../components/LionAvatar";
import { UserProfileDialog } from "../components/UserProfileDialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const hobbyCategories = [
  { id: "all", name: "전체", icon: Heart },
  { id: "music", name: "음악", icon: Music },
  { id: "photo", name: "사진", icon: Camera },
  { id: "reading", name: "독서", icon: BookOpen },
  { id: "game", name: "게임", icon: Gamepad2 },
  { id: "cafe", name: "카페", icon: Coffee },
  { id: "art", name: "예술", icon: Palette },
  { id: "travel", name: "여행", icon: Plane },
];

const hobbyMates = [
  {
    department: "경영학과",
    name: "경영 사자",
    year: "25학번",
    activity: "카페투어",
    tag: "#카페투어",
    hobbies: ["카페", "독서", "사진"],
    bio: "주말마다 새로운 카페 탐방하는 걸 좋아해요! 같이 가실 분~",
    matchingRate: 92,
    category: "cafe"
  },
  {
    department: "컴퓨터공학과",
    name: "컴공 사자",
    year: "23학번",
    activity: "게임",
    tag: "#게임",
    hobbies: ["게임", "코딩", "음악"],
    bio: "LOL, 발로란트 같이 할 친구 찾아요!",
    matchingRate: 78,
    category: "game"
  },
  {
    department: "국제학과",
    name: "국제 사자",
    year: "26학번",
    activity: "여행",
    tag: "#여행",
    hobbies: ["여행", "사진", "언어"],
    bio: "방학 때 유럽 여행 계획 중이에요. 관심 있으신 분!",
    matchingRate: 85,
    category: "travel"
  },
  {
    department: "도예학과",
    name: "흙 사자",
    year: "26학번",
    activity: "밴드",
    tag: "#밴드",
    hobbies: ["음악", "악기연주", "공연관람"],
    bio: "밴드 멤버 구해요! 베이스 또는 드럼 가능하신 분",
    matchingRate: 88,
    category: "music"
  },
  {
    department: "건축학과",
    name: "건축 사자",
    year: "24학번",
    activity: "사진",
    tag: "#사진",
    hobbies: ["사진", "건축투어", "카페"],
    bio: "필름카메라로 캠퍼스 사진 찍어요 📷",
    matchingRate: 90,
    category: "photo"
  },
  {
    department: "유전생명과학과",
    name: "유과 사자",
    year: "26학번",
    activity: "독서",
    tag: "#독서",
    hobbies: ["독서", "글쓰기", "카페"],
    bio: "독서 모임 운영 중입니다. 함께 읽고 토론해요!",
    matchingRate: 82,
    category: "reading"
  },
  {
    department: "산업공학과",
    name: "산공 사자",
    year: "24학번",
    activity: "그림",
    tag: "#그림",
    hobbies: ["그림", "디자인", "전시회"],
    bio: "주말마다 전시회 가요. 같이 가실 분!",
    matchingRate: 76,
    category: "art"
  },
  {
    department: "전자공학과",
    name: "전공 사자",
    year: "23학번",
    activity: "클래식",
    tag: "#클래식",
    hobbies: ["클래식", "피아노", "영화"],
    bio: "클래식 콘서트 같이 가실 분 찾아요 🎵",
    matchingRate: 80,
    category: "music"
  },
];

export function HobbyMatchingPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(hobbyMates[0]);

  const handleUserClick = (mate: typeof hobbyMates[0]) => {
    setSelectedUser(mate);
    setProfileDialogOpen(true);
  };

  const filteredMates = hobbyMates.filter((mate) => {
    const matchesCategory = selectedCategory === "all" || mate.category === selectedCategory;
    const matchesSearch = mate.hobbies.some(hobby => 
      hobby.toLowerCase().includes(searchQuery.toLowerCase())
    ) || mate.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && (searchQuery === "" || matchesSearch);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">취미 매칭</h1>
          <p className="text-sm text-gray-500">같은 취미를 가진 친구들을 찾아보세요</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search & Filter Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="취미로 검색하기 (예: 카페, 독서, 음악...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button variant="outline" className="h-12">
              <Filter className="w-4 h-4 mr-2" />
              필터
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {hobbyCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                    selectedCategory === category.id
                      ? "text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  style={
                    selectedCategory === category.id
                      ? { backgroundColor: "#A71930" }
                      : {}
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#FDF5E6" }}>
              <Heart className="w-6 h-6" style={{ color: "#A71930" }} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{filteredMates.length}명</p>
            <p className="text-sm text-gray-500">매칭 가능</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#FDF5E6" }}>
              <Music className="w-6 h-6" style={{ color: "#E6A620" }} />
            </div>
            <p className="text-2xl font-bold text-gray-800">12개</p>
            <p className="text-sm text-gray-500">취미 카테고리</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#FDF5E6" }}>
              <Coffee className="w-6 h-6" style={{ color: "#A71930" }} />
            </div>
            <p className="text-2xl font-bold text-gray-800">5개</p>
            <p className="text-sm text-gray-500">내 취미</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#FDF5E6" }}>
              <Heart className="w-6 h-6" style={{ color: "#E6A620" }} />
            </div>
            <p className="text-2xl font-bold text-gray-800">18명</p>
            <p className="text-sm text-gray-500">매칭 완료</p>
          </div>
        </div>

        {/* Matching Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {selectedCategory === "all" ? "전체" : hobbyCategories.find(c => c.id === selectedCategory)?.name} 매칭 결과
            </h2>
            <span className="text-sm text-gray-500">{filteredMates.length}명</span>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {filteredMates.map((mate, index) => (
              <div
                key={index}
                onClick={() => handleUserClick(mate)}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex flex-col items-center text-center mb-4">
                  <LionAvatar department={mate.department} size="md" />
                  <h3 className="font-bold text-gray-800 mt-3">{mate.name}</h3>
                  <p className="text-sm text-gray-500">{mate.department}</p>
                  <p className="text-xs text-gray-400">{mate.year}</p>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-sm text-gray-600 line-clamp-2">{mate.bio}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {mate.hobbies.slice(0, 3).map((hobby, i) => (
                      <div
                        key={i}
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: "#FDF5E6", color: "#A71930" }}
                      >
                        {hobby}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">매칭률</span>
                      <span className="text-sm font-bold" style={{ color: "#A71930" }}>
                        {mate.matchingRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${mate.matchingRate}%`,
                          backgroundColor: "#E6A620",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredMates.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-gray-100">
                <Heart className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">매칭 결과가 없습니다</h3>
              <p className="text-gray-500">다른 카테고리를 선택하거나 검색어를 변경해보세요</p>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Dialog */}
      <UserProfileDialog
        isOpen={isProfileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        user={selectedUser}
        showReviewButton={true}
      />
    </div>
  );
}