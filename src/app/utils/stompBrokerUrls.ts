/**
 * STOMP WebSocket broker URL 목록 (순서대로 시도).
 * - 기본: 백엔드 스펙 `/ws` 우선, 이어서 `/ws-stomp` (Spring 등).
 * - `.env` `VITE_STOMP_BROKER_PATH=/ws-stomp` → 해당 경로만 사용.
 * - `.env` `VITE_STOMP_INCLUDE_LEGACY_WS=true` → 위 기본 순서 유지(호환 플래그만 명시용).
 */
export function buildStompBrokerUrls(): string[] {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";
  const ws = base.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");

  const custom = (import.meta.env.VITE_STOMP_BROKER_PATH as string | undefined)?.trim();
  if (custom) {
    const path = custom.startsWith("/") ? custom : `/${custom}`;
    return [`${ws}${path}`];
  }

  return [`${ws}/ws`, `${ws}/ws-stomp`];
}
