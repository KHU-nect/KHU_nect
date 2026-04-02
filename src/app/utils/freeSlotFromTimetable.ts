import type { TimetableFreeNowUserDTO } from "../api/timetableApi";
import type { FreeSlotPeer } from "../mocks/freeSlotPeers";
import type { TimetableCourse } from "../mocks/timetable";
import { parseHHMM } from "./timetableGrid";

const DAY_LABELS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 오늘 요일·현재 시각이 해당 과목의 수업 시간 안이면 true (종료 시각은 비포함) */
export function isCourseSessionActiveNow(course: TimetableCourse, now: Date): boolean {
  const today = DAY_LABELS_KO[now.getDay()];
  if (!course.days.includes(today)) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = parseHHMM(course.startTime);
  const end = parseHHMM(course.endTime);
  if (end <= start) {
    return cur >= start;
  }
  return cur >= start && cur < end;
}

export function isBusyNowFromTimetable(courses: TimetableCourse[], now: Date): boolean {
  return courses.some((c) => isCourseSessionActiveNow(c, now));
}

const WEEK_ALL = ["월", "화", "수", "목", "금", "토", "일"];

export function mapTimetableFreeNowUsersToPeers(users: TimetableFreeNowUserDTO[]): FreeSlotPeer[] {
  return users.map((u) => {
    const sn = (u.studentNumber ?? "").trim();
    const year = sn.length >= 2 ? `${sn.slice(0, 2)}학번` : "";
    return {
      id: 60_000 + (u.userId % 40_000),
      userId: String(u.userId),
      department: u.major?.trim() || "학과 미정",
      name: u.nickname?.trim() || "쿠옹이",
      year,
      activity: "시간표 기준 지금 공강",
      tag: "#공강",
      hobbies: [],
      bio: "",
      matchingRate: 0,
      time: "지금",
      location: "캠퍼스",
      freeDays: [...WEEK_ALL],
      freeStart: "00:00",
      freeEnd: "23:59",
    };
  });
}
