import type { UserProfile } from "../mocks/user";
import type { Profile } from "../types/profile";

const LEGACY_KEY = "khu-nect_profile";

export function profileKeyForUser(userId: string) {
  return `khu-nect_profile_${userId}`;
}

/** 저장된 프로필만 반환. 없으면 null (온보딩 필요할 수 있음) */
export function getStoredProfile(user: UserProfile): Profile | null {
  const key = profileKeyForUser(user.id);
  const raw = window.localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw) as Profile;
    } catch {
      window.localStorage.removeItem(key);
    }
  }
  if (user.id === "mock-user-1") {
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy) as Profile;
        window.localStorage.setItem(key, legacy);
        window.localStorage.removeItem(LEGACY_KEY);
        return parsed;
      } catch {
        window.localStorage.removeItem(LEGACY_KEY);
      }
    }
  }
  return null;
}

export function saveProfileForUser(userId: string, profile: Profile) {
  window.localStorage.setItem(profileKeyForUser(userId), JSON.stringify(profile));
}
