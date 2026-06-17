import WebSocket from "ws";

export interface BotMessageButtonDto {
  id?: string;
  text: string;
  action: string;
  color?: string;
}

export interface BotMessageButtonPressDto {
  sourceMessageId: string;
  buttonId: string;
  action: string;
}

export interface BotApiFileAttachmentDto {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface BotApiMessage {
  id: string;
  messageId: string;
  chatId: string;
  chatType: string;
  chatName: string | null;
  senderId: string;
  senderLogin: string;
  senderName: string;
  text: string;
  /** text | image | photo_album | file */
  contentType?: string;
  caption?: string | null;
  attachments?: BotApiFileAttachmentDto[];
  timestamp: string;
  replyToMessageId?: string;
  replyToSenderName?: string;
  replyToTextPreview?: string;
  buttonPress?: BotMessageButtonPressDto;
  assistantSession?: {
    sessionId: string;
    command: string;
    forwardedMessages?: Array<{
      text: string;
      senderName?: string | null;
      originalMessageId?: string | null;
      attachmentFileIds?: string[];
    }>;
  };
}

export type BotFileVariant = "original" | "preview" | "medium";

export interface BotApiMeResponse {
  success: boolean;
  botUserId?: string;
  login?: string;
  name?: string;
  description?: string;
  error?: string;
}

export interface BotApiSendMessageResponse {
  success: boolean;
  messageId?: string;
  chatId?: string;
  error?: string;
}

export interface BotApiSendMessageParams {
  text?: string;
  caption?: string;
  photoFileId?: string;
  photoFileIds?: string[];
  documentFileId?: string;
  attachmentFileIds?: string[];
  buttons?: BotMessageButtonDto[];
  userLogin?: string;
  chatId?: string;
}

export interface BotApiUploadFileResponse {
  success: boolean;
  fileId?: string;
  error?: string;
}

export interface BotApiSendActivityResponse {
  success: boolean;
  chatId?: string;
  error?: string;
}

export interface BotApiActivityDto {
  activityType: string;
  activityMessage?: string;
  active: boolean;
  expiresAt?: string;
}

export interface BotApiGetActivityResponse {
  success: boolean;
  chatId?: string;
  activities?: BotApiActivityDto[];
  error?: string;
}

export interface BotApiEditMessageResponse {
  success: boolean;
  chatId?: string;
  messageId?: string;
  error?: string;
}

export interface BotApiDeleteMessageResponse {
  success: boolean;
  chatId?: string;
  messageId?: string;
  /** everyone — удалено у всех; self — только у бота (нет прав на deleteForEveryone). */
  deleteScope?: "everyone" | "self";
  error?: string;
}

export interface BotApiGetMessagesResponse {
  success: boolean;
  messages?: BotApiMessage[];
  error?: string;
}

export interface BotApiMenuItemDto {
  id?: string;
  text: string;
  message?: string;
  submenu?: BotApiMenuItemDto[];
}

export interface BotApiMenuDto {
  items: BotApiMenuItemDto[];
}

export interface BotApiGetMenuResponse {
  success: boolean;
  menu?: BotApiMenuDto;
  chatId?: string;
  error?: string;
}

export interface BotApiSetMenuResponse {
  success: boolean;
  menu?: BotApiMenuDto;
  chatId?: string;
  error?: string;
}

export interface BotApiGetGroupMenuResponse {
  success: boolean;
  groupMenu?: BotApiMenuDto;
  chatId?: string;
  error?: string;
}

export interface BotApiSetGroupMenuResponse {
  success: boolean;
  groupMenu?: BotApiMenuDto;
  chatId?: string;
  error?: string;
}

export interface BotApiGroupBranchDto {
  id: string;
  name: string;
  slug: string;
  avatar?: string;
  order: number;
}

export interface BotApiGetChatInfoResponse {
  success: boolean;
  chatId?: string;
  chatType?: string;
  name?: string;
  parentChatId?: string;
  branchSlug?: string;
  isBranch?: boolean;
  branches?: BotApiGroupBranchDto[];
  error?: string;
}

export interface WsHandlers {
  onMessage?: (update: BotApiMessage, envelope?: unknown) => void;
  onConnected?: (msg: { type: string; botUserId?: string }) => void;
  onError?: (err: unknown) => void;
  onClose?: (ev: { code: number; reason: string }) => void;
  onReconnect?: (attempt: number, delayMs: number) => void;
  onSyncStart?: () => void;
  onSyncComplete?: (count: number) => void;
  onSyncError?: (err: unknown) => void;
}

export interface WsOptions {
  reconnect?: boolean;
  reconnectMinDelay?: number;
  reconnectMaxDelay?: number;
  syncMissed?: boolean;
  lastInboxId?: string | null;
}

const REQUEST_TIMEOUT_MS = 30_000;
const SEND_RETRY_ATTEMPTS = 3;
const SEND_RETRY_BASE_MS = 800;

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

function isTransientFetchError(err: unknown): boolean {
  if (err instanceof Error && err.name === "AbortError") return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|network|timeout|abort/i.test(msg);
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

function wsUrlFromBase(base: string): string {
  const u = new URL(base);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/ws/bot";
  u.search = "";
  u.hash = "";
  return u.toString().replace(/\/$/, "");
}

export class SupraBotApi {
  readonly baseUrl: string;
  readonly login: string;
  readonly token: string;

  private _ws: WebSocket | null = null;
  private _wsHandlers: WsHandlers = {};
  private _wsOptions: Required<WsOptions> = {
    reconnect: true,
    reconnectMinDelay: 1000,
    reconnectMaxDelay: 30000,
    syncMissed: true,
    lastInboxId: null,
  };
  private _wsManualClose = false;
  private _wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _wsReconnectAttempt = 0;
  private _wsLastInboxId: string | null = null;
  private _wsSeenIds = new Set<string>();
  private _wsSeenMessageIds = new Set<string>();
  private _wsSyncing = false;
  private _wsPendingMessages: Array<{ update: BotApiMessage; envelope: unknown }> = [];

  constructor(options: { baseUrl: string; login: string; token: string }) {
    if (!options.login || !options.token) {
      throw new Error("SupraBotApi: login и token обязательны");
    }
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.login = options.login;
    this.token = options.token;
  }

  private _authQuery(): string {
    return new URLSearchParams({ login: this.login, token: this.token }).toString();
  }

  private async _fetchOnce<T>(url: string, init: RequestInit): Promise<{ res: Response; data: T & { error?: string } }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      return { res, data };
    } finally {
      clearTimeout(timer);
    }
  }

