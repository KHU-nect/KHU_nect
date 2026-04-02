import { apiRequest } from "./client";
import type { ClassMatchComputed } from "../mocks/classMatchPeers";
import type { TimetableCourse } from "../mocks/timetable";
import type { FreeSlotPeer } from "../mocks/freeSlotPeers";
import { subjectKey } from "../utils/courseKey";

export type CommonFreeSlotDto = {
  weekday?: string;
  dayOfWeek?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
};

export type FreePeriodUserDto = {
  userId?: number;
  nickname?: string | null;
  major?: string | null;
  departmentName?: string | null;
  studentNumber?: string | null;
  interestId?: number;
  interestName?: string | null;
  commonFreeSlots?: CommonFreeSlotDto[] | null;
  /** 있을 때만 프로필 오늘의 질문에 표시 */
  todayQuestion?: string | null;
  bio?: string | null;
  introduction?: string | null;
  /** 취미·관심사 문자열 목록 */
  hobbies?: unknown;
  interests?: unknown;
  interestNames?: string[] | null;
};

const WEEK_ALL = ["월", "화", "수", "목", "금", "토", "일"] as const;

const DAY_MAP: Record<string, string> = {
  MONDAY: "월",
  MON: "월",
  TUESDAY: "화",
  TUE: "화",
  WEDNESDAY: "수",
  WED: "수",
  THURSDAY: "목",
  THU: "목",
  FRIDAY: "금",
  FRI: "금",
  SATURDAY: "토",
  SAT: "토",
  SUNDAY: "일",
  SUN: "일",
};

function normalizeDayLabel(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  if (/^[월화수목금토일]$/.test(t)) return t;
  const u = t.toUpperCase();
  if (DAY_MAP[u]) return DAY_MAP[u];
  const n = parseInt(t, 10);
  if (n >= 1 && n <= 7) {
    const isoMonFirst = ["월", "화", "수", "목", "금", "토", "일"];
    return isoMonFirst[(n - 1) % 7];
  }
  return undefined;
}

function normalizeFreePeriodResponse(raw: unknown): FreePeriodUserDto[] {
  if (Array.isArray(raw)) return raw as FreePeriodUserDto[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const inner = o.users ?? o.matches ?? o.content ?? o.items;
    if (Array.isArray(inner)) return inner as FreePeriodUserDto[];
    const nested = o.data;
    if (Array.isArray(nested)) return nested as FreePeriodUserDto[];
    if (nested && typeof nested === "object") {
      const d = nested as Record<string, unknown>;
      const inner2 = d.users ?? d.matches ?? d.content ?? d.items;
      if (Array.isArray(inner2)) return inner2 as FreePeriodUserDto[];
    }
  }
  return [];
}

export type MatchingAcceptResult = {
  directChatRoomId: number | string;
};

function extractDirectChatRoomId(raw: unknown): string | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const top = o.directChatRoomId ?? o.direct_chat_room_id;
  if (top != null && top !== "") return String(top);
  const data = o.data;
  if (data != null && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const inner = d.directChatRoomId ?? d.direct_chat_room_id;
    if (inner != null && inner !== "") return String(inner);
  }
  return undefined;
}

/** 공강 등 매칭 수락 → 1:1 채팅방 ID (기존 direct-chat API와 동일) */
export async function acceptMatching(targetUserId: number): Promise<{ directChatRoomId: string }> {
  const raw = await apiRequest<unknown>(
    `/api/matching/accept/${encodeURIComponent(String(Math.trunc(targetUserId)))}`,
    { method: "POST" }
  );
  const directChatRoomId = extractDirectChatRoomId(raw);
  if (!directChatRoomId) {
    throw new Error("directChatRoomId가 응답에 없습니다.");
  }
  return { directChatRoomId };
}

export async function getFreePeriodMatches(interestId?: number): Promise<FreePeriodUserDto[]> {
  const q = new URLSearchParams();
  if (interestId != null && Number.isFinite(interestId)) {
    q.set("interestId", String(Math.trunc(interestId)));
  }
  const suffix = q.toString() ? `?${q}` : "";
  const raw = await apiRequest<unknown>(`/api/matching/free-period${suffix}`);
  return normalizeFreePeriodResponse(raw);
}

