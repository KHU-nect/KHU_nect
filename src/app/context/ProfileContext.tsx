import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import type { Profile } from "../types/profile";
import { getStoredProfile, saveProfileForUser } from "../utils/profileStorage";
import { getMyProfile } from "../api/userApi";

export type { InterestsTag, Profile } from "../types/profile";

type ProfileContextValue = {
  profile: Profile | null;
  draftProfile: Profile | null;
  isProfileReady: boolean;
  setDraftProfile: (profile: Profile) => void;
  saveProfile: () => void;
  commitProfile: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftProfile, setDraft] = useState<Profile | null>(null);
  const [isProfileReady, setIsProfileReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsProfileReady(false);
    if (!isAuthenticated || !user) {
      setProfile(null);
      setDraft(null);
      setIsProfileReady(true);
      return;
    }
    const run = async () => {
      const stored = getStoredProfile(user);
      if (stored) {
        if (!cancelled) {
          setProfile(stored);
          setDraft(stored);
        }
      }

      // 데모 계정은 로컬 시드/편집 흐름 유지
      if (user.id.startsWith("demo-user-")) {
        if (!stored && !cancelled) {
          setProfile(null);
          setDraft(null);
        }
        if (!cancelled) {
          setIsProfileReady(true);
        }
        return;
      }

      try {
        const remote = await getMyProfile();
        if (cancelled) return;
        const mapped: Profile = {
          id: String(remote.userId),
          email: remote.email,
          nickname: remote.nickname ?? "",
          department: remote.major ?? "",
          studentNumber: remote.studentNumber ?? "",
          grade: remote.studentNumber ? `${remote.studentNumber.slice(0, 2)}학번` : "",
        };
        setProfile(mapped);
        setDraft(mapped);
        saveProfileForUser(user.id, mapped);
      } catch {
        if (!stored && !cancelled) {
          setProfile(null);
          setDraft(null);
        }
      } finally {
        if (!cancelled) {
          setIsProfileReady(true);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isAuthenticated]);

  const setDraftProfile = (value: Profile) => {
    setDraft(value);
  };

  const saveProfile = () => {
    if (draftProfile && user) {
      setProfile(draftProfile);
      saveProfileForUser(user.id, draftProfile);
    }
  };

  const commitProfile = (value: Profile) => {
    setDraft(value);
    setProfile(value);
    if (user) {
      saveProfileForUser(user.id, value);
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        draftProfile,
        isProfileReady,
        setDraftProfile,
        saveProfile,
        commitProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
}
