export const HOBBY_CATEGORY_OPTIONS = {
  투어: ["카페 맛집", "여행", "캠핑", "드라이브"],
  공예: ["목공예", "오브제", "그림", "조립", "다이어리", "비즈공예", "퍼즐", "도예", "뜨개질", "원예"],
  운동: ["요가", "조깅", "헬스", "수영", "클라이밍", "필라테스", "댄스", "배드민턴", "자전거", "러닝"],
  꾸미기: ["옷", "화장품", "헤어", "네일", "향수"],
  생활: ["요리", "영화", "드라마", "애니", "덕질", "게임", "수집", "봉사", "베이킹"],
  음악: ["악기", "비트박스", "노래", "음악감상", "클래식"],
  자기계발: ["외국어", "블로그", "전시감상", "유튜브", "프로그래밍"],
} as const;

export const ALLOWED_HOBBIES = Object.values(HOBBY_CATEGORY_OPTIONS).flat();

const ALLOWED_HOBBY_SET = new Set(ALLOWED_HOBBIES);

export function sanitizeHobbies(input: string[] | undefined | null): string[] {
  if (!input) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const hobby of input) {
    if (!ALLOWED_HOBBY_SET.has(hobby)) continue;
    if (seen.has(hobby)) continue;
    seen.add(hobby);
    result.push(hobby);
  }
  return result;
}

