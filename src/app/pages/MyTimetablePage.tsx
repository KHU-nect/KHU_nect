import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Plus, Search, Trash2, X } from "lucide-react";
import { useTimetable } from "../context/TimetableContext";
import type { TimetableCourse } from "../mocks/timetable";
import {
  AVAILABLE_COURSES,
  catalogToTimetableCourse,
  type CatalogCourse,
} from "../mocks/availableCourses";
import { CourseSearchItem } from "../components/CourseSearchItem";
import { groupCoursesBySubject } from "../utils/courseGroups";
import {
  DAY_LABELS,
  SLOT_START_TIMES,
  TIME_SELECT_OPTIONS,
  colorForCourse,
  courseBlockPixels,
  gridRowCount,
  parseHHMM,
  SLOT_PX,
  sortWeekdayLabels,
} from "../utils/timetableGrid";

type ManualDraft = {
  name: string;
  professor: string;
  location: string;
  days: (typeof DAY_LABELS)[number][];
  startTime: string;
  endTime: string;
  type: "major" | "general";
};

function emptyManual(): ManualDraft {
  return {
    name: "",
    professor: "",
    location: "",
    days: ["월"],
    startTime: "09:00",
    endTime: "10:30",
    type: "general",
  };
}

function courseToManual(c: TimetableCourse): ManualDraft {
  const days = sortWeekdayLabels(c.days) as ManualDraft["days"];
  return {
    name: c.name,
    professor: c.professor,
    location: c.location,
    days: days.length ? days : ["월"],
    startTime: c.startTime,
    endTime: c.endTime,
    type: c.type,
  };
}

function manualToCourse(draft: ManualDraft, id: string): TimetableCourse | null {
  if (!draft.name.trim() || !draft.professor.trim() || !draft.location.trim()) return null;
  if (draft.days.length === 0) return null;
  if (parseHHMM(draft.endTime) <= parseHHMM(draft.startTime)) return null;
  return {
    id,
    name: draft.name.trim(),
    professor: draft.professor.trim(),
    location: draft.location.trim(),
    days: sortWeekdayLabels(draft.days),
    startTime: draft.startTime,
    endTime: draft.endTime,
    type: draft.type,
  };
}

