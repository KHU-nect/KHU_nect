import type { TimetableCourse } from "./timetable";
import { sortWeekdayLabels } from "../utils/timetableGrid";

/** 온보딩·시간표 수정 검색용 카탈로그 */
export type CatalogCourse = {
  id: number;
  name: string;
  professor: string;
  /** 예: `월 13:00-15:00`, `월·수 13:00-15:00`, `월 수 13:00-15:00` */
  time: string;
  room: string;
};

export const AVAILABLE_COURSES: CatalogCourse[] = [
  { id: 1, name: "필수교양: 세계와 시민", professor: "김나비", time: "월·수 13:00-15:00", room: "청운관 301" },
  { id: 2, name: "도자성형1", professor: "이땡땡", time: "화·목 10:00-13:00", room: "예술디자인관 201" },
  { id: 3, name: "기초스페인어", professor: "박수박", time: "수 09:00-10:30", room: "외국어교육관 402" },
  { id: 4, name: "표현연습", professor: "최신식", time: "목 14:00-16:00", room: "본관 503" },
  { id: 5, name: "앱인벤터로 배우는 코딩", professor: "정다감", time: "금 10:00-12:00", room: "전자정보관 B101" },
  { id: 6, name: "도자문화이야기", professor: "박수박", time: "화 14:00-16:00", room: "예술디자인관 305" },
  { id: 7, name: "세계시민교육론", professor: "김나비", time: "수 13:00-15:00", room: "청운관 205" },
  { id: 8, name: "스페인어회화", professor: "이베리아", time: "목 10:00-12:00", room: "외국어교육관 301" },
];

function normalizeTime(t: string): string {
  const s = t.trim();
  const [h, m = "0"] = s.split(":");
  const hi = Number(h);
  const mi = Number(m);
  return `${String(hi).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

function parseCatalogTime(time: string): { days: string[]; startTime: string; endTime: string } {
  const rangeMatch = time.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!rangeMatch) {
    return { days: ["월"], startTime: "09:00", endTime: "10:30" };
  }
  const rangeStart = time.indexOf(rangeMatch[0]);
  const prefix = time.slice(0, rangeStart).trim();
  const rawDays = prefix.split(/[\s·,]+/).filter(Boolean);
  const days = sortWeekdayLabels(rawDays);
  return {
    days: days.length > 0 ? days : ["월"],
    startTime: normalizeTime(rangeMatch[1]),
    endTime: normalizeTime(rangeMatch[2]),
  };
}

/** 카탈로그 한 줄 → 시간표 저장 형식 (고유 id 필요 시 suffix 전달) */
export function catalogToTimetableCourse(
  course: CatalogCourse,
  idSuffix: string | number = Date.now()
): TimetableCourse {
  const { days, startTime, endTime } = parseCatalogTime(course.time);
  return {
    id: `course-${course.id}-${idSuffix}`,
    name: course.name,
    professor: course.professor,
    days,
    startTime,
    endTime,
    location: course.room,
    type: "general",
  };
}
