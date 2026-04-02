import { DEMO_ACCOUNTS } from "./demoAccounts";
import { isBusyNowFromTimetable } from "../utils/freeSlotFromTimetable";
import { parseHHMM } from "../utils/timetableGrid";
import { readTimetableSnapshotForUser } from "../utils/timetableStorage";

const DAY_LABELS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type FreeSlotPeer = {
  id: number;
  matchPostId?: number;
  /** 데모 계정(demo-user-1 …)과 매핑될 때만 설정 */
  userId?: string;
  department: string;
  name: string;
  year: string;
  /** 프로필·오늘의 질문용 (API 미제공 시 비움) */
  activity: string;
  /** 매칭 카드·목록 한 줄 (공강 요약 등). 없으면 activity 사용 */
  slotSummary?: string;
  /** API가 주는 오늘의 질문 */
  todayQuestion?: string;
  tag: string;
  hobbies: string[];
  bio: string;
  matchingRate?: number;
  time: string;
  location: string;
  freeDays: string[];
  freeStart: string;
  freeEnd: string;
};

/** 카드·리스트 제목: 학과 있으면 「OO과 쿠옹이」, 없으면 닉네임 또는 「쿠옹이」 */
export function peerCardHeadline(peer: Pick<FreeSlotPeer, "name" | "department">): string {
  const d = peer.department?.trim();
  if (d) return `${d} 쿠옹이`;
  const n = peer.name?.trim();
  if (n) return n;
  return "쿠옹이";
}

export function peerCardQuote(peer: Pick<FreeSlotPeer, "slotSummary" | "activity">): string {
  return peer.slotSummary?.trim() || peer.activity?.trim() || "";
}

const DEMO_ACCOUNT_IDS = new Set([
  "demo-user-1",
  "demo-user-2",
  "demo-user-3",
  "demo-user-4",
  "demo-user-5",
]);

export function isDemoAccountId(id: string | undefined): boolean {
  return !!id && DEMO_ACCOUNT_IDS.has(id);
}

const WEEK_ALL = ["월", "화", "수", "목", "금", "토", "일"];

/**
 * 데모 로그인 시: 5명 모두 "지금 공강"으로 간주 (시간대 무시), 본인 제외 4명 노출용
 */
export const DEMO_FREE_SLOT_PEERS: FreeSlotPeer[] = [
  {
    id: 201,
    userId: "demo-user-1",
    department: "도예학과",
    name: "도예 쿠옹이",
    year: "24학번",
    activity: "도자 스튜디오에서 작업 중",
    tag: "#도예작업",
    hobbies: ["독서", "사진", "영화감상"],
    bio: "흙 만지는 거 좋아해요. 같이 작업실 가실 분!",
    matchingRate: 90,
    time: "지금",
    location: "예술디자인관",
    freeDays: WEEK_ALL,
    freeStart: "00:00",
    freeEnd: "23:59",
  },
  {
    id: 202,
    userId: "demo-user-2",
    department: "컴퓨터공학과",
    name: "컴공 쿠옹이",
    year: "23학번",
    activity: "과방에서 과제 같이 할 사람",
    tag: "#과방",
    hobbies: ["운동", "카페투어", "독서"],
    bio: "알고리즘 스터디 모집 중이에요.",
    matchingRate: 88,
    time: "지금",
    location: "전자정보관",
    freeDays: WEEK_ALL,
    freeStart: "00:00",
    freeEnd: "23:59",
  },
  {
    id: 203,
    userId: "demo-user-3",
    department: "경영학과",
    name: "경영 쿠옹이",
    year: "22학번",
    activity: "중도 카공 ㄱ?",
    tag: "#중도카공",
    hobbies: ["카페투어", "독서", "영화감상"],
    bio: "조용한 데서 레포트 쳐요.",
    matchingRate: 85,
    time: "지금",
    location: "중앙도서관",
    freeDays: WEEK_ALL,
    freeStart: "00:00",
    freeEnd: "23:59",
  },
  {
    id: 204,
    userId: "demo-user-4",
    department: "산업디자인학과",
    name: "디자인 쿠옹이",
    year: "21학번",
    activity: "스케치하실 분",
    tag: "#스케치",
    hobbies: ["사진", "영화감상", "카페투어"],
    bio: "캠퍼스 스케치 같이 해요.",
    matchingRate: 82,
    time: "지금",
    location: "노천극장",
    freeDays: WEEK_ALL,
    freeStart: "00:00",
    freeEnd: "23:59",
  },
  {
    id: 205,
    userId: "demo-user-5",
    department: "전자공학과",
    name: "전자 쿠옹이",
    year: "20학번",
    activity: "실험 끝나고 산책 ㄱ",
    tag: "#산책",
    hobbies: ["운동", "독서", "사진"],
    bio: "날 좋을 때 캠퍼스 한 바퀴!",
    matchingRate: 80,
    time: "지금",
    location: "본관 앞",
    freeDays: WEEK_ALL,
    freeStart: "00:00",
    freeEnd: "23:59",
  },
];

