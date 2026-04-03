/**
 * STOMP WebSocket broker URL 목록 (순서대로 시도).
 * - 기본: `/ws-stomp` 먼저(Spring STOMP 전용이 흔함), 다음 `/ws`.
 * - `.env` `VITE_STOMP_BROKER_PATH=/ws` → 해당 경로만 사용.
 */
export function buildStompBrokerUrls(): string[] {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";
  const ws = base.replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");

  const custom = (import.meta.env.VITE_STOMP_BROKER_PATH as string | undefined)?.trim();
  if (custom) {
    const path = custom.startsWith("/") ? custom : `/${custom}`;
    return [`${ws}${path}`];
  }

  return [`${ws}/ws-stomp`, `${ws}/ws`];
}
