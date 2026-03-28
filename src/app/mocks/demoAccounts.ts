import type { UserProfile } from "./user";

/** 로컬에서 여러 계정으로 로그인해 채팅을 테스트할 때 사용하는 데모 계정 (5명) */
export const DEMO_ACCOUNTS: UserProfile[] = [
  {
    id: "demo-user-1",
    email: "demo1@khu.ac.kr",
    nickname: "도예 쿠옹이",
    department: "도예학과",
    grade: "24학번",
  },
  {
    id: "demo-user-2",
    email: "demo2@khu.ac.kr",
    nickname: "컴공 쿠옹이",
    department: "컴퓨터공학과",
    grade: "23학번",
  },
  {
    id: "demo-user-3",
    email: "demo3@khu.ac.kr",
    nickname: "경영 쿠옹이",
    department: "경영학과",
    grade: "22학번",
  },
  {
    id: "demo-user-4",
    email: "demo4@khu.ac.kr",
    nickname: "디자인 쿠옹이",
    department: "산업디자인학과",
    grade: "21학번",
  },
  {
    id: "demo-user-5",
    email: "demo5@khu.ac.kr",
    nickname: "전자 쿠옹이",
    department: "전자공학과",
    grade: "20학번",
  },
];
