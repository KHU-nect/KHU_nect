import type { ClassChatMessage } from "../types/classChat";
import { parseBackendInstantMs } from "./parseBackendInstant";

export const SIT_TOGETHER_WINDOW_MS = 5 * 60 * 1000;

/** 같이 앉기 요청 노출 종료 시각(ms). `expiresAt` 우선, 없으면 createdAt+5분 */
export function getSitTogetherEndMs(msg: ClassChatMessage): number | null {
  if (msg.kind !== "sitTogether") return null;
  const createdMs = parseBackendInstantMs(msg.createdAt);
  if (createdMs == null) return null;
  return parseBackendInstantMs(msg.expiresAt) ?? createdMs + SIT_TOGETHER_WINDOW_MS;
}

/** PENDING 같이 앉기가 노출 기간을 지났는지 */
export function isSitTogetherPendingExpired(m: ClassChatMessage, nowMs = Date.now()): boolean {
  if (m.kind !== "sitTogether" || m.sitTogetherStatus !== "PENDING") return false;
  const end = getSitTogetherEndMs(m);
  if (end == null) return false;
  return nowMs >= end;
}