function pushHobbyName(seen: Set<string>, out: string[], raw?: string | null) {
  const t = raw?.trim();
  if (!t || seen.has(t)) return;
  seen.add(t);
  out.push(t);
}

function collectFromHobbyLikeList(seen: Set<string>, out: string[], list: unknown) {
  if (!Array.isArray(list)) return;
  for (const item of list) {
    if (typeof item === "string") pushHobbyName(seen, out, item);
    else if (item && typeof item === "object" && "name" in item) {
      const n = (item as { name?: string | null }).name;
      pushHobbyName(seen, out, n ?? undefined);
    }
  }
}

/** 백엔드가 내려주는 hobbies / interests / interestNames / interestName 통합 */
export function collectHobbiesFromFreePeriodDto(d: FreePeriodUserDto): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  collectFromHobbyLikeList(seen, out, d.hobbies);
  collectFromHobbyLikeList(seen, out, d.interests);
  if (Array.isArray(d.interestNames)) {
    for (const x of d.interestNames) {
      if (typeof x === "string") pushHobbyName(seen, out, x);
    }
  }
  pushHobbyName(seen, out, d.interestName);
  return out;
}

function formatSlotSummary(slots: CommonFreeSlotDto[]): string {
  if (slots.length === 0) return "공강 시간을 맞춰 봐요";
  const parts = slots.slice(0, 4).map((s) => {
    const d = normalizeDayLabel(s.weekday ?? s.dayOfWeek ?? s.day) ?? "?";
    const st = s.startTime?.trim() ?? "?";
    const en = s.endTime?.trim() ?? "?";
    return `${d} ${st}~${en}`;
  });
  const more = slots.length > 4 ? ` 외 ${slots.length - 4}개` : "";
  return parts.join(", ") + more;
}

export function freePeriodUserToPeer(d: FreePeriodUserDto, index: number): FreeSlotPeer | null {
  const uid = d.userId;
  if (uid == null || typeof uid !== "number") return null;
  const slots = d.commonFreeSlots ?? [];
  const first = slots[0];
  const days = [
    ...new Set(
      slots
        .map((s) => normalizeDayLabel(s.weekday ?? s.dayOfWeek ?? s.day))
        .filter((x): x is string => !!x)
    ),
  ];
  const sn = d.studentNumber?.trim() ?? "";
  const year = sn.length >= 2 ? `${sn.slice(0, 2)}학번` : "";
  const hobbies = collectHobbiesFromFreePeriodDto(d);
  const tagLabel = hobbies[0] ?? d.interestName?.trim() ?? "";
  const dept = d.major?.trim() || d.departmentName?.trim() || "";
  const todayQ = d.todayQuestion?.trim() || "";
  const bioRaw = d.bio?.trim() || d.introduction?.trim() || "";

  return {
    id: 6_000_000_000 + uid * 1_000 + index,
    userId: String(uid),
    department: dept,
    name: d.nickname?.trim() || "쿠옹이",
    year,
    activity: "",
    slotSummary: `겹치는 공강: ${formatSlotSummary(slots)}`,
    todayQuestion: todayQ || undefined,
    commonFreeSlots: slots,
    tag: tagLabel ? `#${tagLabel}` : "#공강매칭",
    hobbies,
    bio: bioRaw,
    time: first ? `${first.startTime?.trim() ?? "?"}~${first.endTime?.trim() ?? "?"}` : "시간표 기준",
    location: "캠퍼스",
    freeDays: days.length ? days : [...WEEK_ALL],
    freeStart: first?.startTime?.trim() ?? "09:00",
    freeEnd: first?.endTime?.trim() ?? "18:00",
  };
}

export function mapFreePeriodUsersToPeers(rows: FreePeriodUserDto[]): FreeSlotPeer[] {
  return rows
    .map((d, i) => freePeriodUserToPeer(d, i))
    .filter((p): p is FreeSlotPeer => p != null);
}

// —— 수업 매칭 GET /api/matching/class ——

export type CommonCourseDto = {
  courseName?: string;
  name?: string;
  title?: string;
  professorName?: string;
  professor?: string;
};

