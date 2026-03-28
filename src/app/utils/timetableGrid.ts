import type { TimetableCourse } from "../mocks/timetable";

export const DAY_LABELS = ["월", "화", "수", "목", "금"] as const;

/** 월~금만 남기고 순서 정렬·중복 제거 */
export function sortWeekdayLabels(days: string[]): string[] {
  const set = [...new Set(days)].filter((d): d is (typeof DAY_LABELS)[number] =>
    DAY_LABELS.includes(d as (typeof DAY_LABELS)[number])
  );
  return set.sort(
    (a, b) => DAY_LABELS.indexOf(a) - DAY_LABELS.indexOf(b)
  );
}

const GRID_START_MIN = 9 * 60;
const SLOT_MINUTES = 30;
export const SLOT_PX = 32;

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** 시작 선택 (15분 단위, mock의 14:15 등과 호환) */
export const SLOT_START_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let m = 9 * 60; m <= 18 * 60 + 30; m += 15) {
    out.push(formatMinutes(m));
  }
  return out;
})();

/** 시작·종료 선택 (15분 단위, 종료는 19:15까지) */
export const TIME_SELECT_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = 9 * 60; m <= 19 * 60 + 15; m += 15) {
    out.push(formatMinutes(m));
  }
  return out;
})();

export function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function courseBlockPixels(startTime: string, endTime: string): { top: number; height: number } {
  const startM = parseHHMM(startTime);
  const endM = parseHHMM(endTime);
  const top = ((startM - GRID_START_MIN) / SLOT_MINUTES) * SLOT_PX;
  const height = ((endM - startM) / SLOT_MINUTES) * SLOT_PX;
  return { top, height: Math.max(height, 22) };
}

/** 9:00 기준 그리드 행 수 (30분 단위). 최소 19행(9:00~18:30 구간 표시) */
export function gridRowCount(courses: TimetableCourse[]): number {
  const defaultLastEnd = 18 * 60 + 30;
  const maxEnd = Math.max(
    defaultLastEnd,
    ...courses.map((c) => parseHHMM(c.endTime))
  );
  const span = maxEnd - GRID_START_MIN;
  return Math.max(19, Math.ceil(span / SLOT_MINUTES));
}

const PALETTE = [
  "#FF6B6B",
  "#4ECDC4",
  "#95E1D3",
  "#F38181",
  "#AA96DA",
  "#A71930",
  "#E6A620",
  "#4A90E2",
  "#7B68EE",
  "#50C878",
];

/** 과목명·교수가 같으면 요일이 달라도 동일 색 (groupCoursesBySubject와 동일 기준) */
export function colorForCourse(course: Pick<TimetableCourse, "name" | "professor">): string {
  const key = `${course.name}\0${course.professor}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
