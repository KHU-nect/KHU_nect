/**
 * 로그인 user.id(문자열)와 API 메시지의 발신자 id(숫자·문자) 비교.
 * JWT/DB는 숫자, 프론트 Auth는 String(id)인 경우가 많음.
 */
export function sameAppUserId(
  currentUserId: string | undefined | null,
  messageSenderId: string | number | undefined | null
): boolean {
  if (currentUserId == null || messageSenderId == null) return false;
  const bRaw = String(messageSenderId).trim();
  if (bRaw === "" || bRaw === "-1") return false;
  const aRaw = String(currentUserId).trim();
  if (aRaw === bRaw) return true;
  const na = Number(aRaw);
  const nb = Number(bRaw);
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
}
