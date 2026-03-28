import type { TimetableCourse } from "../mocks/timetable";

export type CourseGroup = {
  /** 채팅·상세 진입용 (과목당 하나의 id) */
  representativeId: string;
  name: string;
  professor: string;
  type: "major" | "general";
  /** 과목당 항상 1개 — UI 호환을 위해 배열 유지 */
  slots: TimetableCourse[];
};

/** 과목 단위로 이미 나뉘어 있으므로 정렬만 수행한다. */
export function groupCoursesBySubject(courses: TimetableCourse[]): CourseGroup[] {
  const sorted = [...courses].sort((a, b) => {
    const t = a.startTime.localeCompare(b.startTime);
    if (t !== 0) return t;
    return a.name.localeCompare(b.name);
  });
  return sorted.map((c) => ({
    representativeId: c.id,
    name: c.name,
    professor: c.professor,
    type: c.type,
    slots: [c],
  }));
}

export function getCourseIdsInGroup(group: CourseGroup): string[] {
  return [group.representativeId];
}

/** 묶인 수업들의 채팅방 중 가장 최근 메시지 본문 */
export function getLatestChatPreviewContent(
  getVisibleMessages: (courseId: string) => { content: string; createdAt: string }[],
  courseIds: string[]
): string {
  let best: { content: string; createdAt: string } | null = null;
  for (const id of courseIds) {
    const msgs = getVisibleMessages(id);
    const last = msgs[msgs.length - 1];
    if (!last) continue;
    if (!best || new Date(last.createdAt) > new Date(best.createdAt)) {
      best = last;
    }
  }
  return best?.content ?? "아직 메시지가 없어요";
}
