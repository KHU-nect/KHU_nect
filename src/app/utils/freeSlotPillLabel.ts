/** 홈·목록용 공강 시간 pill (예: 3시~5시 공강) */

export type SlotLike = {
  weekday?: string;
  dayOfWeek?: string;
  day?: string;
  startTime?: string | null;
  endTime?: string | null;
};

const DAY_MAP: Record<string, string> = {
  MONDAY: "월",
  MON: "월",
  TUESDAY: "화",
  TUE: "화",
  WEDNESDAY: "수",
  WED: "수",
  THURSDAY: "목",
  THU: "목",
  FRIDAY: "금",
  FRI: "금",
  SATURDAY: "토",
  SAT: "토",
  SUNDAY: "일",
  SUN: "일",
};

const TODAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function normalizeDayLabel(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  if (/^[월화수목금토일]$/.test(t)) return t;
  const u = t.toUpperCase();
  if (DAY_MAP[u]) return DAY_MAP[u];
  const n = parseInt(t, 10);
  if (n >= 1 && n <= 7) {
    const isoMonFirst = ["월", "화", "수", "목", "금", "토", "일"];
    return isoMonFirst[(n - 1) % 7];
  }
  return undefined;
}

function parseHourMinute(s: string): { h: number; m: number } | null {
  const t = s.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

/** 15:00 → 3시, 15:30 → 3시 30분 (캠퍼스 말투) */
export function hhmmToKoreanShort(hhmm: string): string {
  const pm = parseHourMinute(hhmm);
  if (!pm) return hhmm.trim();
  const { h, m: min } = pm;
  if (min !== 0) {
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h === 12 ? 12 : h;
    return `${dh}시 ${min}분`;
  }
  if (h === 0) return "12시";
  if (h === 12) return "12시";
  if (h > 12) return `${h - 12}시`;
  return `${h}시`;
}

/** 예: 3시~5시 공강 */
export function formatFreeRangeKorean(start: string, end: string): string {
  const a = hhmmToKoreanShort(start);
  const b = hhmmToKoreanShort(end);
  return `${a}~${b} 공강`;
}

function formatSlotWithOptionalDay(slot: SlotLike): string | undefined {
  const st = slot.startTime?.trim() ?? "";
  const en = slot.endTime?.trim() ?? "";
  if (!st || !en) return undefined;
  const day = normalizeDayLabel(slot.weekday ?? slot.dayOfWeek ?? slot.day);
  const range = formatFreeRangeKorean(st, en);
  return day ? `${day} ${range}` : range;
}

/**
 * 오늘 요일에 해당하는 공강이 있으면 그중 첫 구간, 없으면 첫 슬롯(요일 접두).
 * 슬롯이 비면 고정 문구.
 */
export function buildHomeFreePillFromCommonSlots(
  slots: SlotLike[],
  now: Date = new Date()
): string {
  if (!slots.length) return "공강 맞춰봐요";
  const todayLabel = TODAY_KO[now.getDay()];
  const todays = slots.filter(
    (s) => normalizeDayLabel(s.weekday ?? s.dayOfWeek ?? s.day) === todayLabel
  );
  if (todays.length > 0) {
    const s = todays[0];
    const st = s.startTime?.trim() ?? "";
    const en = s.endTime?.trim() ?? "";
    if (st && en) return formatFreeRangeKorean(st, en);
  }
  const line = formatSlotWithOptionalDay(slots[0]);
  return line ?? "공강 맞춰봐요";
}
