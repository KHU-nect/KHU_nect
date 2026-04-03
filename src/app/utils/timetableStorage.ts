import { mockTimetable, type TimetableCourse } from "../mocks/timetable";
import { sortWeekdayLabels } from "./timetableGrid";

export const LEGACY_TIMETABLE_KEY = "khu-nect_timetable";

export function timetableKeyForUser(userId: string): string {
  return `khu-nect_timetable_${userId}`;
}

function migrateLegacyRow(raw: unknown): TimetableCourse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string" || typeof o.professor !== "string") return null;
  if (typeof o.startTime !== "string" || typeof o.endTime !== "string" || typeof o.location !== "string") return null;
  if (o.type !== "major" && o.type !== "general") return null;

  if (Array.isArray(o.days)) {
    const days = (o.days as unknown[]).filter((d): d is string => typeof d === "string");
    if (days.length === 0) return null;
    return {
      id: o.id,
      name: o.name,
      professor: o.professor,
      days: sortWeekdayLabels(days),
      startTime: o.startTime,
      endTime: o.endTime,
      location: o.location,
      type: o.type,
    };
  }

  if (typeof o.day === "string") {
    return {
      id: o.id,
      name: o.name,
      professor: o.professor,
      days: sortWeekdayLabels([o.day]),
      startTime: o.startTime,
      endTime: o.endTime,
      location: o.location,
      type: o.type,
    };
  }

  return null;
}

function mergeSplitLegacyRows(courses: TimetableCourse[]): TimetableCourse[] {
  const map = new Map<string, TimetableCourse>();
  for (const c of courses) {
    const key = `${c.name}\0${c.professor}\0${c.startTime}\0${c.endTime}\0${c.location}\0${c.type}`;
    const ex = map.get(key);
    if (!ex) {
      map.set(key, { ...c, days: sortWeekdayLabels([...c.days]) });
    } else {
      map.set(key, {
        ...ex,
        days: sortWeekdayLabels([...ex.days, ...c.days]),
      });
    }
  }
  return [...map.values()];
}

export function parseTimetableJson(json: string): TimetableCourse[] {
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return mockTimetable;
    if (raw.length === 0) return [];
    const migrated = raw.map(migrateLegacyRow).filter((c): c is TimetableCourse => c !== null);
    const merged = mergeSplitLegacyRows(migrated);
    return merged;
  } catch {
    return mockTimetable;
  }
}

/**
 * 특정 사용자의 시간표 스냅샷 (저장 없으면 빈 배열).
 * 집계용 — 파싱 실패 시 mock으로 채우지 않는다.
 */
export function readTimetableSnapshotForUser(userId: string): TimetableCourse[] {
  const raw = window.localStorage.getItem(timetableKeyForUser(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length === 0) return [];
    const migrated = parsed.map(migrateLegacyRow).filter((c): c is TimetableCourse => c !== null);
    return mergeSplitLegacyRows(migrated);
  } catch {
    return [];
  }
}

export function readLegacyTimetableIfAny(): TimetableCourse[] | null {
  const raw = window.localStorage.getItem(LEGACY_TIMETABLE_KEY);
  if (!raw) return null;
  try {
    return parseTimetableJson(raw);
  } catch {
    return null;
  }
}

export function clearLegacyTimetableKey(): void {
  window.localStorage.removeItem(LEGACY_TIMETABLE_KEY);
}