export function isPeerFreeNow(peer: FreeSlotPeer, now: Date = new Date()): boolean {
  const today = DAY_LABELS_KO[now.getDay()];
  if (!peer.freeDays.includes(today)) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = parseHHMM(peer.freeStart);
  const end = parseHHMM(peer.freeEnd);
  return cur >= start && cur < end;
}

/**
 * 데모 계정: localStorage에 저장된 시간표 기준으로, 지금 수업 슬롯에 없는 사용자만 공강으로 표시.
 * 시간표가 비어 있으면 목록에서 제외합니다.
 */
export function freeSlotPeersFromDemoAccounts(now: Date, excludeUserId?: string): FreeSlotPeer[] {
  const peers: FreeSlotPeer[] = [];
  for (const account of DEMO_ACCOUNTS) {
    if (account.id === excludeUserId) continue;
    const courses = readTimetableSnapshotForUser(account.id);
    if (courses.length === 0) continue;
    if (isBusyNowFromTimetable(courses, now)) continue;
    const template = DEMO_FREE_SLOT_PEERS.find((p) => p.userId === account.id);
    if (template) {
      peers.push({
        ...template,
        activity: `${template.activity} · 지금은 시간표상 공강`,
      });
    } else {
      peers.push({
        id: 200 + peers.length,
        userId: account.id,
        department: account.department,
        name: account.nickname,
        year: account.grade,
        activity: "지금 공강이에요 (시간표 기준)",
        tag: "#공강",
        hobbies: [],
        bio: "",
        matchingRate: 0,
        time: "지금",
        location: "캠퍼스",
        freeDays: [...WEEK_ALL],
        freeStart: "00:00",
        freeEnd: "23:59",
      });
    }
  }
  return peers;
}

function peersFreeForUser(now: Date, currentUserId: string | undefined): FreeSlotPeer[] {
  if (isDemoAccountId(currentUserId)) {
    return freeSlotPeersFromDemoAccounts(now, currentUserId);
  }
  return FREE_SLOT_PEERS.filter((p) => isPeerFreeNow(p, now));
}

/** @param currentUserId 데모 계정이면 본인 제외한 나머지가 공강 목록에 포함됩니다. */
export function getPeersFreeNow(now?: Date, currentUserId?: string): FreeSlotPeer[] {
  const t = now ?? new Date();
  return peersFreeForUser(t, currentUserId);
}

/** 공강 매칭 탭: 지금 공강 + 내 취미와 겹치는 상대만 */
export function getPeersForMatchingTab(
  userHobbies: string[],
  selectedFilter: "all" | string,
  now?: Date,
  currentUserId?: string
): FreeSlotPeer[] {
  const t = now ?? new Date();
  const free = peersFreeForUser(t, currentUserId);
  if (userHobbies.length === 0) return [];

  const hasOverlap = (peer: FreeSlotPeer) =>
    peer.hobbies.some((h) => userHobbies.includes(h));

  if (selectedFilter === "all") {
    return free.filter(hasOverlap);
  }
  return free.filter(
    (p) => userHobbies.includes(selectedFilter) && p.hobbies.includes(selectedFilter)
  );
}

export const DEFAULT_USER_HOBBIES = ["카페 맛집", "독서", "영화", "요리", "러닝"];

