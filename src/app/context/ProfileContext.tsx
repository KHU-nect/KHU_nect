import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import type { Profile } from "../types/profile";
import { getStoredProfile, saveProfileForUser } from "../utils/profileStorage";

export type { InterestsTag, Profile } from "../types/profile";

type ProfileContextValue = {
  profile: Profile | null;
  draftProfile: Profile | null;
  setDraftProfile: (profile: Profile) => void;
  saveProfile: () => void;
  commitProfile: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftProfile, setDraft] = useState<Profile | null>(null);

  useLayoutEffect(() => {
    if (!isAuthenticated || !user) {
      setProfile(null);
      setDraft(null);
      return;
    }
    const stored = getStoredProfile(user);
    setProfile(stored);
    setDraft(stored);
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
