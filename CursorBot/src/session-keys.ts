export const MAX_AGENT_SESSIONS = 5;
export const SESSION_CMD_PREFIX = "/sess:";

export function makeSessionKey(chatId: string, sessionId: string): string {
  return `${chatId}::${sessionId}`;
}

export function parseSessionKey(sessionKey: string): { chatId: string; sessionId: string } | null {
  const idx = sessionKey.indexOf("::");
  if (idx <= 0 || idx >= sessionKey.length - 2) return null;
  return {
    chatId: sessionKey.slice(0, idx),
    sessionId: sessionKey.slice(idx + 2),
  };
}

export function isSessionCommand(text: string): boolean {
  const t = text.trim();
  return (
    t === `${SESSION_CMD_PREFIX}new`
    || t === `${SESSION_CMD_PREFIX}end`
    || t === `${SESSION_CMD_PREFIX}stop`
    || t === `${SESSION_CMD_PREFIX}stop-cancel`
    || t === "/stop"
    || t.startsWith("/stop ")
    || /^\/sess:\d+$/.test(t)
  );
}

export function parseSessionCommand(
  text: string,
):
  | { kind: "new" }
  | { kind: "end" }
  | { kind: "stop" }
  | { kind: "stop-cancel" }
  | { kind: "switch"; sessionId: string }
  | null {
  const t = text.trim();
  if (t === `${SESSION_CMD_PREFIX}new`) return { kind: "new" };
  if (t === `${SESSION_CMD_PREFIX}end`) return { kind: "end" };
  if (t === `${SESSION_CMD_PREFIX}stop` || t === "/stop" || t.startsWith("/stop ")) return { kind: "stop" };
  if (t === `${SESSION_CMD_PREFIX}stop-cancel`) return { kind: "stop-cancel" };
  const m = t.match(/^\/sess:(\d+)$/);
  if (m) return { kind: "switch", sessionId: m[1]! };
  return null;
}
