import type { TimetableCourse } from "./timetable";
import { DEMO_ACCOUNTS } from "./demoAccounts";
import { subjectKey } from "../utils/courseKey";

/** 시드 시간표 5과목과 동일한 name+professor로 키 생성 */
const SK = {
  c1: subjectKey({ name: "필수교양: 세계와 시민", professor: "김나비" }),
  c2: subjectKey({ name: "도자성형1", professor: "이땡땡" }),
  c3: subjectKey({ name: "기초스페인어", professor: "박수박" }),
  c4: subjectKey({ name: "표현연습", professor: "최신식" }),
  c5: subjectKey({ name: "앱인벤터로 배우는 코딩", professor: "정다감" }),
};

/** 데모 5명이 같은 시드 시간표와 겹치도록 과목별 키 배열 (테스트용) */
const DEMO_PEER_COURSE_KEYS: string[][] = [
  [SK.c1, SK.c2, SK.c3, SK.c4, SK.c5],
  [SK.c1, SK.c4, SK.c2, SK.c3],
  [SK.c5, SK.c1, SK.c2],
  [SK.c2, SK.c4, SK.c1],
  [SK.c1, SK.c5],
];

const DEMO_BIOS = [
  "같은 과 같은 학년! 같이 과제하고 스터디해요~",
  "코딩 과제 같이 풀어요! 스터디원 모집 중",
  "교양·전공 정보 공유해요. 스터디 하실래요?",
  "교양 수업 정보 공유해요~",
  "코딩 스터디 같이 해요!",
];

const DEMO_HOBBIES: string[][] = [
  ["도예", "미술", "음악"],
  ["코딩", "게임", "운동"],
  ["독서", "카페", "영화"],
  ["미술", "전시", "카페"],
  ["코딩", "음악", "카페"],
];

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

/** 데모 계정 5명만 — 수업 매칭 테스트용 (시드 시간표와 동일 과목으로 겹침) */
export const CLASS_MATCH_PEER_DEFS: ClassMatchPeerDef[] = DEMO_ACCOUNTS.map((acc, i) => ({
  id: i + 1,
  userId: acc.id,
  department: acc.department,
  name: acc.nickname,
  year: acc.grade,
  bio: DEMO_BIOS[i] ?? "",
  hobbies: DEMO_HOBBIES[i] ?? [],
  courseKeys: DEMO_PEER_COURSE_KEYS[i] ?? [],
}));

export function isDemoAccountUserId(userId: string | undefined): boolean {
  if (!userId) return false;
  return DEMO_ACCOUNTS.some((a) => a.id === userId);
}

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