export function MyTimetablePage() {
  const navigate = useNavigate();
  const { courses, addCourse, updateCourse, removeCourse } = useTimetable();

  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manual, setManual] = useState<ManualDraft>(() => emptyManual());

  const searchResults = useMemo(
    () =>
      AVAILABLE_COURSES.filter(
        (course) =>
          course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.professor.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  const rows = gridRowCount(courses);
  const gridHeight = rows * SLOT_PX;

  const groups = useMemo(() => groupCoursesBySubject(courses), [courses]);

  const openAddSheet = () => {
    setEditingId(null);
    setManual(emptyManual());
    setSheetOpen(true);
  };

  const openEditSheet = (c: TimetableCourse) => {
    setEditingId(c.id);
    setManual(courseToManual(c));
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingId(null);
    setManual(emptyManual());
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setShowResults(q.length > 0);
  };

  const handleAddFromCatalog = (catalog: CatalogCourse) => {
    const tc = catalogToTimetableCourse(catalog, Date.now());
    addCourse(tc);
    setSearchQuery("");
    setShowResults(false);
  };

  const catalogAlreadyAdded = (catalogId: number) =>
    courses.some((c) => c.id.startsWith(`course-${catalogId}-`));

  const handleSaveManual = () => {
    if (editingId) {
      const next = manualToCourse(manual, editingId);
      if (next) updateCourse(editingId, next);
    } else {
      const next = manualToCourse(manual, `manual-${Date.now()}`);
      if (next) addCourse(next);
    }
    closeSheet();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/home/classes")}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="뒤로"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">내 시간표</h1>
        <button
          type="button"
          onClick={openAddSheet}
          className="p-2.5 rounded-xl text-white transition-all active:scale-95"
          style={{ backgroundColor: "#A71930" }}
          aria-label="수업 추가"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="relative">
          <div className="flex items-center gap-3 px-4 py-3.5 border-2 border-gray-200 rounded-[20px] bg-white">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="강의명 또는 교수명을 입력하세요"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 outline-none text-base bg-transparent"
            />
          </div>
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-72 overflow-y-auto z-30">
              {searchResults.map((course) => (
                <CourseSearchItem
                  key={course.id}
                  course={course}
                  onAdd={handleAddFromCatalog}
                  isAdded={catalogAlreadyAdded(course.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={openAddSheet}
            className="text-sm text-gray-500 underline hover:text-gray-800 active:text-gray-900"
          >
            직접 입력해서 등록하기
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-6 border-b border-gray-200">
            <div className="p-2 text-center text-xs font-semibold text-gray-400">시간</div>
            {DAY_LABELS.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-xs font-bold"
                style={{ backgroundColor: "#FDF5E6", color: "#A71930" }}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-6">
            <div className="border-r border-gray-200" style={{ minHeight: gridHeight }}>
              {Array.from({ length: Math.ceil(rows / 2) }).map((_, i) => {
                const isLastPair = i === Math.ceil(rows / 2) - 1;
                const rowSpan = isLastPair && rows % 2 === 1 ? 1 : 2;
                return (
                  <div
                    key={i}
                    className="flex items-start justify-center text-[10px] text-gray-500 border-b border-gray-100 pt-0.5"
                    style={{ height: rowSpan * SLOT_PX }}
                  >
                    {9 + i <= 18 ? `${String(9 + i).padStart(2, "0")}:00` : ""}
                  </div>
                );
              })}
            </div>

            {DAY_LABELS.map((day) => (
              <div
                key={day}
                className="relative border-r border-gray-200 last:border-r-0"
                style={{ minHeight: gridHeight }}
              >
                {Array.from({ length: rows }).map((_, timeIndex) => (
                  <div
                    key={timeIndex}
                    className={`border-b border-gray-50 ${timeIndex % 2 === 0 ? "border-gray-100" : ""}`}
                    style={{ height: SLOT_PX }}
                  />
                ))}

                {courses
                  .filter((c) => c.days.includes(day))
                  .map((c) => {
                    const { top, height } = courseBlockPixels(c.startTime, c.endTime);
                    const bg = colorForCourse(c);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openEditSheet(c)}
                        className="absolute left-0.5 right-0.5 rounded-lg p-1 text-left text-white text-[10px] overflow-hidden flex flex-col justify-start gap-0.5 transition-all active:scale-[0.98] shadow-sm"
                        style={{
                          top,
                          height,
                          backgroundColor: bg,
                          zIndex: 2,
                        }}
                      >
                        <span className="font-bold leading-tight line-clamp-2">{c.name}</span>
                        {height >= 40 && (
                          <span className="opacity-90 leading-tight line-clamp-1 text-[9px]">{c.location}</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700 px-1">등록된 수업</h2>
          {groups.length === 0 ? (
            <p className="text-sm text-gray-500 px-1 py-6 text-center bg-white rounded-xl border border-gray-100">
              아직 등록된 수업이 없어요. 검색하거나 직접 입력해 주세요.
            </p>
          ) : (
            groups.map((g) => (
              <div key={`${g.name}-${g.professor}`} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colorForCourse({ name: g.name, professor: g.professor }) }}
                      />
                      <h3 className="font-bold text-sm text-gray-900 truncate">{g.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500">
                      {g.professor} · {g.type === "major" ? "전공" : "교양"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCourse(g.slots[0].id)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    aria-label="과목 삭제"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openEditSheet(g.slots[0])}
                  className="w-full px-2 py-2 rounded-md text-xs font-medium text-left"
                  style={{
                    backgroundColor: `${colorForCourse(g.slots[0])}20`,
                    color: colorForCourse(g.slots[0]),
                  }}
                >
                  {g.slots[0].days.join("·")} {g.slots[0].startTime}-{g.slots[0].endTime} · {g.slots[0].location}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? "수업 수정" : "수업 추가"}</h2>
              <button
                type="button"
                onClick={closeSheet}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">과목명</label>
                <input
                  type="text"
                  value={manual.name}
                  onChange={(e) => setManual({ ...manual, name: e.target.value })}
                  placeholder="데이터베이스"
                  className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-[#A71930] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">교수명</label>
                <input
                  type="text"
                  value={manual.professor}
                  onChange={(e) => setManual({ ...manual, professor: e.target.value })}
                  placeholder="김교수"
                  className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-[#A71930] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">강의실</label>
                <input
                  type="text"
                  value={manual.location}
                  onChange={(e) => setManual({ ...manual, location: e.target.value })}
                  placeholder="공학관 301"
                  className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-[#A71930] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">구분</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setManual({ ...manual, type: "general" })}
                    className={`flex-1 h-12 rounded-xl font-semibold transition-all ${
                      manual.type === "general" ? "text-white" : "bg-gray-100 text-gray-600"
                    }`}
                    style={{ backgroundColor: manual.type === "general" ? "#A71930" : undefined }}
                  >
                    교양
                  </button>
                  <button
                    type="button"
                    onClick={() => setManual({ ...manual, type: "major" })}
                    className={`flex-1 h-12 rounded-xl font-semibold transition-all ${
                      manual.type === "major" ? "text-white" : "bg-gray-100 text-gray-600"
                    }`}
                    style={{ backgroundColor: manual.type === "major" ? "#E6A620" : undefined }}
                  >
                    전공
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">요일 (복수 선택)</label>
                <div className="flex gap-2 flex-wrap">
                  {DAY_LABELS.map((day) => {
                    const on = manual.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setManual((m) => {
                            if (m.days.includes(day)) {
                              if (m.days.length <= 1) return m;
                              return {
                                ...m,
                                days: sortWeekdayLabels(m.days.filter((d) => d !== day)) as ManualDraft["days"],
                              };
                            }
                            return {
                              ...m,
                              days: sortWeekdayLabels([...m.days, day]) as ManualDraft["days"],
                            };
                          })
                        }
                        className={`flex-1 min-w-[52px] h-12 rounded-xl font-semibold transition-all ${
                          on ? "text-white" : "bg-gray-100 text-gray-600"
                        }`}
                        style={{ backgroundColor: on ? "#A71930" : undefined }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">시작</label>
                  <select
                    value={manual.startTime}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setManual((m) => {
                        let end = m.endTime;
                        if (parseHHMM(end) <= parseHHMM(nextStart)) {
                          const after = TIME_SELECT_OPTIONS.find((t) => parseHHMM(t) > parseHHMM(nextStart));
                          end = after ?? m.endTime;
                        }
                        return { ...m, startTime: nextStart, endTime: end };
                      });
                    }}
                    className="w-full h-12 px-3 rounded-xl border-2 border-gray-200 focus:border-[#A71930] focus:outline-none text-sm"
                  >
                    {SLOT_START_TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">종료</label>
                  <select
                    value={manual.endTime}
                    onChange={(e) => setManual({ ...manual, endTime: e.target.value })}
                    className="w-full h-12 px-3 rounded-xl border-2 border-gray-200 focus:border-[#A71930] focus:outline-none text-sm"
                  >
                    {TIME_SELECT_OPTIONS.filter((t) => parseHHMM(t) > parseHHMM(manual.startTime)).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeSheet}
                  className="flex-1 h-14 rounded-2xl font-bold text-gray-700 bg-gray-100 transition-all active:scale-95"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveManual}
                  className="flex-1 h-14 rounded-2xl font-bold text-white transition-all active:scale-95"
                  style={{ backgroundColor: "#A71930" }}
                >
                  {editingId ? "저장" : "추가"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
