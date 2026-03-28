import { ReactNode } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ProfileProvider } from "./context/ProfileContext";
import { TimetableProvider } from "./context/TimetableContext";
import { ClassChatProvider } from "./context/ClassChatContext";
import { DmChatProvider } from "./context/DmChatContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <TimetableProvider>
          <ClassChatProvider>
            <DmChatProvider>{children}</DmChatProvider>
          </ClassChatProvider>
        </TimetableProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}

