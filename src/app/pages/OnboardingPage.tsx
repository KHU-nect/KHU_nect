import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { Search, X, Upload, Image as ImageIcon } from "lucide-react";
import { useTimetable } from "../context/TimetableContext";
import { PageContainer } from "../components/PageContainer";
import { CourseSearchItem } from "../components/CourseSearchItem";
import { searchCourses, type CourseSummary } from "../api/courseApi";
import { addTimetableEntry, getMyTimetable, timetableEntryToCourse } from "../api/timetableApi";
import { ApiError } from "../api/client";

type SelectedCourse = {
  id: number;
  name: string;
  professor: string;
  time: string;
  room: string;
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const { addCourse, clearCourses } = useTimetable();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SelectedCourse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowResults(query.trim().length > 0);
  };

  const selectedIdSet = useMemo(
    () => new Set(selectedCourses.map((course) => course.id)),
    [selectedCourses]
  );

  const handleAddCourse = (course: SelectedCourse) => {
    if (!selectedCourses.find((c) => c.id === course.id)) {
      setSelectedCourses([...selectedCourses, course]);
    }
    setSearchQuery("");
    setShowResults(false);
  };

  const handleRemoveCourse = (courseId: number) => {
    setSelectedCourses(selectedCourses.filter((c) => c.id !== courseId));
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async () => {
    if (selectedCourses.length === 0 && !uploadedImage) return;

    setSubmitLoading(true);
    setErrorMessage(null);
    try {
      for (const course of selectedCourses) {
        await addTimetableEntry(course.id);
      }
      const timetableEntries = await getMyTimetable();
      clearCourses();
      timetableEntries.forEach((entry) => {
        addCourse(timetableEntryToCourse(entry));
      });
      navigate("/onboarding-complete");
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorMessage(e.message);
      } else {
        setErrorMessage("시간표 등록 중 오류가 발생했습니다.");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => {
    if (!showResults || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await searchCourses(searchQuery, 0, 20);
        if (cancelled) return;
        const mapped = response.content.map((course: CourseSummary) => ({
          id: course.id,
          name: course.courseName,
          professor: course.professorName,
          time: course.scheduleText,
          room: course.classroom,
        }));
        setSearchResults(mapped);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, showResults]);

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
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-80 overflow-y-auto z-10">
              {searchLoading && (
                <div className="px-4 py-3 text-sm text-gray-500">검색 중...</div>
              )}
              {!searchLoading && searchResults.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">검색 결과가 없어요.</div>
              )}
              {!searchLoading &&
                searchResults.map((course) => (
                  <CourseSearchItem
                    key={course.id}
                    course={course}
                    onAdd={handleAddCourse}
                    isAdded={selectedIdSet.has(course.id)}
                  />
                ))}
            </div>
          )}
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
          disabled={(selectedCourses.length === 0 && !uploadedImage) || submitLoading}
          className="w-full py-4 rounded-full text-white font-semibold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
          style={{
            backgroundColor: (selectedCourses.length > 0 || uploadedImage) ? "#A71930" : "#D1D5DB",
          }}
        >
          {submitLoading ? "등록 중..." : "시간표 등록 완료"}
        </button>

        {errorMessage && (
          <p className="text-center text-sm text-red-600 mt-2">{errorMessage}</p>
        )}

        {selectedCourses.length === 0 && !uploadedImage && (
          <p className="text-center text-sm text-gray-400 mt-3">
            💡 강의를 추가하거나 시간표 캡처본을 업로드해주세요
          </p>
        )}
      </div>
    </PageContainer>
  );
}