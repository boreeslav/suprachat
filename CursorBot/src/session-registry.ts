import type { StateStore } from "./state-store.js";
import { makeSessionKey, MAX_AGENT_SESSIONS } from "./session-keys.js";

export type SessionWorkStatus = "idle" | "waiting" | "thinking" | "executing" | "recovering";

export interface SessionRuntimeState {
  status: SessionWorkStatus;
  detail: string;
  startedAt?: string;
  lastProgressAt?: string;
  runId?: string;
}

const DEFAULT_DETAIL: Record<SessionWorkStatus, string> = {
  idle: "Ждёт запрос",
  waiting: "Ждёт запрос",
  thinking: "Думает",
  executing: "Выполняю задачу",
  recovering: "Продолжаю с сохранённым контекстом",
};

export class SessionRegistry {
  private readonly runtime = new Map<string, SessionRuntimeState>();

  constructor(
    private readonly state: StateStore,
    private readonly defaultProjectId = "",
  ) {}

  ensureRoom(chatId: string): void {
    this.state.ensureChatRoom(chatId);
  }

  getActiveSessionId(chatId: string): string | null {
    const room = this.state.getChatRoom(chatId);
    if (!room) return null;
    const id = room.activeSessionId;
    if (!id || room.endedSessions?.includes(id)) return null;
    return id;
  }

  getActiveSessionKey(chatId: string): string | null {
    const id = this.getActiveSessionId(chatId);
    return id ? makeSessionKey(chatId, id) : null;
  }

  hasActiveSession(chatId: string): boolean {
    return this.getActiveSessionId(chatId) != null;
  }

  listSessionIds(chatId: string): string[] {
    const room = this.state.getChatRoom(chatId);
    if (!room?.sessionOrder.length) return ["1"];
    return room.sessionOrder.filter((id) => !room.endedSessions?.includes(id));
  }

  sessionTitle(sessionId: string): string {
    return `Сессия ${sessionId}`;
  }

  getRuntime(sessionKey: string): SessionRuntimeState {
    return (
      this.runtime.get(sessionKey) ?? {
        status: "idle",
        detail: DEFAULT_DETAIL.idle,
      }
    );
  }

  setRuntime(sessionKey: string, status: SessionWorkStatus, detail?: string): void {
    const prev = this.runtime.get(sessionKey);
    const now = new Date().toISOString();
    this.runtime.set(sessionKey, {
      status,
      detail: (detail ?? DEFAULT_DETAIL[status]).trim() || DEFAULT_DETAIL[status],
      startedAt: status === "idle" ? undefined : prev?.startedAt ?? now,
      lastProgressAt: status === "idle" ? undefined : now,
      runId: status === "idle" ? undefined : prev?.runId,
    });
  }

  touchProgress(sessionKey: string, detail: string, runId?: string): void {
    const prev = this.runtime.get(sessionKey);
    const now = new Date().toISOString();
    const status: SessionWorkStatus =
      prev?.status === "recovering" ? "recovering" : prev?.status === "thinking" ? "thinking" : "executing";
    this.runtime.set(sessionKey, {
      status,
      detail: detail.trim() || prev?.detail || DEFAULT_DETAIL[status],
      startedAt: prev?.startedAt ?? now,
      lastProgressAt: now,
      runId: runId ?? prev?.runId,
    });
  }

  clearRuntime(sessionKey: string): void {
    this.runtime.delete(sessionKey);
  }

  formatStatusLine(sessionKey: string): string {
    const rt = this.getRuntime(sessionKey);
    return rt.detail.trim() || DEFAULT_DETAIL[rt.status];
  }

  isBusy(sessionKey: string): boolean {
    const s = this.getRuntime(sessionKey).status;
    return s === "thinking" || s === "executing" || s === "recovering";
  }

  createSession(chatId: string): { ok: true; sessionId: string } | { ok: false; reason: string } {
    this.ensureRoom(chatId);
    const room = this.state.getChatRoom(chatId)!;
    const activeCount = room.sessionOrder.filter((id) => !room.endedSessions?.includes(id)).length;
    if (activeCount >= MAX_AGENT_SESSIONS) {
      return { ok: false, reason: `Не более ${MAX_AGENT_SESSIONS} активных сессий.` };
    }

    const sessionId = String(room.nextSessionNum);
    room.nextSessionNum += 1;
    room.sessionOrder.push(sessionId);
    this.state.setChatRoom(chatId, room);

    const inherited = this.getActiveSessionKey(chatId)
      ? this.state.getChatSession(this.getActiveSessionKey(chatId)!)
      : undefined;
    const session = this.state.ensureSession(chatId, sessionId);
    if (inherited?.projectId?.trim()) {
      session.projectId = inherited.projectId;
    } else if (!session.projectId.trim()) {
      const roomDefault = this.state.getChatRoom(chatId)?.defaultProjectId;
      if (roomDefault?.trim()) {
        session.projectId = roomDefault;
      } else if (this.defaultProjectId) {
        session.projectId = this.defaultProjectId;
      }
    }
    if (inherited?.mode) session.mode = inherited.mode;
    if (inherited?.model?.trim()) session.model = inherited.model;
    session.updatedAt = new Date().toISOString();
    this.state.setChatSession(makeSessionKey(chatId, sessionId), session);

    return { ok: true, sessionId };
  }

  switchActive(chatId: string, sessionId: string): boolean {
    this.ensureRoom(chatId);
    const room = this.state.getChatRoom(chatId)!;
    if (!room.sessionOrder.includes(sessionId) || room.endedSessions?.includes(sessionId)) {
      return false;
    }
    room.activeSessionId = sessionId;
    this.state.setChatRoom(chatId, room);
    this.state.ensureSession(chatId, sessionId);
    return true;
  }

  endSession(
    chatId: string,
    sessionId: string,
  ): { ok: true } | { ok: false; reason: string } {
    this.ensureRoom(chatId);
    const room = this.state.getChatRoom(chatId)!;
    if (!room.sessionOrder.includes(sessionId)) {
      return { ok: false, reason: "Сессия не найдена." };
    }
    if (room.endedSessions?.includes(sessionId)) {
      return { ok: false, reason: "Сессия уже завершена." };
    }

    if (!room.endedSessions) room.endedSessions = [];
    room.endedSessions.push(sessionId);
    this.state.setChatRoom(chatId, room);
    return { ok: true };
  }

  getPickerMessageId(chatId: string): string | undefined {
    return this.state.getChatRoom(chatId)?.pickerMessageId;
  }

  setPickerMessageId(chatId: string, messageId: string | undefined): void {
    const room = this.state.getChatRoom(chatId);
    if (!room) return;
    room.pickerMessageId = messageId;
    this.state.setChatRoom(chatId, room);
  }

  getActionsCatalogMessageId(chatId: string): string | undefined {
    return this.state.getChatRoom(chatId)?.actionsCatalogMessageId;
  }

  setActionsCatalogMessageId(chatId: string, messageId: string | undefined): void {
    const room = this.state.getChatRoom(chatId);
    if (!room) return;
    room.actionsCatalogMessageId = messageId;
    this.state.setChatRoom(chatId, room);
  }

  flushState(): Promise<void> {
    return this.state.flush();
  }
}
