/**
 * STOMP WebSocket broker URL 목록 (순서대로 시도).
 * - `VITE_WS_URL` 이 있으면 전체 URL 하나만 사용 (Nginx TLS·경로 고정 시).
 * - 없으면 `VITE_API_BASE_URL` 에서 스킴만 ws/wss 로 바꿔 `/ws-stomp`, `/ws` 순으로 시도.
 * - `.env` `VITE_STOMP_BROKER_PATH=/ws` → API 베이스 + 해당 경로만 사용 (`VITE_WS_URL` 없을 때).
 */
export function buildStompBrokerUrls(): string[] {
  const explicitWs = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (explicitWs) {
    return [explicitWs];
  }

  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";
  const ws = base.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");

  const custom = (import.meta.env.VITE_STOMP_BROKER_PATH as string | undefined)?.trim();
  if (custom) {
    const path = custom.startsWith("/") ? custom : `/${custom}`;
    return [`${ws}${path}`];
  }

  return [`${ws}/ws-stomp`, `${ws}/ws`];
}
