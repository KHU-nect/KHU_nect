import type { TimetableCourse } from "../mocks/timetable";

/** 과목명+교수 기준 동일 과목 식별 (수업 매칭·인원 집계와 동일) */
export function subjectKey(c: Pick<TimetableCourse, "name" | "professor">): string {
  return `${c.name}\0${c.professor}`;
}
