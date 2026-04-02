import { sanitizeHobbies } from "../constants/hobbyOptions";
import { DEFAULT_USER_HOBBIES } from "../mocks/freeSlotPeers";

/** 마이페이지 취미 → 매칭·프로필용 목록 (비어 있으면 기본 취미) */
export function resolveViewerHobbies(profile: { hobbies?: string[] } | null): string[] {
  if (profile?.hobbies === undefined) return DEFAULT_USER_HOBBIES;
  const cleaned = sanitizeHobbies(profile.hobbies);
  return cleaned.length > 0 ? cleaned : DEFAULT_USER_HOBBIES;
}
