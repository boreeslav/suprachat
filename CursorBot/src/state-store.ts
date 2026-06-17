import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { makeSessionKey } from "./session-keys.js";
import { normalizeMode, type CursorBotMode } from "./cursor-mode.js";

export interface ChatSession {
  agentId?: string;
  mode: CursorBotMode;
  /** Ключ модели: auto, pro или id из Cursor.models.list(). */
  model: string;
  /** Ключ проекта из bot-config.json. */
  projectId: string;
  /** Сохранённый контекст диалога — для передачи в новую сессию агента после сбоя. */
  conversationContext?: string;
  updatedAt: string;
}

/** Метаданные чата: список параллельных сессий агента. */
export interface ChatRoomMeta {
  activeSessionId: string;
  sessionOrder: string[];
  nextSessionNum: number;
  pickerMessageId?: string;
  actionsCatalogMessageId?: string;
  endedSessions?: string[];
  /** Проект по умолчанию для ветки/чата (все сессии). */
  defaultProjectId?: string;
}

/** Незавершённый run Cursor — для доставки ответа после перезапуска бота. */
export interface PendingRunRecord {
  sessionKey: string;
  chatId: string;
  sessionId: string;
  runId: string;
  agentId: string;
  inboxId: string;
  chatType: string;
  chatName?: string | null;
  senderLogin?: string;
  senderName?: string;
  /** Полный текст запроса (с префиксами) — для автоповтора после сбоя. */
  prompt?: string;
  startedAt: string;
}

export interface BotState {
  lastInboxId: string | null;
  /** Ключ — sessionKey (chatId::sessionId). */
  chats: Record<string, ChatSession>;
  chatRooms: Record<string, ChatRoomMeta>;
  /** Ключ — sessionKey. */
  pendingRuns: Record<string, PendingRunRecord>;
}

const DEFAULT_STATE: BotState = {
  lastInboxId: null,
  chats: {},
  chatRooms: {},
  pendingRuns: {},
};

function defaultSession(): ChatSession {
  return {
    mode: "agent",
    model: "auto",
    projectId: "",
    updatedAt: new Date().toISOString(),
  };
}

function defaultRoom(): ChatRoomMeta {
  return {
    activeSessionId: "1",
    sessionOrder: ["1"],
    nextSessionNum: 2,
  };
}

export class StateStore {
  private state: BotState = structuredClone(DEFAULT_STATE);
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<BotState> & {
        chats?: Record<string, Partial<ChatSession>>;
      };

      const chats: Record<string, ChatSession> = {};
      const chatRooms: Record<string, ChatRoomMeta> = {};

      for (const [key, rawSession] of Object.entries(parsed.chats ?? {})) {
        const session = rawSession as Partial<ChatSession>;
        const context = session.conversationContext?.trim();
        const normalized: ChatSession = {
          agentId: session.agentId,
          mode: normalizeMode(session.mode),
          model: (session.model ?? "").trim() || "auto",
          projectId: (session.projectId ?? "").trim(),
          conversationContext: context || undefined,
          updatedAt: session.updatedAt ?? new Date().toISOString(),
        };

        if (key.includes("::")) {
          chats[key] = normalized;
          continue;
        }

        // Миграция: старый ключ chatId → sessionKey chatId::1
        const sessionKey = makeSessionKey(key, "1");
        chats[sessionKey] = normalized;
        chatRooms[key] = {
          activeSessionId: "1",
          sessionOrder: ["1"],
          nextSessionNum: 2,
        };
      }

      for (const [chatId, rawRoom] of Object.entries(parsed.chatRooms ?? {})) {
        const room = rawRoom as Partial<ChatRoomMeta>;
        chatRooms[chatId] = {
          activeSessionId: room.activeSessionId ?? "1",
          sessionOrder: room.sessionOrder?.length ? [...room.sessionOrder] : ["1"],
          nextSessionNum: room.nextSessionNum ?? 2,
          pickerMessageId: room.pickerMessageId,
          actionsCatalogMessageId: room.actionsCatalogMessageId,
          endedSessions: room.endedSessions ? [...room.endedSessions] : undefined,
          defaultProjectId: (room.defaultProjectId ?? "").trim() || undefined,
        };
        const sessionKey = makeSessionKey(chatId, chatRooms[chatId]!.activeSessionId);
        if (!chats[sessionKey]) {
          chats[sessionKey] = defaultSession();
        }
      }