export type ClassMatchUserDto = {
  userId?: number;
  nickname?: string | null;
  major?: string | null;
  departmentName?: string | null;
  studentNumber?: string | null;
  interestId?: number;
  interestName?: string | null;
  commonCourses?: CommonCourseDto[] | null;
  todayQuestion?: string | null;
  bio?: string | null;
  introduction?: string | null;
  hobbies?: unknown;
  interests?: unknown;
  interestNames?: string[] | null;
};

export type ClassMatchMateRow = ClassMatchComputed & {
  matchPostId?: number;
  todayQuestion?: string;
};

function formatCommonCourseLine(c: CommonCourseDto): string {
  const title = (c.courseName ?? c.name ?? c.title ?? "").trim();
  const prof = (c.professorName ?? c.professor ?? "").trim();
  if (title && prof) return `${title} · ${prof}`;
  if (title) return title;
  if (prof) return prof;
  return "";
}

function keyFromCommonCourse(c: CommonCourseDto): string | null {
  const name = (c.courseName ?? c.name ?? c.title ?? "").trim();
  const prof = (c.professorName ?? c.professor ?? "").trim();
  if (!name || !prof) return null;
  return subjectKey({ name, professor: prof });
}

function normalizeClassMatchResponse(raw: unknown): ClassMatchUserDto[] {
  if (Array.isArray(raw)) return raw as ClassMatchUserDto[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const inner = o.users ?? o.matches ?? o.content ?? o.items ?? o.peers;
    if (Array.isArray(inner)) return inner as ClassMatchUserDto[];
    const nested = o.data;
    if (Array.isArray(nested)) return nested as ClassMatchUserDto[];
    if (nested && typeof nested === "object") {
      const d = nested as Record<string, unknown>;
      const inner2 = d.users ?? d.matches ?? d.content ?? d.items ?? d.peers;
      if (Array.isArray(inner2)) return inner2 as ClassMatchUserDto[];
    }
  }
  return [];
}

export async function getClassMatches(interestId?: number): Promise<ClassMatchUserDto[]> {
  const q = new URLSearchParams();
  if (interestId != null && Number.isFinite(interestId)) {
    q.set("interestId", String(Math.trunc(interestId)));
  }
  const suffix = q.toString() ? `?${q}` : "";
  const raw = await apiRequest<unknown>(`/api/matching/class${suffix}`);
  return normalizeClassMatchResponse(raw);
}

export function classMatchUserDtoToBackendRow(
  d: ClassMatchUserDto,
  myCourses: TimetableCourse[],
  index: number
): ClassMatchMateRow | null {
  const uid = d.userId;
  if (uid == null || typeof uid !== "number") return null;

  const myKeys = new Set(myCourses.map((c) => subjectKey(c)));
  const common = d.commonCourses ?? [];
  const sharedKeys: string[] = [];
  for (const c of common) {
    const k = keyFromCommonCourse(c);
    if (k && myKeys.has(k) && !sharedKeys.includes(k)) sharedKeys.push(k);
  }

  const sharedClasses =
    common.length > 0
      ? common.map((c) => {
          const line = formatCommonCourseLine(c);
          return line || "공통 수업";
        })
      : [];

  const n = myCourses.length;
  const overlapForRate = sharedKeys.length > 0 ? sharedKeys.length : common.length;
  const sharedCount = common.length || sharedKeys.length;
  const matchingRate =
    n === 0 ? 0 : Math.min(100, Math.round((overlapForRate / n) * 100));

  const sn = d.studentNumber?.trim() ?? "";
  const year = sn.length >= 2 ? `${sn.slice(0, 2)}학번` : "";

  return {
    id: 5_000_000_000 + uid * 1_000 + index,
    userId: String(uid),
    department: d.major?.trim() || d.departmentName?.trim() || "학과 미정",
    name: d.nickname?.trim() || "쿠옹이",
    year,
    bio: d.bio?.trim() || d.introduction?.trim() || "",
    hobbies: collectHobbiesFromFreePeriodDto(d as FreePeriodUserDto),
    courseKeys: sharedKeys,
    sharedClasses,
    sharedKeys,
    sharedCount,
    matchingRate,
    todayQuestion: d.todayQuestion?.trim() || undefined,
  };
}
