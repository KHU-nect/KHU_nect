import type { TimetableCourse } from "../mocks/timetable";

/**
 * 수업 듣는 인원 표시.
 * - 서버 시간표에서 온 `studentCount`가 있으면 그 값 사용
 * - 그 외는 0
 */
export function getCourseListenerCount(course: TimetableCourse): number {
  if (typeof course.studentCount === "number" && Number.isFinite(course.studentCount)) {
    return Math.max(0, Math.floor(course.studentCount));
  }
  return 0;
}
