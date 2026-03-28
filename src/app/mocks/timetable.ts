/**
 * 한 과목은 한 레코드이며, 같은 시간·강의실로 듣는 요일은 `days`에 모읍니다.
 * (예: 월·수 수업 → `days: ["월", "수"]`, `startTime` / `endTime` / `location` 공통)
 *
 * 기본 시드는 카탈로그 1~5번과 동일 과목(테스트 계정 5명 공통 수강과 맞춤).
 */
export type TimetableCourse = {
  id: string;
  name: string;
  professor: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
  type: "major" | "general";
};

export const mockTimetable: TimetableCourse[] = [
  {
    id: "course-1",
    name: "필수교양: 세계와 시민",
    professor: "김나비",
    days: ["월", "수"],
    startTime: "13:00",
    endTime: "15:00",
    location: "청운관 301",
    type: "general",
  },
  {
    id: "course-2",
    name: "도자성형1",
    professor: "이땡땡",
    days: ["화", "목"],
    startTime: "10:00",
    endTime: "13:00",
    location: "예술디자인관 201",
    type: "major",
  },
  {
    id: "course-3",
    name: "기초스페인어",
    professor: "박수박",
    days: ["수"],
    startTime: "09:00",
    endTime: "10:30",
    location: "외국어교육관 402",
    type: "general",
  },
  {
    id: "course-4",
    name: "표현연습",
    professor: "최신식",
    days: ["목"],
    startTime: "14:00",
    endTime: "16:00",
    location: "본관 503",
    type: "general",
  },
  {
    id: "course-5",
    name: "앱인벤터로 배우는 코딩",
    professor: "정다감",
    days: ["금"],
    startTime: "10:00",
    endTime: "12:00",
    location: "전자정보관 B101",
    type: "general",
  },
];