export const FREE_SLOT_PEERS: FreeSlotPeer[] = [
  {
    id: 1,
    department: "경영학과",
    name: "경영 쿠옹이",
    year: "25학번",
    activity: "중앙도서관에서 카공",
    tag: "#중도카공",
    hobbies: ["카페투어", "독서", "영화"],
    bio: "커피 마시면서 공부하는 거 좋아해요!",
    matchingRate: 92,
    time: "10:00~12:00",
    location: "중앙도서관 3층",
    freeDays: WEEK_ALL,
    freeStart: "10:00",
    freeEnd: "12:00",
  },
  {
    id: 2,
    department: "컴퓨터공학과",
    name: "컴공 쿠옹이",
    year: "23학번",
    activity: "배드민턴 치실 분?",
    tag: "#배드민턴",
    hobbies: ["운동", "코딩", "게임"],
    bio: "체육관에서 운동하는 거 좋아합니다!",
    matchingRate: 88,
    time: "12:00~14:00",
    location: "체육관",
    freeDays: WEEK_ALL,
    freeStart: "12:00",
    freeEnd: "14:00",
  },
  {
    id: 3,
    department: "국제학과",
    name: "국제 쿠옹이",
    year: "20학번",
    activity: "노천극장 산책 ㄱ?",
    tag: "#노천극장산책",
    hobbies: ["산책", "사진", "여행"],
    bio: "평화로운 곳에서 산책하는 게 좋아요.",
    matchingRate: 85,
    time: "14:00~16:00",
    location: "노천극장",
    freeDays: WEEK_ALL,
    freeStart: "14:00",
    freeEnd: "16:00",
  },
  {
    id: 4,
    department: "산업경영공학과",
    name: "산공 쿠옹이",
    year: "23학번",
    activity: "같이 혼밥하실 분?",
    tag: "#혼밥메이트",
    hobbies: ["맛집투어", "요리", "독서"],
    bio: "학식 먹으면서 수다떨기 좋아해요!",
    matchingRate: 80,
    time: "11:30~13:30",
    location: "학생식당",
    freeDays: WEEK_ALL,
    freeStart: "11:30",
    freeEnd: "13:30",
  },
  {
    id: 5,
    department: "전자공학과",
    name: "전공 쿠옹이",
    year: "21학번",
    activity: "카페에서 공부할 사람",
    tag: "#카페공부",
    hobbies: ["공부", "카페", "음악"],
    bio: "조용한 카페에서 집중하는 걸 좋아합니다.",
    matchingRate: 78,
    time: "15:00~17:00",
    location: "학교 앞 카페",
    freeDays: WEEK_ALL,
    freeStart: "15:00",
    freeEnd: "17:00",
  },
  {
    id: 6,
    department: "도예학과",
    name: "도예 쿠옹이",
    year: "26학번",
    activity: "점심 같이 먹을래요?",
    tag: "#점심메이트",
    hobbies: ["음악", "공연", "영화"],
    bio: "음식 먹으면서 친해지는 게 좋아요!",
    matchingRate: 75,
    time: "12:00~13:30",
    location: "정문 근처",
    freeDays: WEEK_ALL,
    freeStart: "12:00",
    freeEnd: "13:30",
  },
  {
    id: 7,
    department: "응용화학과",
    name: "응화 쿠옹이",
    year: "21학번",
    activity: "중도에서 같이 공부해요",
    tag: "#스터디",
    hobbies: ["수학", "스터디", "독서"],
    bio: "같이 공부하면서 동기부여 받고 싶어요!",
    matchingRate: 73,
    time: "09:00~11:00",
    location: "중앙도서관 2층",
    freeDays: WEEK_ALL,
    freeStart: "09:00",
    freeEnd: "11:00",
  },
  {
    id: 8,
    department: "건축학과",
    name: "건축 쿠옹이",
    year: "23학번",
    activity: "캠퍼스 산책하실 분",
    tag: "#산책",
    hobbies: ["사진", "건축", "산책"],
    bio: "경희대 건물들 구경하면서 걷는 거 좋아해요!",
    matchingRate: 70,
    time: "16:00~18:00",
    location: "캠퍼스 로드",
    freeDays: WEEK_ALL,
    freeStart: "16:00",
    freeEnd: "18:00",
  },
  {
    id: 9,
    department: "스페인어학과",
    name: "스페인 쿠옹이",
    year: "22학번",
    activity: "중도에서 같이 공부해요",
    tag: "#중도스터디",
    hobbies: ["독서", "영화감상", "카페투어"],
    bio: "조용히 집중해서 과제해요!",
    matchingRate: 86,
    time: "13:00~15:00",
    location: "중앙도서관 3층",
    freeDays: WEEK_ALL,
    freeStart: "13:00",
    freeEnd: "15:00",
  },
  {
    id: 10,
    department: "소프트웨어학과",
    name: "소프트 쿠옹이",
    year: "24학번",
    activity: "점심 같이 먹을래요?",
    tag: "#학식",
    hobbies: ["운동", "영화감상", "게임"],
    bio: "학식 메뉴 같이 고르실 분!",
    matchingRate: 82,
    time: "11:30~13:00",
    location: "학생식당",
    freeDays: WEEK_ALL,
    freeStart: "11:30",
    freeEnd: "13:00",
  },
];
