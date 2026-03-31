import type { UserProfile } from "../mocks/user";

export type InterestsTag = {
  id: string;
  label: string;
  category: "hobby" | "study" | "lifestyle";
};

export type Profile = UserProfile & {
  /** 백엔드 studentNumber 원문(10자리) 저장용 */
  studentNumber?: string;
  /** 사용자 작성 오늘의 질문 (로컬 저장) */
  todayQuestion?: string;
  mbti?: string;
  bio?: string;
  interests?: InterestsTag[];
  /** 마이페이지에서 관리하는 취미·관심사 (공강 매칭 필터와 동일 소스) */
  hobbies?: string[];
};
