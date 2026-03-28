import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { UserProfile } from "../mocks/user";

type AuthState = {
  isAuthenticated: boolean;
  user: UserProfile | null;
};

type AuthContextValue = AuthState & {
  login: (user: UserProfile) => void;
  logout: () => void;
};

const STORAGE_KEY = "khu-nect_auth";

function readAuthFromStorage(): AuthState {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, user: null };
  }
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { isAuthenticated: false, user: null };
  }
  try {
    const parsed: AuthState = JSON.parse(saved);
    if (parsed?.user && parsed.isAuthenticated) {
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return { isAuthenticated: false, user: null };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readAuthFromStorage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const login = (user: UserProfile) => {
    setState({ isAuthenticated: true, user });
  };

  const logout = () => {
    setState({ isAuthenticated: false, user: null });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