      const pendingRuns: Record<string, PendingRunRecord> = {};
      for (const [key, raw] of Object.entries(parsed.pendingRuns ?? {})) {
        const pending = raw as Partial<PendingRunRecord> & { chatId?: string };
        if (!pending.runId || !pending.agentId || !pending.inboxId) continue;

        const chatId = pending.chatId ?? key.split("::")[0] ?? "";
        const sessionId = pending.sessionId ?? "1";
        const sessionKey = pending.sessionKey ?? makeSessionKey(chatId, sessionId);

        pendingRuns[sessionKey] = {
          sessionKey,
          chatId,
          sessionId,
          runId: pending.runId,
          agentId: pending.agentId,
          inboxId: pending.inboxId,
          chatType: pending.chatType ?? "direct",
          chatName: pending.chatName ?? null,
          senderLogin: pending.senderLogin,
          senderName: pending.senderName,
          prompt: pending.prompt,
          startedAt: pending.startedAt ?? new Date().toISOString(),
        };
      }

      this.state = {
        lastInboxId: parsed.lastInboxId ?? null,
        chats,
        chatRooms,
        pendingRuns,
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw err;
      await mkdir(dirname(this.filePath), { recursive: true });
      await this.flush();
    }
  }

  getLastInboxId(): string | null {
    return this.state.lastInboxId;
  }

  setLastInboxId(id: string | null): void {
    if (this.state.lastInboxId === id) return;
    this.state.lastInboxId = id;
    this.scheduleSave();
  }

  getChatRoom(chatId: string): ChatRoomMeta | undefined {
    return this.state.chatRooms[chatId];
  }

  listChatRoomIds(): string[] {
    return Object.keys(this.state.chatRooms);
  }

  ensureChatRoom(chatId: string): ChatRoomMeta {
    let room = this.state.chatRooms[chatId];
    if (!room) {
      room = defaultRoom();
      this.state.chatRooms[chatId] = room;
      this.ensureSession(chatId, room.activeSessionId);
      this.scheduleSave();
    }
    return room;
  }

  setChatRoom(chatId: string, room: ChatRoomMeta): void {
    this.state.chatRooms[chatId] = room;
    this.scheduleSave();
  }

  ensureSession(chatId: string, sessionId: string): ChatSession {
    const sessionKey = makeSessionKey(chatId, sessionId);
    let session = this.state.chats[sessionKey];
    if (!session) {
      session = defaultSession();
      this.state.chats[sessionKey] = session;
      this.scheduleSave();
    }
    return session;
  }

  getChatSession(sessionKey: string): ChatSession | undefined {
    return this.state.chats[sessionKey];
  }

  setChatSession(sessionKey: string, session: ChatSession): void {
    this.state.chats[sessionKey] = session;
    this.scheduleSave();
  }

  deleteChatSession(sessionKey: string): void {
    if (!(sessionKey in this.state.chats)) return;
    delete this.state.chats[sessionKey];
    this.scheduleSave();
  }

  listPendingRuns(): PendingRunRecord[] {
    return Object.values(this.state.pendingRuns);
  }

  getPendingRun(sessionKey: string): PendingRunRecord | undefined {
    return this.state.pendingRuns[sessionKey];
  }

  setPendingRun(record: PendingRunRecord): void {
    this.state.pendingRuns[record.sessionKey] = record;
    void this.flush();
  }

  clearPendingRun(sessionKey: string): void {
    if (!(sessionKey in this.state.pendingRuns)) return;
    delete this.state.pendingRuns[sessionKey];
    void this.flush();
  }

  /** Снимает pending только если runId совпадает — защита от гонки с новым запросом. */
  clearPendingRunIfMatch(sessionKey: string, runId: string): boolean {
    const pending = this.state.pendingRuns[sessionKey];
    if (!pending || pending.runId !== runId) return false;
    delete this.state.pendingRuns[sessionKey];
    void this.flush();
    return true;
  }

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, 300);
  }

  async flush(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = this.filePath + ".tmp";
    await writeFile(tmp, JSON.stringify(this.state, null, 2), "utf8");
    await rename(tmp, this.filePath);
    this.dirty = false;
  }
}
