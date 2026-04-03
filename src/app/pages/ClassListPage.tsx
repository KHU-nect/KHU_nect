import { useMemo } from "react";
import { Link } from "react-router";
import { BookOpen, Users, MessageCircle, Clock, Calendar } from "lucide-react";
import { useTimetable } from "../context/TimetableContext";
import { useClassChat } from "../context/ClassChatContext";
import {
  getCourseIdsInGroup,
  getLatestChatPreviewContent,
  groupCoursesBySubject,
} from "../utils/courseGroups";
import { getCourseListenerCount } from "../utils/courseListenerCount";
import { getCourseAccentColor } from "../utils/courseAccentColor";

export function ClassListPage() {
  const { courses } = useTimetable();
  const { getVisibleMessages } = useClassChat();

  const courseGroups = useMemo(() => groupCoursesBySubject(courses), [courses]);

  return (
    <div className="min-h-screen bg-gray-50 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">내 수업</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {courseGroups.length}개의 수업을 듣고 있어요
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: "#FDF5E6" }}>
              <BookOpen className="w-4 h-4" style={{ color: "#A71930" }} />
              <span className="text-sm font-semibold" style={{ color: "#A71930" }}>
                  {courseGroups.length}
              </span>
            </div>
            <Link
              to="/home/my-timetable"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
              style={{ backgroundColor: "#A71930" }}
            >
              <Calendar className="w-4 h-4" />
              <span>시간표</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-5 pt-4 pb-2">
        <div 
          className="rounded-xl p-3 border"
          style={{ backgroundColor: "#FDF5E6", borderColor: "#E6A620" }}
        >
          <p className="text-xs text-gray-700">
            💬 수업을 선택하면 익명 채팅방에 참여할 수 있어요
          </p>
        </div>
      </div>

      {/* Course List */}
      <div className="px-5 py-3 space-y-3">
        {courseGroups.map((group) => {
          const ids = getCourseIdsInGroup(group);
          const previewText = getLatestChatPreviewContent(getVisibleMessages, ids);
          const routeId = group.slots[0]?.serverCourseId
            ? `course-${group.slots[0].serverCourseId}`
            : group.representativeId;

          return (
          <Link
            key={group.representativeId}
            to={`/home/class/${routeId}`}
            className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-[#E6A620] transition-all"
          >
            {/* Course Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-1 h-4 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: getCourseAccentColor(
                        `${group.representativeId}:${group.name}:${group.professor}`
                      ),
                    }}
                  />
                  <h3 className="font-bold text-gray-900 text-sm truncate">
                    {group.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  {group.professor} 교수님
                </p>
              </div>
              
              {/* Online Count Badge */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 flex-shrink-0">
                <Users className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-bold text-green-600">
                  {getCourseListenerCount(group.slots[0])}
                </span>
              </div>
            </div>

            {/* 시간 (요일별 한 줄씩) + 강의실 */}
            <div className="space-y-1 mb-2">
              {group.slots.map((slot) => (
                <div key={slot.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#A71930" }} />
                  <span>
                    {slot.days.join("·")} {slot.startTime}-{slot.endTime}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#E6A620" }} />
              <span className="truncate">{group.slots[0]?.location}</span>
            </div>

            {/* Recent Message */}
            <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
              <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#A71930" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 mb-0.5">최근 메시지</p>
                <p className="text-xs text-gray-700 line-clamp-2 leading-snug">
                  {previewText}
                </p>
              </div>
            </div>

            {/* Enter Button */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: "#A71930" }}>
                <MessageCircle className="w-4 h-4" />
                <span>채팅방 입장하기</span>
              </div>
            </div>
          </Link>
          );
        })}
      </div>

      {/* Bottom Spacing */}
      <div className="h-6" />
    </div>
  );
}
