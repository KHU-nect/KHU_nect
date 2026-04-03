/**
 * STOMP 자동 재연결 간격(ms). `0`이면 재연결 끔(@stomp/stompjs).
 * `.env` `VITE_STOMP_RECONNECT_DELAY_MS=30000` 등.
 */
export function stompReconnectDelayMs(): number {
  const raw = import.meta.env.VITE_STOMP_RECONNECT_DELAY_MS as string | undefined;
  if (raw === undefined || raw === "") return 5000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 5000;
  return n;
}
