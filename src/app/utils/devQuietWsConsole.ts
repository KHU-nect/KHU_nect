/**
 * 개발 모드 전용: WebSocket 연결 실패 시 브라우저가 자주 찍는
 * "WebSocket connection to 'ws://…' failed" 류가 console.error/warn을 타면 숨깁니다.
 * STOMP·연결 로직은 변경하지 않습니다.
 */
export function installDevQuietWsConsole(): void {
  if (!import.meta.env.DEV) return;

  const shouldDrop = (args: unknown[]): boolean => {
    for (const a of args) {
      if (typeof a === "string" && /WebSocket connection to\s+['"]?wss?:\/\//i.test(a)) {
        return true;
      }
    }
    return false;
  };

  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (shouldDrop(args)) return;
    origError(...args);
  };

  const origWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (shouldDrop(args)) return;
    origWarn(...args);
  };
}
