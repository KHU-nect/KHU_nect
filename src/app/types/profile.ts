import type { UserProfile } from "../mocks/user";

export type InterestsTag = {
  id: string;
  label: string;
  category: "hobby" | "study" | "lifestyle";
};

export type Profile = UserProfile & {
  mbti?: string;
  bio?: string;
  interests?: InterestsTag[];
  /** 마이페이지에서 관리하는 취미·관심사 (공강 매칭 필터와 동일 소스) */
  hobbies?: string[];
};
