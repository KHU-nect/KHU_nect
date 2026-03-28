import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { mockTimetable, type TimetableCourse } from "../mocks/timetable";
import { useAuth } from "./AuthContext";
import {
  clearLegacyTimetableKey,
  parseTimetableJson,
  readLegacyTimetableIfAny,
  seedDemoTimetablesIfEmpty,
  timetableKeyForUser,
} from "../utils/timetableStorage";

function persistTimetable(userId: string | undefined, courses: TimetableCourse[]) {
  const uid = userId ?? "guest";
  window.localStorage.setItem(timetableKeyForUser(uid), JSON.stringify(courses));
}

type TimetableContextValue = {
  courses: TimetableCourse[];
  addCourse: (course: TimetableCourse) => void;
  updateCourse: (id: string, course: TimetableCourse) => void;
  removeCourse: (id: string) => void;
  clearCourses: () => void;
  getFreeSlots: () => { day: string; startTime: string; endTime: string }[];
};

const TimetableContext = createContext<TimetableContextValue | undefined>(undefined);

export function TimetableProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<TimetableCourse[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    seedDemoTimetablesIfEmpty();

    const uid = user?.id ?? "guest";
    const key = timetableKeyForUser(uid);
    const raw = window.localStorage.getItem(key);

    if (raw !== null) {
      setCourses(parseTimetableJson(raw));
      setLoaded(true);
      return;
    }

    const legacy = readLegacyTimetableIfAny();
    if (legacy && legacy.length > 0) {
      setCourses(legacy);
      window.localStorage.setItem(key, JSON.stringify(legacy));
      clearLegacyTimetableKey();
      setLoaded(true);
      return;
    }

    setCourses(mockTimetable);
    setLoaded(true);
  }, [user?.id]);

  const addCourse = (course: TimetableCourse) => {
    setCourses((prev) => {
      if (prev.some((c) => c.id === course.id)) return prev;
      const next = [...prev, course];
      if (loaded) persistTimetable(user?.id, next);
      return next;
    });
  };

  const updateCourse = (id: string, course: TimetableCourse) => {
    setCourses((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...course, id } : c));
      if (loaded) persistTimetable(user?.id, next);
      return next;
    });
  };

  const removeCourse = (id: string) => {
    setCourses((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (loaded) persistTimetable(user?.id, next);
      return next;
    });
  };

  const clearCourses = () => {
    setCourses(() => {
      const next: TimetableCourse[] = [];
      if (loaded) persistTimetable(user?.id, next);
      return next;
    });
  };

  const getFreeSlots = () => {
    return [];
  };

  return (
    <TimetableContext.Provider
      value={{
        courses,
        addCourse,
        updateCourse,
        removeCourse,
        clearCourses,
        getFreeSlots,
      }}
    >
      {children}
    </TimetableContext.Provider>
  );
}

export function useTimetable() {
  const ctx = useContext(TimetableContext);
  if (!ctx) {
    throw new Error("useTimetable must be used within TimetableProvider");
  }
  return ctx;
}