  private async _request<T>(
    path: string,
    params: Record<string, unknown> = {},
    method = "GET",
  ): Promise<T> {
    let url = joinUrl(this.baseUrl, "api/bot-api/" + path) + "?" + this._authQuery();
    const m = method.toUpperCase();
    const init: RequestInit = { method: m, headers: {} };
    if (m === "GET") {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== "") qs.set(k, String(v));
      }
      const extra = qs.toString();
      if (extra) url += "&" + extra;
    } else {
      (init.headers as Record<string, string>)["Content-Type"] = "application/json";
      init.body = JSON.stringify(params);
    }

    const { res, data } = await this._fetchOnce<T>(url, init);
    if (!res.ok && data?.error) {
      const err = new Error(data.error) as Error & { response?: unknown; status?: number };
      err.response = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  private async _requestWithRetry<T>(
    path: string,
    params: Record<string, unknown> = {},
    method = "POST",
  ): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= SEND_RETRY_ATTEMPTS; attempt++) {
      let url = joinUrl(this.baseUrl, "api/bot-api/" + path) + "?" + this._authQuery();
      const m = method.toUpperCase();
      const init: RequestInit = { method: m, headers: {} };
      if (m === "GET") {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v != null && v !== "") qs.set(k, String(v));
        }
        const extra = qs.toString();
        if (extra) url += "&" + extra;
      } else {
        (init.headers as Record<string, string>)["Content-Type"] = "application/json";
        init.body = JSON.stringify(params);
      }

      try {
        const { res, data } = await this._fetchOnce<T>(url, init);
        if (res.ok) return data;
        if (isTransientHttpStatus(res.status) && attempt < SEND_RETRY_ATTEMPTS) {
          await sleepMs(SEND_RETRY_BASE_MS * attempt);
          continue;
        }
        if (data?.error) {
          const err = new Error(data.error) as Error & { response?: unknown; status?: number };
          err.response = data;
          err.status = res.status;
          throw err;
        }
        return data;
      } catch (err) {
        lastErr = err;
        if (isTransientFetchError(err) && attempt < SEND_RETRY_ATTEMPTS) {
          await sleepMs(SEND_RETRY_BASE_MS * attempt);
          continue;
        }
        throw err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  getMe(): Promise<BotApiMeResponse> {
    return this._request<BotApiMeResponse>("me", {}, "GET");
  }

  sendMessage(params: BotApiSendMessageParams): Promise<BotApiSendMessageResponse> {
    return this._requestWithRetry<BotApiSendMessageResponse>(
      "sendMessage",
      params as Record<string, unknown>,
      "POST",
    );
  }

  sendActivity(params: {
    activityType: string;
    active?: boolean;
    activityMessage?: string;
    userLogin?: string;
    chatId?: string;
  }): Promise<BotApiSendActivityResponse> {
    return this._request<BotApiSendActivityResponse>("sendActivity", params, "POST");
  }

  /** Сбрасывает индикаторы активности (typing, sendingImage и т.д.). */
  async clearActivities(
    target: { userLogin?: string; chatId?: string },
    types?: string[],
  ): Promise<void> {
    let toClear = types?.length
      ? [...new Set(types.filter(Boolean))]
      : ["typing", "sendingImage", "sendingFile", "recordingVoice"];
    if (!types?.length) {
      try {
        const cur = await this.getActivity(target);
        for (const a of cur.activities ?? []) {
          if (a.active && a.activityType) toClear.push(a.activityType);
        }
        toClear = [...new Set(toClear)];
      } catch {
        /* ignore */
      }
    }
    await Promise.all(
      toClear.map((activityType) =>
        this.sendActivity({ ...target, activityType, active: false }).catch(() => {}),
      ),
    );
  }

  async uploadFile(
    chatId: string,
    data: Buffer | ArrayBuffer | Uint8Array,
    fileName: string,
    mimeType: string,
  ): Promise<BotApiUploadFileResponse> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(data)], { type: mimeType }), fileName);

    const url =
      joinUrl(this.baseUrl, "api/bot-api/uploadFile") +
      "?" +
      this._authQuery() +
      "&chatId=" +
      encodeURIComponent(chatId);

    const res = await fetch(url, { method: "POST", body: form });
    const body = (await res.json().catch(() => ({}))) as BotApiUploadFileResponse;
    if (!res.ok && body?.error) {
      const err = new Error(body.error) as Error & { response?: unknown; status?: number };
      err.response = body;
      err.status = res.status;
      throw err;
    }
    return body;
  }

  getActivity(params: {
    userLogin?: string;
    chatId?: string;
  } = {}): Promise<BotApiGetActivityResponse> {
    return this._request<BotApiGetActivityResponse>("getActivity", params, "GET");
  }

  editMessage(params: {
    chatId: string;
    messageId: string;
    text?: string;
    buttons?: BotMessageButtonDto[];
  }): Promise<BotApiEditMessageResponse> {
    return this._request<BotApiEditMessageResponse>("editMessage", params, "POST");
  }

  deleteMessage(params: {
    chatId: string;
    messageId: string;
    deleteForEveryone?: boolean;
  }): Promise<BotApiDeleteMessageResponse> {
    return this._request<BotApiDeleteMessageResponse>("deleteMessage", params, "POST");
  }

  getMessages(params: {
    count?: number;
    offset?: number;
    afterMessageId?: string;
  } = {}): Promise<BotApiGetMessagesResponse> {
    return this._request<BotApiGetMessagesResponse>("getMessages", params, "GET");
  }

  getMenu(params: { chatId?: string } = {}): Promise<BotApiGetMenuResponse> {
    return this._request<BotApiGetMenuResponse>("getMenu", params, "GET");
  }

  setMenu(params: { menu: BotApiMenuDto; chatId?: string }): Promise<BotApiSetMenuResponse> {
    return this._request<BotApiSetMenuResponse>("setMenu", params, "POST");
  }

  getGroupMenu(params: { chatId?: string } = {}): Promise<BotApiGetGroupMenuResponse> {
    return this._request<BotApiGetGroupMenuResponse>("getGroupMenu", params, "GET");
  }

  setGroupMenu(params: {
    groupMenu: BotApiMenuDto;
    chatId?: string;
  }): Promise<BotApiSetGroupMenuResponse> {
    return this._request<BotApiSetGroupMenuResponse>("setGroupMenu", params, "POST");
  }

  getChatInfo(params: { chatId: string }): Promise<BotApiGetChatInfoResponse> {
    return this._request<BotApiGetChatInfoResponse>("getChatInfo", params, "GET");
  }

  setAssistantMenu(params: { menu: BotApiMenuDto; chatId?: string }): Promise<BotApiSetMenuResponse> {
    return this._request<BotApiSetMenuResponse>("setAssistantMenu", { assistantMenu: params.menu, chatId: params.chatId }, "POST");
  }

  assistantReply(params: {
    sessionId: string;
    text: string;
    photoFileId?: string;
    documentFileId?: string;
  }): Promise<{ success: boolean; messageId?: string; sessionId?: string; error?: string }> {
    return this._request("assistantReply", params, "POST");
  }

  getFileUrl(fileId: string, variant: BotFileVariant = "original"): string {
    const path =
      variant === "preview"
        ? "getFilePreview"
        : variant === "medium"
          ? "getFileMedium"
          : "getFile";
    return (
      joinUrl(this.baseUrl, "api/bot-api/" + path) +
      "?" +
      this._authQuery() +
      "&fileId=" +
      encodeURIComponent(fileId)
    );
  }

  async downloadFile(fileId: string, variant: BotFileVariant = "original"): Promise<ArrayBuffer> {
    const url = this.getFileUrl(fileId, variant);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`downloadFile ${fileId}: HTTP ${res.status}${text ? ` — ${text.slice(0, 200)}` : ""}`);
    }
    return res.arrayBuffer();
  }

  private _clearWsReconnectTimer(): void {
    if (this._wsReconnectTimer) {
      clearTimeout(this._wsReconnectTimer);
      this._wsReconnectTimer = null;
    }
  }

  private _scheduleWsReconnect(): void {
    if (this._wsManualClose || !this._wsOptions.reconnect) return;
    this._clearWsReconnectTimer();
    const minDelay = this._wsOptions.reconnectMinDelay;
    const maxDelay = this._wsOptions.reconnectMaxDelay;
    const attempt = ++this._wsReconnectAttempt;
    const delay = Math.min(maxDelay, minDelay * Math.pow(2, attempt - 1));
    this._wsHandlers.onReconnect?.(attempt, delay);
    this._wsReconnectTimer = setTimeout(() => {
      this._wsReconnectTimer = null;
      this._openWebSocket();
    }, delay);
  }

  private _noteInboxMessage(update: BotApiMessage): void {
    if (!update?.id) return;
    this._wsLastInboxId = update.id;
    this._wsSeenIds.add(update.id);
    if (update.messageId) this._wsSeenMessageIds.add(update.messageId);
  }

  private _isDuplicateInboxUpdate(update: BotApiMessage): boolean {
    if (update.id && this._wsSeenIds.has(update.id)) return true;
    if (update.messageId && this._wsSeenMessageIds.has(update.messageId)) return true;
    return false;
  }

  private _deliverInboxMessage(update: BotApiMessage, envelope: unknown): void {
    if (!this._wsHandlers.onMessage || !update) return;
    if (this._isDuplicateInboxUpdate(update)) return;
    this._noteInboxMessage(update);
    this._wsHandlers.onMessage(update, envelope);
  }

  private _flushPendingWsMessages(): void {
    const pending = this._wsPendingMessages;
    this._wsPendingMessages = [];
    for (const item of pending) {
      this._deliverInboxMessage(item.update, item.envelope);
    }
  }

  private async _syncMissedMessages(): Promise<void> {
    if (!this._wsOptions.syncMissed || !this._wsHandlers.onMessage) return;
    if (!this._wsLastInboxId) return;

    this._wsSyncing = true;
    this._wsHandlers.onSyncStart?.();
    let synced = 0;
    let afterId = this._wsLastInboxId;

    try {
      while (true) {
        const r = await this.getMessages({ count: 100, afterMessageId: afterId });
        const messages = r.messages ?? [];
        if (!messages.length) break;
        for (const update of messages) {
          if (update?.id && !this._isDuplicateInboxUpdate(update)) {
            this._noteInboxMessage(update);
            this._wsHandlers.onMessage(update, { type: "sync" });
            synced++;
          }
          if (update?.id) afterId = update.id;
        }
        if (messages.length < 100) break;
      }
    } catch (e) {
      this._wsHandlers.onSyncError?.(e);
    } finally {
      this._wsSyncing = false;
      this._wsHandlers.onSyncComplete?.(synced);
      this._flushPendingWsMessages();
    }
  }

  private _openWebSocket(): void {
    if (this._ws) {
      try {
        this._ws.removeAllListeners();
        this._ws.close();
      } catch {
        /* ignore */
      }
      this._ws = null;
    }

    const handlers = this._wsHandlers;
    const u = new URL(wsUrlFromBase(this.baseUrl));
    u.searchParams.set("login", this.login);
    u.searchParams.set("token", this.token);

    const ws = new WebSocket(u.toString());
    this._ws = ws;
    let connectedHandled = false;

    ws.on("open", () => {
      this._wsReconnectAttempt = 0;
    });

    ws.on("message", (raw) => {
      let msg: {
        type?: string;
        update?: BotApiMessage;
        botUserId?: string;
      };
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }

      if (msg.type === "connected") {
        if (!connectedHandled) {
          connectedHandled = true;
          handlers.onConnected?.({ type: "connected", botUserId: msg.botUserId });
          void this._syncMissedMessages();
        }
        return;
      }

      if (msg.type === "message" && msg.update) {
        if (this._wsSyncing) {
          this._wsPendingMessages.push({ update: msg.update, envelope: msg });
          return;
        }
        this._deliverInboxMessage(msg.update, msg);
      }
    });

    ws.on("error", (e) => {
      handlers.onError?.(e);
    });

    ws.on("close", (code, reason) => {
      handlers.onClose?.({ code, reason: reason.toString() });
      if (this._ws === ws) this._ws = null;
      if (!this._wsManualClose) this._scheduleWsReconnect();
    });
  }

  connectWebSocket(handlers: WsHandlers, options?: WsOptions): WebSocket | null {
    this.disconnectWebSocket();
    this._wsManualClose = false;
    this._wsHandlers = handlers;
    this._wsOptions = {
      reconnect: options?.reconnect ?? true,
      reconnectMinDelay: options?.reconnectMinDelay ?? 1000,
      reconnectMaxDelay: options?.reconnectMaxDelay ?? 30000,
      syncMissed: options?.syncMissed ?? true,
      lastInboxId: options?.lastInboxId ?? null,
    };

    if (this._wsOptions.lastInboxId) {
      this._wsLastInboxId = this._wsOptions.lastInboxId;
      this._wsSeenIds.add(this._wsOptions.lastInboxId);
    } else {
      this._wsLastInboxId = null;
      this._wsSeenIds = new Set();
    }
    this._wsSeenMessageIds = new Set();

    this._wsReconnectAttempt = 0;
    this._wsSyncing = false;
    this._wsPendingMessages = [];
    this._openWebSocket();
    return this._ws;
  }

  disconnectWebSocket(): void {
    this._wsManualClose = true;
    this._clearWsReconnectTimer();
    if (this._ws) {
      try {
        this._ws.removeAllListeners();
        this._ws.close();
      } catch {
        /* ignore */
      }
      this._ws = null;
    }
  }

  pingWebSocket(): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ action: "ping" }));
    }
  }

  getLastInboxId(): string | null {
    return this._wsLastInboxId;
  }
}
