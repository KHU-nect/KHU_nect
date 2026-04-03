/** 수업 카드 왼쪽 액센트 바 — 과목 키마다 고정 색(재렌더마다 바뀌지 않음) */
const ACCENT_PALETTE = [
  "#A71930",
  "#E6A620",
  "#2E7D32",
  "#1565C0",
  "#6A1B9A",
  "#C62828",
  "#00796B",
  "#EF6C00",
  "#5E35B1",
  "#0277BD",
  "#558B2F",
  "#AD1457",
  "#00838F",
  "#6D4C41",
  "#283593",
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getCourseAccentColor(seed: string): string {
  if (!seed) return ACCENT_PALETTE[0];
  const i = hashString(seed) % ACCENT_PALETTE.length;
  return ACCENT_PALETTE[i];
}
