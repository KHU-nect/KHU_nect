import type { TimetableCourse } from "../mocks/timetable";
import { DEMO_ACCOUNTS } from "../mocks/demoAccounts";
import { readTimetableSnapshotForUser } from "./timetableStorage";
import { subjectKey } from "./courseKey";

function rosterHasCourse(list: TimetableCourse[], course: TimetableCourse): boolean {
  const key = subjectKey(course);
  return list.some((c) => subjectKey(c) === key);
}

/**
 * 수업 듣는 인원 표시.
 * - 서버 시간표(`GET /api/timetable/me`)에서 온 `studentCount`가 있으면 그 값 사용
 * - 그 외(데모·로컬 목업)는 데모 계정들의 저장된 시간표로 과목 키 매칭해 추정
 */
export function getCourseListenerCount(course: TimetableCourse): number {
  if (typeof course.studentCount === "number" && Number.isFinite(course.studentCount)) {
    return Math.max(0, Math.floor(course.studentCount));
  }
  if (course.serverCourseId != null) {
    return 0;
  }
  let n = 0;
  for (const account of DEMO_ACCOUNTS) {
    const list = readTimetableSnapshotForUser(account.id);
    if (rosterHasCourse(list, course)) n++;
  }
  return n;
}
