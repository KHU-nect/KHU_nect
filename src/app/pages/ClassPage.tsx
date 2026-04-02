import { useParams, Link } from "react-router";
import { ArrowLeft, Users } from "lucide-react";
import { useTimetable } from "../context/TimetableContext";
import { ClassChatThread } from "../components/ClassChatThread";
import { getCourseListenerCount } from "../utils/courseListenerCount";

export function ClassPage() {
  const { id } = useParams();
  const { courses } = useTimetable();

  const course = courses.find((c) => {
    if (c.id === id) return true;
    if (c.serverCourseId && id === `course-${c.serverCourseId}`) return true;
    return false;
  }) ?? courses[0];
  const courseName = course?.name ?? "수업 라운지";
  const professor = course?.professor ?? "";
  const listenerCount = course ? getCourseListenerCount(course) : 0;

  return (
    <div className="h-screen flex flex-col bg-white max-w-md md:max-w-2xl lg:max-w-3xl mx-auto">
      <div className="bg-white border-b border-gray-200 px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/home" className="hover:bg-gray-100 p-2 rounded-lg transition-colors -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-800 truncate">{courseName}</h1>
            <p className="text-xs text-gray-500">{professor} 교수님</p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: "#FDF5E6" }}
          >
            <Users className="w-3.5 h-3.5" style={{ color: "#A71930" }} />
            <span className="text-xs font-semibold" style={{ color: "#A71930" }}>
              {listenerCount}
            </span>
          </div>
        </div>
      </div>

      {course?.id ? (
        <ClassChatThread courseId={course.id} serverCourseId={course.serverCourseId} />
      ) : (
        <div className="flex-1 flex items-center justify-center px-6 text-sm text-gray-500">
          시간표에 수업이 없어요.
        </div>
      )}
    </div>
  );
}
