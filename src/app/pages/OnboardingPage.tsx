import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, X, Upload, Image as ImageIcon } from "lucide-react";
import { useTimetable } from "../context/TimetableContext";
import { PageContainer } from "../components/PageContainer";
import { CourseSearchItem } from "../components/CourseSearchItem";
import {
  AVAILABLE_COURSES,
  catalogToTimetableCourse,
  type CatalogCourse,
} from "../mocks/availableCourses";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { addCourse, clearCourses } = useTimetable();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<CatalogCourse[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowResults(query.length > 0);
  };

  const searchResults = AVAILABLE_COURSES.filter(
    (course) =>
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.professor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCourse = (course: CatalogCourse) => {
    if (!selectedCourses.find((c) => c.id === course.id)) {
      setSelectedCourses([...selectedCourses, course]);
    }
    setSearchQuery("");
    setShowResults(false);
  };

  const handleRemoveCourse = (courseId: number) => {
    setSelectedCourses(selectedCourses.filter((c) => c.id !== courseId));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = () => {
    if (selectedCourses.length === 0 && !uploadedImage) return;

    // 기존 시간표를 현재 선택한 강의들로 교체
    clearCourses();
    selectedCourses.forEach((course, index) => {
      addCourse(catalogToTimetableCourse(course, `${Date.now()}-${index}`));
    });

    navigate("/onboarding-complete");
  };

  return (
    <PageContainer className="bg-white">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <div className="text-center mb-2">
          <div className="text-6xl mb-5">🦁</div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: "#A71930" }}>
            OOO쿠옹이님,
          </h1>
          <p className="text-base text-gray-600">
            이번 학기 시간표를 알려주세요!
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="px-5 mb-6">
        <div className="relative">
          <div className="flex items-center gap-3 px-5 py-4 border-2 border-gray-300 rounded-[20px] bg-white">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="강의명 또는 교수명을 입력하세요"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 outline-none text-base"
            />
          </div>

          {/* Search Results */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-80 overflow-y-auto z-10">
              {searchResults.map((course) => (
                <CourseSearchItem
                  key={course.id}
                  course={course}
                  onAdd={handleAddCourse}
                  isAdded={selectedCourses.some((c) => c.id === course.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Direct Input Link */}
        <div className="text-center mt-4">
          <button className="text-sm text-gray-500 underline hover:text-gray-700 active:text-gray-900">
            직접 입력해서 등록하기
          </button>
        </div>
      </div>

      {/* Selected Courses */}
      <div className="flex-1 px-5 pb-6 overflow-y-auto">
        {selectedCourses.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">
              추가된 강의 ({selectedCourses.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border-2"
                  style={{ borderColor: "#A71930", backgroundColor: "#FDF5E6" }}
                >
                  <span style={{ color: "#A71930" }} className="font-medium">
                    {course.name}
                  </span>
                  <button
                    onClick={() => handleRemoveCourse(course.id)}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" style={{ color: "#A71930" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="px-5 pb-8 pt-4 border-t border-gray-100 bg-white space-y-4">
        {/* Everytime Screenshot Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-center">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="px-3 text-xs text-gray-400">또는</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          <label
            htmlFor="timetable-upload"
            className="block w-full py-3.5 rounded-xl border-2 border-dashed border-gray-300 text-center cursor-pointer hover:border-[#E6A620] hover:bg-[#FDF5E6] transition-all"
          >
            <input
              id="timetable-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              {uploadedImage ? (
                <>
                  <ImageIcon className="w-5 h-5" style={{ color: "#E6A620" }} />
                  <span className="text-sm font-medium" style={{ color: "#A71930" }}>
                    ✓ 시간표 캡처본 업로드됨
                  </span>
                  <span className="text-xs text-gray-500">
                    탭하여 다시 업로드
                  </span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">
                    에브리타임 시간표 캡처본 올리기
                  </span>
                  <span className="text-xs text-gray-400">
                    JPG, PNG 파일 업로드
                  </span>
                </>
              )}
            </div>
          </label>

          {uploadedImage && (
            <div className="relative rounded-xl overflow-hidden border border-gray-200">
              <img
                src={uploadedImage}
                alt="Uploaded timetable"
                className="w-full h-auto"
              />
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Complete Button */}
        <button
          onClick={handleComplete}
          disabled={selectedCourses.length === 0 && !uploadedImage}
          className="w-full py-4 rounded-full text-white font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
          style={{
            backgroundColor: (selectedCourses.length > 0 || uploadedImage) ? "#A71930" : "#D1D5DB",
          }}
        >
          시간표 등록 완료
        </button>

        {selectedCourses.length === 0 && !uploadedImage && (
          <p className="text-center text-sm text-gray-400 mt-3">
            💡 강의를 추가하거나 시간표 캡처본을 업로드해주세요
          </p>
        )}
      </div>
    </PageContainer>
  );
}