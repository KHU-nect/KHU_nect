export type UserProfile = {
  id: string;
  email: string;
  nickname: string;
  department: string;
  grade: string;
};

export const mockUserProfile: UserProfile = {
  id: "mock-user-1",
  email: "student@khu.ac.kr",
  nickname: "쿠옹이",
  department: "도예학과",
  grade: "24학번",
};

