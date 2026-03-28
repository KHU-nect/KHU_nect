import type { TimetableCourse } from "../mocks/timetable";
import { DEMO_ACCOUNTS } from "../mocks/demoAccounts";
import { readTimetableSnapshotForUser } from "./timetableStorage";
import { subjectKey } from "./courseKey";

function rosterHasCourse(list: TimetableCourse[], course: TimetableCourse): boolean {
  const key = subjectKey(course);
  return list.some((c) => subjectKey(c) === key);
}

/**
 * 데모 계정들의 저장된 시간표를 합쳐, 해당 과목(과목명+교수)을 듣는 인원 수를 센다.
 * 한 계정이 그 과목을 지우면 다른 계정 데이터는 그대로이므로 숫자가 줄어든다.
 */
export function getCourseListenerCount(course: TimetableCourse): number {
  let n = 0;
  for (const account of DEMO_ACCOUNTS) {
    const list = readTimetableSnapshotForUser(account.id);
    if (rosterHasCourse(list, course)) n++;
  }
  return n;
}
