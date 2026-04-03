import type { TimetableCourse } from "./timetable";
import { subjectKey } from "../utils/courseKey";

export type ClassMatchPeerDef = {
  id: number;
  userId: string;
  department: string;
  name: string;
  year: string;
  bio: string;
  hobbies: string[];
  /** 수강한다고 가정하는 과목 키 목록 */
  courseKeys: string[];
};

/** 로컬 목업 피어 없음 — 수업 매칭은 API만 사용 */
export const CLASS_MATCH_PEER_DEFS: ClassMatchPeerDef[] = [];

export type ClassMatchComputed = ClassMatchPeerDef & {
  sharedClasses: string[];
  /** 내 시간표와 겹치는 과목 키 (firstSharedCourseId 등에 사용) */
  sharedKeys: string[];
  sharedCount: number;
  matchingRate: number;
};

/** 내 시간표와 겹치는 공통 과목 수가 많은 순으로 정렬. 공통 0명은 제외. 본인은 제외 */
export function computeClassMatches(
  myCourses: TimetableCourse[],
  options?: { excludeUserId?: string }
): ClassMatchComputed[] {
  const myKeys = new Set(myCourses.map((c) => subjectKey(c)));
  const keyToName = new Map(myCourses.map((c) => [subjectKey(c), c.name] as const));
  const n = myCourses.length;
  const exclude = options?.excludeUserId;

  const rows: ClassMatchComputed[] = CLASS_MATCH_PEER_DEFS.map((peer) => {
    const sharedKeys = peer.courseKeys.filter((k) => myKeys.has(k));
    const sharedClasses = sharedKeys.map((k) => keyToName.get(k) ?? k.split("\0")[0]);
    const sharedCount = sharedKeys.length;
    const matchingRate =
      n === 0 ? 0 : Math.min(100, Math.round((sharedCount / n) * 100));
    return { ...peer, sharedClasses, sharedKeys, sharedCount, matchingRate };
  })
    .filter((r) => r.sharedCount > 0)
    .filter((r) => !exclude || r.userId !== exclude)
    .sort((a, b) => {
      if (b.sharedCount !== a.sharedCount) return b.sharedCount - a.sharedCount;
      return b.matchingRate - a.matchingRate;
    });

  return rows;
}

/** 공통 과목 중 내 시간표에서 첫 번째 수업 id (DM 메타용) */
export function firstSharedCourseId(
  myCourses: TimetableCourse[],
  sharedKeys: string[]
): string | undefined {
  const set = new Set(sharedKeys);
  for (const c of myCourses) {
    if (set.has(subjectKey(c))) return c.id;
  }
  return undefined;
}
