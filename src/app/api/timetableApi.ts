import type { TimetableCourse } from "../mocks/timetable";
import { apiRequest } from "./client";

export type TimetableEntryResponse = {
  entryId: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  professorName: string;
  departmentName: string;
  scheduleText: string;
  classroom: string;
  semesterYear: number;
  semesterTerm: string;
  /** 이 과목(동일 수업) 시간표에 등록한 사용자 수 */
  studentCount?: number;
};

function normalizeTime(t: string): string {
  const [h, m = "0"] = t.split(":");
  return `${String(Number(h)).padStart(2, "0")}:${String(Number(m)).padStart(2, "0")}`;
}

function parseScheduleText(scheduleText: string): {
  days: string[];
  startTime: string;
  endTime: string;
} {
  const range = scheduleText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  const dayMatches = scheduleText.match(/[월화수목금토일]/g) ?? [];
  const days = dayMatches.length > 0 ? Array.from(new Set(dayMatches)) : ["월"];
  if (!range) {
    return { days, startTime: "09:00", endTime: "10:00" };
  }
  return {
    days,
    startTime: normalizeTime(range[1]),
    endTime: normalizeTime(range[2]),
  };
}

export function timetableEntryToCourse(entry: TimetableEntryResponse): TimetableCourse {
  const parsed = parseScheduleText(entry.scheduleText);
  return {
    id: `server-${entry.entryId}`,
    serverCourseId: entry.courseId,
    studentCount:
      typeof entry.studentCount === "number" && Number.isFinite(entry.studentCount)
        ? Math.max(0, Math.floor(entry.studentCount))
        : undefined,
    name: entry.courseName,
    professor: entry.professorName,
    days: parsed.days,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    location: entry.classroom,
    type: "general",
  };
}

export async function addTimetableEntry(courseId: number) {
  return apiRequest<TimetableEntryResponse>("/api/timetable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
}

export async function getMyTimetable() {
  return apiRequest<TimetableEntryResponse[]>("/api/timetable/me");
}

export async function deleteTimetableEntry(entryId: number) {
  return apiRequest<string>(`/api/timetable/${entryId}`, {
    method: "DELETE",
  });
}

/** 서버가 시간표 기준으로 현재 수업이 없는 사용자 목록을 줄 때 사용 (엔드포인트 미구현 시 404 등) */
export type TimetableFreeNowUserDTO = {
  userId: number;
  nickname: string;
  major?: string | null;
  studentNumber?: string | null;
};

export async function getUsersFreeNowByTimetable() {
  return apiRequest<TimetableFreeNowUserDTO[]>("/api/timetable/users-free-now");
}

