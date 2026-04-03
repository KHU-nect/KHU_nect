/**
 * Spring `LocalDateTime` 등으로 내려오는 **타임존 없는** ISO(`2026-04-02T06:15:30`)는
 * ES `Date`가 **로컬(한국이면 KST)** 으로 해석합니다. DB에 UTC로 넣었는데 이렇게만내면
 * 실제 시각과 약 9시간(540분) 어긋납니다.
 *
 * `Z` / `±hh:mm` 오프셋이 없고 `T` 포함 ISO 형태면 **UTC**로 해석(`…Z` 추가)합니다.
 * 서버가 진짜로 “현지 시각 문자열”만 보내는 경우에는 백엔드에서 오프셋/Z를 붙이는 편이 맞습니다.
 */
const NAIVE_ISO =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export function parseBackendInstantMs(
  input: string | number | undefined | null
): number | null {
  if (input == null) return null;
  if (typeof input === "number" && Number.isFinite(input)) {
    if (Math.abs(input) < 2e10) return Math.trunc(input * 1000);
    return Math.trunc(input);
  }
  const s = String(input).trim();
  if (s === "") return null;
  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    if (s.length <= 10) return n * 1000;
    return n;
  }
  const hasTz = /Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s);
  const candidate =
    !hasTz && NAIVE_ISO.test(s) ? `${s}Z` : s;
  const t = new Date(candidate).getTime();
  return Number.isFinite(t) ? t : null;
}
