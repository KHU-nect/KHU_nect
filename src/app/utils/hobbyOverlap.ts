/**
 * 내 취미 기준 겹침 비율: (겹치는 취미 수) / (내 전체 취미 수) × 100
 * 내 취미가 없으면 undefined (UI에서 숨김)
 */
export function hobbyMatchPercent(viewerHobbies: string[], peerHobbies: string[]): number | undefined {
  const mine = [...new Set(viewerHobbies.map((h) => h.trim()).filter(Boolean))];
  if (mine.length === 0) return undefined;
  const peerSet = new Set(peerHobbies.map((h) => h.trim()).filter(Boolean));
  const overlap = mine.filter((h) => peerSet.has(h)).length;
  return Math.round((overlap / mine.length) * 100);
}
