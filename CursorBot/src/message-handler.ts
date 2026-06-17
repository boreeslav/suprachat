import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AppConfig } from "./config.js";
import { normalizeUserLogin } from "./bot-config.js";
import type { BotMenuManager } from "./bot-menu-manager.js";
import { CursorBridge, PENDING_RUN_SKIP_RECOVERY_MS } from "./cursor-bridge.js";
import { formatModeLabel } from "./cursor-mode.js";
import type { ModelCatalog } from "./model-catalog.js";
import type { ProjectCatalog } from "./project-catalog.js";
import type { BotApiMessage, BotMessageButtonDto, SupraBotApi } from "./supra-bot-api.js";
import { isMcContentText, MediaInboxService, resolveInboundMedia } from "./media-inbox.js";
import { PendingFilesStore } from "./pending-files.js";
import { formatStatusMessage, type ChatWorkSnapshot } from "./session-status.js";
import { AssistantHandler } from "./assistant-handler.js";
import {
  ActionHandler,
  isActionCommand,
  isScriptActionUiCommand,
  parseActionCommand,
} from "./action-handler.js";
import { ActionMgmtHandler, isMetaActionId, parseMetaActionId } from "./action-mgmt-handler.js";
import { scheduleSafeRestart } from "./bot-restart.js";
import {
  buildModeSetupMessage,
  buildModelSetupMessage,
  buildSetupCompleteMessage,
  isSetupCancelResponse,
  isSetupResponse,
  type SessionSetupState,
} from "./session-setup.js";
import { parseSessionCommand, parseSessionKey, makeSessionKey, isSessionCommand, SESSION_CMD_PREFIX } from "./session-keys.js";
import { isGroupChatType } from "./chat-type.js";
import { buildSessionPickerButtons, buildSessionPickerText } from "./session-picker.js";
import { SessionOutbox } from "./session-outbox.js";
import { SessionRegistry } from "./session-registry.js";
import type { PendingRunRecord } from "./state-store.js";
import {
  ThoughtBuffer,
  ThoughtStatusPublisher,
  type AgentProgressEvent,
} from "./thought-status.js";

const HELP_TEXT = `Команды Cursor-бота:

/help — эта справка
/sessions — выбор или создание сессии
/new — новая сессия с выбором режима и модели
/mode agent — режим реализации (активная сессия)
/mode ask — режим вопросов без правок
/model auto — модель Auto (выбор Cursor)
/model pro — модель Pro (Premium)
/model <id> — конкретная модель (например composer-2.5)
/model list — список моделей в меню
/project <id> — переключить проект (папку репозитория)
/project list — список проектов
/status — статус активной сессии
/stop или /sess:stop — остановить текущую задачу агента (меню «Сессии» → «Остановить»)
/actions — каталог кнопок-действий (скрипты и задачи агента)

До ${5} параллельных сессий на чат. Фоновые сессии продолжают работу; их ответы появятся при переключении.
Любой другой текст отправляется агенту в активную сессию.

Фото и коллажи анализируются автоматически (что изображено / выполнение подписи).
Другие файлы сохраняются в tmp/bot-inbox проекта — напишите, что с ними сделать.`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function raceTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    sleep(timeoutMs).then(() => {
      throw new Error(`${label}: таймаут ${Math.round(timeoutMs / 1000)} с`);
    }),
  ]);
}

const WELCOME_TEXT = `Привет! Я Cursor-бот — AI-агент в SuperMessenger.

Напишите вопрос или задачу — передам её в активную сессию Cursor.
/sessions — переключить сессию или создать новую (до 5 параллельно) через меню «Сессии».
/help — список команд.`;

/** Текст входящего сообщения: обычный text или action нажатой inline-кнопки. */
function resolveInboundText(update: BotApiMessage): string {
  const text = (update.text ?? "").trim();
  if (text) return text;
  return (update.buttonPress?.action ?? "").trim();
}

function splitMessage(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const parts: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf("\n\n", maxChars);
    if (cut < maxChars * 0.4) cut = rest.lastIndexOf("\n", maxChars);
    if (cut < maxChars * 0.4) cut = maxChars;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}

type ReplyTarget = { userLogin?: string; chatId?: string };

interface ActiveChatWork {
  sessionKey: string;
  token: symbol;
  thoughtStatus: ThoughtStatusPublisher | null;
  thoughtBuffer: ThoughtBuffer | null;
  update: BotApiMessage;
  lastActivity?: string;
  stopHeartbeat?: () => void;
}

interface StoppedSessionState {
  stoppedAt: string;
  followupMessageId?: string;
}

export class MessageHandler {
  private readonly processing = new Set<string>();
  private readonly processedMessageIds = new Set<string>();
  private readonly recentReplies = new Map<string, number>();
  /** Ключ — sessionKey; несколько сессий одного чата могут работать параллельно. */
  private readonly activeSessionWork = new Map<string, ActiveChatWork>();
  /** Сессии, где пользователь остановил задачу и может уточнить или отменить. */
  private readonly stoppedSessions = new Map<string, StoppedSessionState>();
  private readonly pendingSetup = new Map<string, SessionSetupState>();
  private readonly chatWorkStatus = new Map<string, ChatWorkSnapshot>();
  private readonly chatHandleChains = new Map<string, Promise<void>>();
  private readonly menuRefreshSignals = new Map<string, string>();
  private readonly outbox: SessionOutbox;
  private readonly mediaInbox: MediaInboxService;
  private readonly pendingFiles = new PendingFilesStore();
  private readonly assistantHandler: AssistantHandler;
  private readonly actionHandler: ActionHandler;
  private readonly actionMgmt: ActionMgmtHandler;

  constructor(
    private readonly api: SupraBotApi,
    private readonly cursor: CursorBridge,
    private readonly config: AppConfig,
    private readonly menuManager: BotMenuManager,
    private readonly models: ModelCatalog,
    private readonly projects: ProjectCatalog,
    private readonly sessions: SessionRegistry,
  ) {
    this.outbox = new SessionOutbox(join(dirname(config.stateFile), "outbox"));
    this.mediaInbox = new MediaInboxService(api, config);
    this.assistantHandler = new AssistantHandler(api, cursor, config.bot.assistant, config);
    this.actionHandler = new ActionHandler(api, config);
    this.actionMgmt = new ActionMgmtHandler(api, cursor, sessions, config);
  }

  private isAllowedUser(update: BotApiMessage): boolean {
    const allowed = this.config.bot.allowedUser;
    if (!allowed) return true;
    const login = normalizeUserLogin(update.senderLogin || "");
    return login === normalizeUserLogin(allowed);
  }

  /** Команды и действия, обрабатываемые сразу — даже пока агент выполняет задачу на Cursor API. */
  private isPrioritizedMessage(update: BotApiMessage, text: string): boolean {
    if (text && isSessionCommand(text)) return true;
    if (text === "/status" || text.startsWith("/status ")) return true;
    if (text === "/sessions" || text.startsWith("/sessions ")) return true;
    if (text === "/new" || text.startsWith("/new ")) return true;
    if (text === "/help" || text.startsWith("/help ")) return true;
    if (text === "/cancel" || text.startsWith("/cancel ")) return true;
    if (isActionCommand(text)) return true;
    if (
      text === "/mode agent"
      || text.startsWith("/mode agent ")
      || text === "/mode ask"
      || text.startsWith("/mode ask ")
      || text === "/mode plan"
      || text.startsWith("/mode plan ")
    ) {
      return true;
    }
    if (text === "/model" || text.startsWith("/model ")) return true;
    if (text === "/project" || text.startsWith("/project ")) return true;
    if (update.buttonPress && text && isScriptActionUiCommand(text)) return true;
    return false;
  }

  private isSessionTaskBusy(sessionKey: string): boolean {
    return this.sessions.isBusy(sessionKey) || this.activeSessionWork.has(sessionKey);
  }

  private isAwaitingStopFollowup(sessionKey: string): boolean {
    return this.stoppedSessions.has(sessionKey);
  }

  private clearAwaitingStopFollowup(sessionKey: string): void {
    this.stoppedSessions.delete(sessionKey);
  }

  private async replyBusyHint(update: BotApiMessage): Promise<void> {
    await this.reply(
      update,
      "Задача выполняется. Остановите её через меню «Сессии» → «Остановить» (/sess:stop), затем уточните или отмените.",
    );
  }

  async handle(update: BotApiMessage): Promise<void> {
    const dedupeKey = update.messageId || update.id;
    if (!dedupeKey || this.processing.has(dedupeKey)) return;
    if (update.messageId && this.processedMessageIds.has(update.messageId)) return;

    const textRaw = resolveInboundText(update);
    const text = isMcContentText(textRaw) ? "" : textRaw;

    if (this.isPrioritizedMessage(update, text)) {
      await this.handleMessage(update, dedupeKey);
      return;
    }

    const chatId = update.chatId;
    const prev = this.chatHandleChains.get(chatId) ?? Promise.resolve();
    const next = prev
      .catch(() => undefined)
      .then(() => this.handleMessage(update, dedupeKey));
    this.chatHandleChains.set(chatId, next);
    try {
      await next;
    } finally {
      if (this.chatHandleChains.get(chatId) === next) {
        this.chatHandleChains.delete(chatId);
      }
    }
  }

  private async handleMessage(update: BotApiMessage, dedupeKey: string): Promise<void> {
    this.processing.add(dedupeKey);
    if (update.messageId) {
      this.processedMessageIds.add(update.messageId);
      if (this.processedMessageIds.size > 500) {
        const drop = [...this.processedMessageIds].slice(0, 100);
        for (const id of drop) this.processedMessageIds.delete(id);
      }
    }

    try {
      if (!this.isAllowedUser(update)) {
        await this.reply(
          update,
          `Доступ ограничен. Бот работает только для @${this.config.bot.allowedUser}.`,
        );
        return;
      }

      if (update.assistantSession?.sessionId) {
        await this.assistantHandler.handle(update);
        return;
      }

      this.writeDeployStatusTarget(update);

      const textRaw = resolveInboundText(update);
      const text = isMcContentText(textRaw) ? "" : textRaw;
      const media = resolveInboundMedia(update);
      if (!text && !media) return;

      if (update.buttonPress && text && isScriptActionUiCommand(text)) {
        await this.deleteIncomingUserMessage(update);
        return;
      }

      this.sessions.ensureRoom(update.chatId);
      await this.menuManager.syncChatMenu(update.chatId, update.chatType);

      if (text && (await this.tryHandleActionInput(update, text))) {
        return;
      }

      if (text && isSessionCommand(text)) {
        await this.deleteIncomingUserMessage(update);
        await this.handleSessionCommand(update, text);
        return;
      }

      const pending = this.pendingSetup.get(update.chatId);
      if (pending && !isSetupResponse(text, pending.step)) {
        this.pendingSetup.delete(update.chatId);
      }

      if (await this.tryHandleSessionSetup(update, text)) {
        return;
      }

      if (text === "/start") {
        await this.reply(update, WELCOME_TEXT);
        await this.refreshSessionMenu(update.chatId);
        return;
      }

      if (text === "/sessions" || text.startsWith("/sessions ")) {
        await this.deleteIncomingUserMessage(update);
        await this.refreshSessionMenu(update.chatId);
        await this.showSessionPicker(update);
        return;
      }

      if (!this.sessions.hasActiveSession(update.chatId)) {
        if (text === "/help" || text.startsWith("/help ")) {
          await this.reply(update, HELP_TEXT);
          return;
        }
        if (text === "/start") {
          await this.reply(update, WELCOME_TEXT);
          await this.refreshSessionMenu(update.chatId);
          return;
        }
        if (text === "/new" || text.startsWith("/new ")) {
          await this.cleanupPendingSetupQuestion(update);
          await this.deleteIncomingUserMessage(update);
          const created = this.sessions.createSession(update.chatId);
          if (!created.ok) {
            await this.reply(update, created.reason);
            return;
          }
          this.sessions.switchActive(update.chatId, created.sessionId);
          await this.cursor.resetSession(this.sessionKey(update.chatId, created.sessionId));
          await this.refreshSessionMenu(update.chatId);
          await this.dismissSessionPicker(update);
          await this.startSessionSetup(update);
          return;
        }
        if (media) {
          await this.reply(
            update,
            "Сначала выберите или создайте сессию (/sessions или меню «Сессии»), затем отправьте файл снова.",
          );
        }
        await this.showSessionPicker(update);
        return;
      }

      const activeSessionKey = this.sessions.getActiveSessionKey(update.chatId)!;

      if (text === "/help" || text.startsWith("/help ")) {
        await this.reply(update, HELP_TEXT);
        return;
      }

      if (text === "/new" || text.startsWith("/new ")) {
        await this.cleanupPendingSetupQuestion(update);
        await this.deleteIncomingUserMessage(update);
        const created = this.sessions.createSession(update.chatId);
        if (!created.ok) {
          await this.reply(update, created.reason);
          return;
        }
        this.sessions.switchActive(update.chatId, created.sessionId);
        await this.cursor.resetSession(this.sessionKey(update.chatId, created.sessionId));
        await this.refreshSessionMenu(update.chatId);
        await this.dismissSessionPicker(update);
        await this.startSessionSetup(update);
        return;
      }

      if (text === "/mode agent" || text.startsWith("/mode agent ")) {
        await this.interruptSessionWork(activeSessionKey);
        await this.cursor.setMode(activeSessionKey, "agent");
        await this.menuManager.publishForChat(update.chatId, update.chatType);
        await this.reply(update, `Режим: ${formatModeLabel("agent")}.`);
        return;
      }

      if (
        text === "/mode ask" ||
        text.startsWith("/mode ask ") ||
        text === "/mode plan" ||
        text.startsWith("/mode plan ")
      ) {
        await this.interruptSessionWork(activeSessionKey);
        await this.cursor.setMode(activeSessionKey, "ask");
        await this.menuManager.publishForChat(update.chatId, update.chatType);
        await this.reply(update, `Режим: ${formatModeLabel("ask")}.`);
        return;
      }

      if (text === "/status" || text.startsWith("/status ")) {
        const agentId = this.cursor.getAgentId(activeSessionKey);
        const mode = this.cursor.getMode(activeSessionKey);
        const model = this.cursor.getModel(activeSessionKey);
        const projectId = this.cursor.getProjectId(activeSessionKey);
        const pending = this.cursor.getPendingRun(activeSessionKey);
        const work = this.getSessionWorkSnapshot(activeSessionKey);
        let serverActivities: Awaited<ReturnType<SupraBotApi["getActivity"]>>["activities"];
        try {
          const server = await this.api.getActivity(this.replyTarget(update));
          serverActivities = server.success ? server.activities : undefined;
        } catch {
          serverActivities = undefined;
        }
        await this.reply(
          update,
          formatStatusMessage(
            update,
            mode,
            model,
            this.models,
            agentId,
            this.config.cursor.runtime,
            projectId,
            this.projects,
            this.cursor.getProjectPath(activeSessionKey),
            work,
            pending,
            serverActivities,
          ),
        );
        return;
      }

      if (text === "/project list" || text.startsWith("/project list ")) {
        const active = this.cursor.getProjectId(activeSessionKey);
        const lines = this.projects.listMenuProjects().map((p) => {
          const mark = p.id.toLowerCase() === active.toLowerCase() ? " ✓" : "";
          return `• ${p.name} (${p.id})${mark}`;
        });
        await this.reply(update, ["Доступные проекты:", ...lines].join("\n"));
        return;
      }

      if (text === "/project" || text.startsWith("/project ")) {
        const arg = text.slice("/project".length).trim();
        if (!arg) {
          const projectId = this.cursor.getProjectId(activeSessionKey);
          await this.reply(
            update,
            `Проект: ${this.projects.formatLabel(projectId)}.\nПапка: ${this.cursor.getProjectPath(activeSessionKey)}\n/project list — список проектов.`,
          );
          return;
        }

        const normalized = this.projects.normalizeKey(arg);
        if (!normalized) {
          await this.reply(update, `Неизвестный проект «${arg}». /project list — список доступных.`);
          return;
        }

        await this.interruptSessionWork(activeSessionKey);
        await this.cursor.setProject(activeSessionKey, normalized);
        await this.menuManager.publishForChat(update.chatId, update.chatType);
        await this.reply(
          update,
          `Проект: ${this.projects.formatLabel(normalized)}.\nПапка: ${this.cursor.getProjectPath(activeSessionKey)}\nКонтекст Cursor для этой сессии будет создан заново при следующем запросе.`,
        );
        return;
      }

      if (text === "/model list" || text.startsWith("/model list ")) {
        const lines = this.models.listAvailableLabels();
        await this.reply(
          update,
          ["Доступные модели:", ...lines.map((line) => `• ${line}`)].join("\n"),
        );
        return;
      }

      if (text === "/model" || text.startsWith("/model ")) {
        const arg = text.slice("/model".length).trim();
        if (!arg) {
          const model = this.cursor.getModel(activeSessionKey);
          await this.reply(
            update,
            `Модель: ${this.models.formatLabel(model)}.\nИспользуйте /model auto, /model pro или /model list.`,
          );
          return;
        }

        const normalized = this.models.normalizeKey(arg);
        if (!normalized) {
          await this.reply(update, `Неизвестная модель «${arg}». /model list — список доступных.`);
          return;
        }

        await this.interruptSessionWork(activeSessionKey);
        await this.cursor.setModel(activeSessionKey, normalized);
        await this.menuManager.publishForChat(update.chatId, update.chatType);
        await this.reply(update, `Модель: ${this.models.formatLabel(normalized)}.`);
        return;
      }

      if (text.startsWith("/")) {
        if (isScriptActionUiCommand(text)) return;
        await this.reply(update, `Неизвестная команда. ${HELP_TEXT.split("\n")[0]}`);
        return;
      }

      if (media) {
        await this.handleInboundMedia(update, activeSessionKey, text);
        return;
      }

      if (this.pendingFiles.has(update.chatId)) {
        const files = this.pendingFiles.take(update.chatId);
        const prompt = this.pendingFiles.buildAgentPrompt(files, text);
        const workToken = Symbol("session-work");
        if (this.isAwaitingStopFollowup(activeSessionKey)) {
          this.clearAwaitingStopFollowup(activeSessionKey);
        } else if (this.isSessionTaskBusy(activeSessionKey)) {
          await this.replyBusyHint(update);
          return;
        }
        this.startAgentRequest(update, activeSessionKey, prompt, workToken);
        return;
      }

      const workToken = Symbol("session-work");
      if (this.isAwaitingStopFollowup(activeSessionKey)) {
        this.clearAwaitingStopFollowup(activeSessionKey);
        this.startAgentRequest(update, activeSessionKey, text, workToken);
        return;
      }
      if (this.isSessionTaskBusy(activeSessionKey)) {
        await this.replyBusyHint(update);
        return;
      }
      this.startAgentRequest(update, activeSessionKey, text, workToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[handler]", update.id, msg);
      try {
        await this.reply(update, `Ошибка: ${msg}`);
      } catch {
        /* ignore secondary failure */
      }
    } finally {
      this.processing.delete(dedupeKey);
    }
  }

  private async tryHandleActionInput(update: BotApiMessage, text: string): Promise<boolean> {
    if (text === "/cancel" || text.startsWith("/cancel ")) {
      const sessionKey = this.sessions.getActiveSessionKey(update.chatId);
      if (sessionKey && this.isAwaitingStopFollowup(sessionKey)) {
        await this.cancelStoppedTask(update, sessionKey);
        return true;
      }
      if (this.actionMgmt.hasPending(update.chatId)) {
        this.actionMgmt.clearPending(update.chatId);
        await this.reply(update, "Отменено.");
        return true;
      }
    }

    if (
      await this.actionMgmt.tryHandlePendingDescription(
        update,
        text,
        (u, t) => this.reply(u, t).then(() => undefined),
        async () => {
          await this.clearChatActivities(update);
          await this.scheduleBotRestart("action-mgmt");
        },
      )
    ) {
      return true;
    }

    if (!isActionCommand(text)) return false;

    const parsed = parseActionCommand(text);
    if (!parsed) return false;

    if (parsed.kind === "list") {
      await this.deleteIncomingUserMessage(update);
      await this.dismissActionsCatalog(update);
      await this.showActionsCatalog(update, 0, { forceNew: true });
      return true;
    }

    const actionId = parsed.actionId;
    if (isMetaActionId(actionId)) {
      const meta = parseMetaActionId(actionId);
      if (meta?.kind === "page") {
        await this.deleteIncomingUserMessage(update);
        await this.showActionsCatalog(update, meta.pageIndex);
        return true;
      }
      await this.cleanupActionUiMessages(update);
      await this.actionMgmt.handleMetaAction(
        update,
        actionId,
        (u, t) => this.reply(u, t).then(() => undefined),
        (u, t, buttons) => this.replyWithButtons(u, t, buttons),
      );
      return true;
    }

    await this.cleanupActionUiMessages(update);
    try {
      await this.actionHandler.runAction(
        update,
        actionId,
        this.replyTarget(update),
        (u, t) => this.reply(u, t).then(() => undefined),
        (u, prompt, mode, replyPrefix) =>
          this.runAgentActionForCatalog(u, prompt, mode, replyPrefix),
      );
    } finally {
      await this.clearChatActivities(update);
    }
    return true;
  }

  private async dismissActionsCatalog(update: BotApiMessage): Promise<void> {
    const chatId = update.chatId;
    const catalogId = this.sessions.getActionsCatalogMessageId(chatId);
    this.sessions.setActionsCatalogMessageId(chatId, undefined);
    if (!catalogId) return;
    try {
      await this.deleteReply(update, catalogId);
    } catch (err) {
      console.warn(
        "[handler] dismiss actions catalog failed:",
        catalogId,
        err instanceof Error ? err.message : err,
      );
    }
  }

  private async showActionsCatalog(
    update: BotApiMessage,
    pageIndex = 0,
    opts?: { forceNew?: boolean },
  ): Promise<void> {
    const chatId = update.chatId;
    const actions = this.actionHandler.loadActions();
    const text = this.actionHandler.buildCatalogText();
    const buttons = this.actionHandler.buildActionButtons(actions, pageIndex);

    const existingId = this.sessions.getActionsCatalogMessageId(chatId);
    if (!opts?.forceNew && existingId) {
      try {
        const result = await this.api.editMessage({
          chatId,
          messageId: existingId,
          text,
          buttons,
        });
        if (result.success) return;
        console.warn(
          "[handler] edit actions catalog failed:",
          result.error ?? "unknown",
        );
      } catch (err) {
        console.warn(
          "[handler] edit actions catalog failed:",
          err instanceof Error ? err.message : err,
        );
      }
      this.sessions.setActionsCatalogMessageId(chatId, undefined);
    }

    const messageId = await this.replyWithButtons(update, text, buttons, { skipDedup: true });
    if (messageId) {
      this.sessions.setActionsCatalogMessageId(chatId, messageId);
    }
  }

  private async cleanupActionUiMessages(update: BotApiMessage): Promise<void> {
    const ids = new Set<string>();
    if (update.buttonPress?.sourceMessageId) ids.add(update.buttonPress.sourceMessageId);
    if (update.messageId) ids.add(update.messageId);

    const catalogId = this.sessions.getActionsCatalogMessageId(update.chatId);
    if (catalogId) ids.add(catalogId);
    this.sessions.setActionsCatalogMessageId(update.chatId, undefined);

    for (const messageId of ids) {
      try {
        await this.deleteReply(update, messageId);
      } catch (err) {
        console.warn(
          "[handler] cleanup action UI message:",
          messageId,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  private async clearChatActivities(update: BotApiMessage): Promise<void> {
    await this.api.clearActivities(this.replyTarget(update));
  }

  private async scheduleBotRestart(reason: string): Promise<void> {
    await scheduleSafeRestart(this.config.stateFile, () => this.sessions.flushState(), reason);
  }

  private async runAgentActionForCatalog(
    update: BotApiMessage,
    prompt: string,
    mode: "agent" | "ask",
    replyPrefix?: string,
  ): Promise<void> {
    const sessionKey = this.sessions.getActiveSessionKey(update.chatId);
    if (!sessionKey) {
      await this.reply(
        update,
        "Сначала выберите или создайте сессию (/sessions), затем повторите действие.",
      );
      await this.showSessionPicker(update);
      return;
    }

    await this.interruptSessionWork(sessionKey);
    await this.cursor.setMode(sessionKey, mode);
    await this.menuManager.publishForChat(update.chatId, update.chatType);

    const fullPrompt = replyPrefix ? `${replyPrefix}${prompt}` : prompt;
    const workToken = Symbol("action-agent");
    this.clearAwaitingStopFollowup(sessionKey);
    this.startAgentRequest(update, sessionKey, fullPrompt, workToken);
  }

  private async handleInboundMedia(
    update: BotApiMessage,
    sessionKey: string,
    extraText = "",
  ): Promise<void> {
    const media = resolveInboundMedia(update);
    if (!media) return;

    if (this.isSessionTaskBusy(sessionKey) && !this.isAwaitingStopFollowup(sessionKey)) {
      await this.replyBusyHint(update);
      return;
    }

    const activityType = media.isPhotoBatch ? "sendingImage" : "sendingFile";
    try {
      await this.api.sendActivity({
        ...this.replyTarget(update),
        activityType,
        active: true,
        activityMessage: media.isPhotoBatch ? "Скачиваю фото…" : "Скачиваю файл…",
      });
    } catch {
      /* ignore activity errors */
    }

    try {
      const projectPath = this.cursor.getProjectPath(sessionKey);
      const ingested = await this.mediaInbox.ingestAttachments(update, projectPath);
      if (!ingested.length) {
        await this.reply(update, "Не удалось получить вложения.");
        return;
      }

      const isPhotos = ingested.every((f) => f.kind === "image");
      const extraCaption = isMcContentText(extraText) ? "" : extraText.trim();
      const caption = (media.caption || extraCaption).trim();

      if (isPhotos) {
        await this.reply(
          update,
          ingested.length > 1
            ? `🖼 Получил ${ingested.length} фото. Анализирую…`
            : caption
              ? "🖼 Получил фото с подписью. Выполняю…"
              : "🖼 Получил фото. Анализирую содержимое…",
        );
        const prompt = this.mediaInbox.buildPhotoAgentPrompt(ingested, caption);
        const workToken = Symbol("session-work");
        if (this.isAwaitingStopFollowup(sessionKey)) {
          this.clearAwaitingStopFollowup(sessionKey);
        } else if (this.isSessionTaskBusy(sessionKey)) {
          await this.replyBusyHint(update);
          return;
        }
        this.startAgentRequest(update, sessionKey, prompt, workToken);
        return;
      }

      this.pendingFiles.add(update.chatId, ingested);
      await this.reply(update, this.pendingFiles.formatUserNotice(ingested));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[handler] inbound media:", msg);
      await this.reply(update, `Не удалось обработать вложение: ${msg}`);
    } finally {
      try {
        await this.api.sendActivity({
          ...this.replyTarget(update),
          activityType,
          active: false,
        });
      } catch {
        /* ignore */
      }
    }
  }

  private async startSessionSetup(update: BotApiMessage): Promise<void> {
    const question = buildModeSetupMessage();
    const messageId = await this.replyWithButtons(update, question.text, question.buttons, {
      skipDedup: true,
    });
    if (!messageId) {
      console.error("[handler] startSessionSetup: sendMessage with buttons returned no messageId");
      await this.reply(
        update,
        "Не удалось показать выбор режима. Повторите /new или «➕ Новая» в меню сессий.",
      );
      return;
    }
    this.pendingSetup.set(update.chatId, {
      step: "mode",
      questionMessageId: messageId,
    });
    this.chatWorkStatus.set(update.chatId, {
      phase: "setup",
      detail: "Выбор режима и модели",
      startedAt: new Date().toISOString(),
    });
  }

  private async tryHandleSessionSetup(update: BotApiMessage, text: string): Promise<boolean> {
    const pending = this.pendingSetup.get(update.chatId);
    if (!pending || !isSetupResponse(text, pending.step)) return false;

    if (isSetupCancelResponse(text)) {
      await this.cleanupSetupMessages(update, pending);
      this.pendingSetup.delete(update.chatId);
      this.chatWorkStatus.delete(update.chatId);

      if (pending.step === "model") {
        const sk = this.sessions.getActiveSessionKey(update.chatId);
        if (!sk) return true;
        const mode = this.cursor.getMode(sk);
        const model = this.cursor.getModel(sk);
        await this.reply(update, buildSetupCompleteMessage(mode, model, this.models));
      } else {
        await this.reply(update, "Отменено. Сессия не изменена.");
      }
      return true;
    }

    if (pending.step === "mode") {
      const mode =
        text === "/mode ask" ||
        text.startsWith("/mode ask ") ||
        text === "/mode plan" ||
        text.startsWith("/mode plan ")
          ? "ask"
          : "agent";

      const sessionKey = this.sessions.getActiveSessionKey(update.chatId);
      if (!sessionKey) return true;
      await this.interruptSessionWork(sessionKey);
      await this.cursor.setMode(sessionKey, mode);
      await this.cursor.resetSession(sessionKey);
      await this.menuManager.publishForChat(update.chatId, update.chatType);
      await this.cleanupSetupMessages(update, pending);

      const question = buildModelSetupMessage(this.models.getMenuModels());
      const messageId = await this.replyWithButtons(update, question.text, question.buttons, {
        skipDedup: true,
      });
      if (!messageId) {
        await this.reply(update, "Не удалось показать выбор модели. Используйте /model auto или /model pro.");
        this.pendingSetup.delete(update.chatId);
        return true;
      }
      this.pendingSetup.set(update.chatId, {
        step: "model",
        questionMessageId: messageId,
      });
      return true;
    }

    const arg = text.slice("/model".length).trim();
    if (!arg) return false;

    const normalized = this.models.normalizeKey(arg);
    if (!normalized) {
      await this.reply(update, `Неизвестная модель «${arg}». Выберите кнопку ниже.`);
      return true;
    }

    const sessionKey = this.sessions.getActiveSessionKey(update.chatId);
    if (!sessionKey) return true;
    await this.interruptSessionWork(sessionKey);
    await this.cursor.setModel(sessionKey, normalized);
    await this.menuManager.publishForChat(update.chatId, update.chatType);
    await this.cleanupSetupMessages(update, pending);
    this.pendingSetup.delete(update.chatId);
    this.chatWorkStatus.delete(sessionKey);

    const mode = this.cursor.getMode(sessionKey);
    await this.reply(update, buildSetupCompleteMessage(mode, normalized, this.models));
    return true;
  }

  private async cleanupPendingSetupQuestion(update: BotApiMessage): Promise<void> {
    const pending = this.pendingSetup.get(update.chatId);
    if (!pending) return;
    this.pendingSetup.delete(update.chatId);
    if (!pending.questionMessageId) return;
    try {
      await this.deleteReply(update, pending.questionMessageId);
    } catch (err) {
      console.warn(
        "[handler] cleanup pending setup question:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  private async cleanupSetupMessages(
    update: BotApiMessage,
    pending: SessionSetupState,
  ): Promise<void> {
    const messageIds = [pending.questionMessageId, update.messageId].filter(Boolean) as string[];
    for (const messageId of messageIds) {
      try {
        await this.deleteReply(update, messageId);
      } catch (err) {
        console.warn(
          "[handler] cleanup setup message:",
          messageId,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  private async deleteIncomingUserMessage(update: BotApiMessage): Promise<void> {
    if (!update.messageId) return;
    try {
      await this.deleteReply(update, update.messageId);
    } catch (err) {
      console.warn(
        "[handler] delete user command:",
        update.messageId,
        err instanceof Error ? err.message : err,
      );
    }
  }

  private async replyWithButtons(
    update: BotApiMessage,
    text: string,
    buttons: BotMessageButtonDto[],
    opts?: { skipDedup?: boolean },
  ): Promise<string | undefined> {
    const dedupKey = `${update.chatId}:${text}:${buttons.map((b) => b.id ?? b.text).join("|")}`;
    const now = Date.now();
    if (!opts?.skipDedup) {
      const lastAt = this.recentReplies.get(dedupKey);
      if (lastAt != null && now - lastAt < 5000) return undefined;
    }
    this.recentReplies.set(dedupKey, now);
    if (this.recentReplies.size > 200) {
      for (const [key, at] of this.recentReplies) {
        if (now - at > 60_000) this.recentReplies.delete(key);
      }
    }

    const result = await this.api.sendMessage({
      ...this.replyTarget(update),
      text,
      buttons,
    });
    if (!result.success) {
      console.error("[handler] sendMessage with buttons failed:", result.error ?? "unknown");
      return undefined;
    }
    return result.messageId;
  }

  private sessionKey(chatId: string, sessionId: string): string {
    return makeSessionKey(chatId, sessionId);
  }

  private isSessionLive(sessionKey: string): boolean {
    const parsed = parseSessionKey(sessionKey);
    if (!parsed) return false;
    return this.sessions.getActiveSessionId(parsed.chatId) === parsed.sessionId;
  }

  private thoughtBufferPath(chatId: string, sessionId: string): string {
    return join(dirname(this.config.stateFile), "thoughts", chatId, `${sessionId}.txt`);
  }

  private async handleSessionCommand(update: BotApiMessage, text: string): Promise<void> {
    const cmd = parseSessionCommand(text);
    if (!cmd) return;

    if (cmd.kind === "new") {
      await this.cleanupPendingSetupQuestion(update);
      const created = this.sessions.createSession(update.chatId);
      if (!created.ok) {
        console.warn(`[handler] createSession failed for ${update.chatId}: ${created.reason}`);
        await this.reply(update, created.reason);
        await this.refreshSessionMenu(update.chatId);
        return;
      }
      console.log(`[handler] new session ${created.sessionId} in chat ${update.chatId}`);
      await this.switchToSession(update, created.sessionId, { isNew: true });
      await this.startSessionSetup(update);
      return;
    }

    if (cmd.kind === "end") {
      const sessionId = this.sessions.getActiveSessionId(update.chatId);
      if (!sessionId) {
        await this.reply(update, "Нет активной сессии для завершения.");
        await this.showSessionPicker(update);
        return;
      }
      await this.endSession(update, sessionId);
      return;
    }

    if (cmd.kind === "stop") {
      const sessionId = this.sessions.getActiveSessionId(update.chatId);
      if (!sessionId) {
        await this.reply(update, "Нет активной сессии.");
        await this.showSessionPicker(update);
        return;
      }
      await this.stopSessionWork(update, this.sessionKey(update.chatId, sessionId));
      return;
    }

    if (cmd.kind === "stop-cancel") {
      const sessionId = this.sessions.getActiveSessionId(update.chatId);
      if (!sessionId) {
        await this.reply(update, "Нет активной сессии.");
        return;
      }
      await this.cancelStoppedTask(update, this.sessionKey(update.chatId, sessionId));
      return;
    }

    await this.switchToSession(update, cmd.sessionId);
  }

  private async endSession(update: BotApiMessage, sessionId: string): Promise<void> {
    const chatId = update.chatId;
    const sessionKey = this.sessionKey(chatId, sessionId);
    const ended = this.sessions.endSession(chatId, sessionId);
    if (!ended.ok) {
      await this.reply(update, ended.reason);
      return;
    }

    await this.cleanupPendingSetupQuestion(update);
    this.pendingSetup.delete(chatId);
    this.chatWorkStatus.delete(chatId);
    this.chatWorkStatus.delete(sessionKey);

    await this.interruptSessionWork(sessionKey);
    this.clearAwaitingStopFollowup(sessionKey);
    this.sessions.clearRuntime(sessionKey);
    await this.cursor.disposeSession(sessionKey);

    await this.refreshSessionMenu(chatId);

    const title = this.sessions.sessionTitle(sessionId);
    await this.reply(update, `${title} завершена.`);
    await this.showSessionPicker(update);
  }

  private async showSessionPicker(update: BotApiMessage): Promise<void> {
    const chatId = update.chatId;
    const text = buildSessionPickerText(this.sessions, chatId);
    const buttons = buildSessionPickerButtons(this.sessions, chatId);

    const existingId = this.sessions.getPickerMessageId(chatId);
    if (existingId) {
      try {
        await this.api.editMessage({
          chatId,
          messageId: existingId,
          text,
          buttons,
        });
        return;
      } catch (err) {
        console.warn(
          "[handler] edit session picker failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    const messageId = await this.replyWithButtons(update, text, buttons);
    if (messageId) {
      this.sessions.setPickerMessageId(chatId, messageId);
    }
  }

  private async dismissSessionPicker(update: BotApiMessage): Promise<void> {
    const chatId = update.chatId;
    const pickerId = this.sessions.getPickerMessageId(chatId);
    if (!pickerId) return;
    this.sessions.setPickerMessageId(chatId, undefined);
    try {
      await this.deleteReply(update, pickerId);
    } catch (err) {
      console.warn(
        "[handler] dismiss session picker failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  private async switchToSession(
    update: BotApiMessage,
    targetSessionId: string,
    opts: { isNew?: boolean } = {},
  ): Promise<void> {
    const chatId = update.chatId;
    if (!opts.isNew && this.sessions.getActiveSessionId(chatId) === targetSessionId) {
      await this.refreshSessionMenu(update.chatId);
      return;
    }

    const prevSessionId = this.sessions.getActiveSessionId(chatId) ?? targetSessionId;
    const prevSessionKey = this.sessionKey(chatId, prevSessionId);
    this.promoteSessionToBackground(prevSessionKey);
    this.detachLiveThoughts(prevSessionKey);

    if (!this.sessions.switchActive(chatId, targetSessionId)) {
      await this.reply(update, `Сессия ${targetSessionId} не найдена.`);
      await this.refreshSessionMenu(update.chatId);
      return;
    }

    const targetSessionKey = this.sessionKey(chatId, targetSessionId);
    this.clearAwaitingStopFollowup(prevSessionKey);
    if (opts.isNew) {
      const prevSession = this.cursor.getMode(prevSessionKey);
      const prevModel = this.cursor.getModel(prevSessionKey);
      const prevProject = this.cursor.getProjectId(prevSessionKey);
      await this.cursor.resetSession(targetSessionKey);
      await this.cursor.setMode(targetSessionKey, prevSession);
      await this.cursor.setModel(targetSessionKey, prevModel);
      await this.cursor.setProject(targetSessionKey, prevProject);
    }

    const title = this.sessions.sessionTitle(targetSessionId);
    const statusLine = this.sessions.formatStatusLine(targetSessionKey);

    await this.reply(
      update,
      `Переключено на ${title}.\nСтатус: ${statusLine}`,
    );

    await this.flushSessionOutbox(update, chatId, targetSessionId);
    await this.attachLiveThoughtsIfNeeded(update, targetSessionKey);
    await this.dismissSessionPicker(update);
    await this.refreshSessionMenu(chatId);
  }

  private promoteSessionToBackground(sessionKey: string): void {
    const work = this.activeSessionWork.get(sessionKey);
    if (!work) return;
    if (work.thoughtBuffer) return;

    const parsed = parseSessionKey(sessionKey);
    if (!parsed) return;

    void ThoughtBuffer.load(
      this.thoughtBufferPath(parsed.chatId, parsed.sessionId),
      this.config.supra.thoughtMaxChars,
    ).then((buffer) => {
      work.thoughtBuffer = buffer;
    });
  }

  private detachLiveThoughts(sessionKey: string): void {
    const work = this.activeSessionWork.get(sessionKey);
    if (!work?.thoughtStatus) return;
    work.thoughtStatus.dispose();
    work.thoughtStatus = null;
  }

  private shouldPublishThoughtStatus(update: BotApiMessage, sessionKey: string): boolean {
    return (
      this.config.supra.sendThoughtStatus &&
      this.isSessionLive(sessionKey) &&
      !isGroupChatType(update.chatType)
    );
  }

  private async attachLiveThoughtsIfNeeded(
    update: BotApiMessage,
    sessionKey: string,
  ): Promise<void> {
    if (!this.config.supra.sendThoughtStatus) return;
    if (isGroupChatType(update.chatType)) return;
    if (!this.sessions.isBusy(sessionKey)) return;

    const parsed = parseSessionKey(sessionKey);
    if (!parsed) return;

    const buffer = await ThoughtBuffer.load(
      this.thoughtBufferPath(parsed.chatId, parsed.sessionId),
      this.config.supra.thoughtMaxChars,
    );
    const initial = buffer.getFormattedText();
    if (!initial) return;

    const publisher = new ThoughtStatusPublisher(
      update,
      this.api,
      {
        minIntervalMs: this.config.supra.thoughtUpdateIntervalMs,
        maxChars: this.config.supra.thoughtMaxChars,
      },
      this.replyTarget(update),
      initial,
    );

    const work = this.activeSessionWork.get(sessionKey);
    if (work) {
      work.thoughtStatus = publisher;
      work.thoughtBuffer = null;
    }
  }

  private async flushSessionOutbox(
    update: BotApiMessage,
    chatId: string,
    sessionId: string,
  ): Promise<void> {
    const entries = await this.outbox.readAll(chatId, sessionId);
    if (!entries.length) return;

    const remaining: { text: string; ts: string }[] = [];
    for (const entry of entries) {
      const chunks = splitMessage(entry.text, this.config.supra.maxMessageChars);
      let allSent = true;
      for (const chunk of chunks) {
        const messageId = await this.reply(update, chunk, { skipDedup: true });
        if (!messageId) {
          allSent = false;
          break;
        }
      }
      if (!allSent) remaining.push(entry);
    }

    await this.outbox.rewrite(chatId, sessionId, remaining);
  }

  private menuRefreshSignal(chatId: string): string {
    const activeId = this.sessions.getActiveSessionId(chatId);
    const sessionKey = this.sessions.getActiveSessionKey(chatId);
    const sessionIds = this.sessions.listSessionIds(chatId);
    const busyFlags = sessionIds
      .map((id) => (this.sessions.isBusy(makeSessionKey(chatId, id)) ? "1" : "0"))
      .join("");
    return [
      activeId ?? "",
      sessionIds.join(","),
      busyFlags,
      sessionKey ? this.cursor.getMode(sessionKey) : "agent",
      sessionKey ? this.cursor.getModel(sessionKey) : "auto",
      sessionKey ? this.cursor.getProjectId(sessionKey) : this.projects.defaultKey,
    ].join("|");
  }

  private refreshSessionMenu(chatId: string, force = false): Promise<void> {
    const signal = this.menuRefreshSignal(chatId);
    if (!force && this.menuRefreshSignals.get(chatId) === signal) {
      return Promise.resolve();
    }
    return this.menuManager.publishForChat(chatId, this.menuManager.getChatType(chatId), force).then(() => {
      this.menuRefreshSignals.set(chatId, signal);
    });
  }

  private startAgentRequest(
    update: BotApiMessage,
    sessionKey: string,
    text: string,
    workToken: symbol,
  ): void {
    void this.runAgentRequest(update, sessionKey, text, workToken).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[handler] agent request failed (${sessionKey}):`, msg);
      if (this.isActiveWork(sessionKey, workToken)) {
        this.finishSessionWork(sessionKey);
        this.sessions.setRuntime(sessionKey, "idle");
        void this.refreshSessionMenu(update.chatId);
      }
      if (this.isSessionLive(sessionKey)) {
        void this.reply(update, `Ошибка: ${msg}`, { skipDedup: true });
      }
    });
  }

  private async stopSessionWork(update: BotApiMessage, sessionKey: string): Promise<void> {
    const wasBusy = this.isSessionTaskBusy(sessionKey);
    await this.interruptSessionWork(sessionKey);
    void this.refreshSessionMenu(update.chatId, true);

    if (!wasBusy && this.isAwaitingStopFollowup(sessionKey)) {
      const buttons: BotMessageButtonDto[] = [
        {
          id: "sess-stop-cancel",
          text: "❌ Отменить задачу",
          action: `${SESSION_CMD_PREFIX}stop-cancel`,
          color: "danger",
        },
      ];
      await this.replyWithButtons(
        update,
        "Задача уже остановлена.\nОтправьте уточнение, чтобы продолжить, или отмените задачу.",
        buttons,
        { skipDedup: true },
      );
      return;
    }

    if (!wasBusy) {
      await this.reply(update, "Нет выполняющейся задачи.");
      return;
    }

    this.stoppedSessions.set(sessionKey, { stoppedAt: new Date().toISOString() });
    const buttons: BotMessageButtonDto[] = [
      {
        id: "sess-stop-cancel",
        text: "❌ Отменить задачу",
        action: `${SESSION_CMD_PREFIX}stop-cancel`,
        color: "danger",
      },
    ];
    await this.replyWithButtons(
      update,
      "Выполнение остановлено.\nОтправьте уточнение, чтобы продолжить, или отмените задачу.",
      buttons,
      { skipDedup: true },
    );
  }

  private async cancelStoppedTask(update: BotApiMessage, sessionKey: string): Promise<void> {
    if (!this.isAwaitingStopFollowup(sessionKey) && !this.isSessionTaskBusy(sessionKey)) {
      await this.reply(update, "Нет остановленной задачи для отмены.");
      return;
    }
    await this.interruptSessionWork(sessionKey);
    this.clearAwaitingStopFollowup(sessionKey);
    void this.refreshSessionMenu(update.chatId, true);
    await this.reply(update, "Задача отменена.");
  }

  private async runAgentRequest(
    update: BotApiMessage,
    sessionKey: string,
    text: string,
    workToken: symbol,
  ): Promise<void> {
    const parsed = parseSessionKey(sessionKey);
    if (!parsed) return;

    await this.withTyping(update, async () => {
      const thoughtStatus = this.shouldPublishThoughtStatus(update, sessionKey)
          ? new ThoughtStatusPublisher(
              update,
              this.api,
              {
                minIntervalMs: this.config.supra.thoughtUpdateIntervalMs,
                maxChars: this.config.supra.thoughtMaxChars,
              },
              this.replyTarget(update),
            )
          : null;

      const thoughtBuffer =
        !thoughtStatus && this.config.supra.sendThoughtStatus
          ? await ThoughtBuffer.load(
              this.thoughtBufferPath(parsed.chatId, parsed.sessionId),
              this.config.supra.thoughtMaxChars,
            )
          : null;

      this.activeSessionWork.set(sessionKey, {
        sessionKey,
        token: workToken,
        thoughtStatus,
        thoughtBuffer,
        update,
        lastActivity: "Обрабатываю запрос…",
        stopHeartbeat: this.startActivityHeartbeat(update, sessionKey, () =>
          this.activeSessionWork.get(sessionKey)?.lastActivity || "Обрабатываю запрос…",
        ),
      });

      const onProgress = (event: AgentProgressEvent) => {
        const live = this.isSessionLive(sessionKey);
        const work = this.activeSessionWork.get(sessionKey);
        if (event.kind === "thinking") {
          if (live && work?.thoughtStatus) {
            work.thoughtStatus.push(event);
          } else {
            work?.thoughtBuffer?.push(event);
          }
          this.sessions.setRuntime(sessionKey, "thinking", event.text);
          void this.refreshSessionMenu(update.chatId);
          return;
        }
        if (live && (this.config.supra.sendTyping || this.config.supra.sendThoughtStatus)) {
          void this.setActivityStatus(update, event.text, true);
        }
        this.sessions.touchProgress(sessionKey, event.text);
        void this.refreshSessionMenu(update.chatId);
        this.touchSessionWorkProgress(sessionKey, event.text);
      };

      if (this.isSessionLive(sessionKey) && this.config.supra.sendTyping) {
        await this.setActivityStatus(update, "Обрабатываю запрос…", true);
      } else if (this.isSessionLive(sessionKey) && this.config.supra.sendThoughtStatus) {
        thoughtStatus?.push({ kind: "status", text: "Обрабатываю запрос…" });
      }
      this.beginSessionWork(sessionKey, "executing", "Обрабатываю запрос…");
      this.sessions.setRuntime(sessionKey, "executing", "Обрабатываю запрос…");
      void this.refreshSessionMenu(update.chatId);

      try {
        const reply = await this.cursor.ask(sessionKey, text, {
          senderName: update.senderName || update.senderLogin,
          chatType: update.chatType,
          chatName: update.chatName,
          onProgress,
          delivery: {
            sessionKey,
            sessionId: parsed.sessionId,
            inboxId: update.id,
            chatId: update.chatId,
            chatType: update.chatType,
            chatName: update.chatName,
            senderLogin: update.senderLogin,
            senderName: update.senderName,
          },
        });

        if (!this.isActiveWork(sessionKey, workToken)) return;

        thoughtStatus?.dispose();
        if (thoughtBuffer) thoughtBuffer.clear();

        if (reply.superseded) return;

        await this.deliverAgentReply(update, sessionKey, reply, () =>
          this.isActiveWork(sessionKey, workToken),
        );
      } finally {
        if (this.isActiveWork(sessionKey, workToken)) {
          this.finishSessionWork(sessionKey);
          this.sessions.setRuntime(sessionKey, "idle");
          void this.refreshSessionMenu(update.chatId);
        }
        thoughtStatus?.dispose();
      }
    });
  }

  private isActiveWork(sessionKey: string, token: symbol): boolean {
    return this.activeSessionWork.get(sessionKey)?.token === token;
  }

  private async interruptSessionWork(sessionKey: string): Promise<void> {
    const active = this.activeSessionWork.get(sessionKey);
    if (!active) return;
    active.stopHeartbeat?.();
    this.activeSessionWork.delete(sessionKey);
    active.thoughtStatus?.dispose();
    await this.cursor.interruptChat(sessionKey);
    this.finishSessionWork(sessionKey);
    this.sessions.setRuntime(sessionKey, "idle");
    if (this.config.supra.sendTyping && this.isSessionLive(sessionKey)) {
      await this.setTyping(active.update, false);
    }
  }

  /** Повторно публикует активность на сервер после переподключения WebSocket. */
  async refreshPublishedActivities(): Promise<void> {
    for (const [sessionKey, work] of this.activeSessionWork) {
      if (!this.isSessionLive(sessionKey)) continue;
      const message = work.lastActivity?.trim();
      if (!message) continue;
      try {
        await this.api.sendActivity({
          ...this.replyTarget(work.update),
          activityType: "typing",
          active: true,
          activityMessage: message,
        });
      } catch (err) {
        console.warn(
          `[handler] refresh activity for ${sessionKey} failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  getChatWorkSnapshot(chatId: string): ChatWorkSnapshot | undefined {
    const sessionKey = this.sessions.getActiveSessionKey(chatId);
    if (!sessionKey) return undefined;
    return this.getSessionWorkSnapshot(sessionKey);
  }

  getSessionWorkSnapshot(sessionKey: string): ChatWorkSnapshot | undefined {
    const parsed = parseSessionKey(sessionKey);
    if (parsed) {
      const setup = this.pendingSetup.get(parsed.chatId);
      if (setup) {
        return {
          phase: "setup",
          detail: setup.step === "mode" ? "Выбор режима" : "Выбор модели",
          startedAt: this.chatWorkStatus.get(sessionKey)?.startedAt,
        };
      }
    }
    return this.chatWorkStatus.get(sessionKey);
  }

  private beginSessionWork(
    sessionKey: string,
    phase: ChatWorkSnapshot["phase"],
    detail: string,
    runId?: string,
  ): void {
    const now = new Date().toISOString();
    this.chatWorkStatus.set(sessionKey, {
      phase,
      detail,
      startedAt: now,
      lastProgressAt: now,
      runId,
    });
  }

  private touchSessionWorkProgress(sessionKey: string, detail: string, runId?: string): void {
    const prev = this.chatWorkStatus.get(sessionKey);
    const now = new Date().toISOString();
    this.chatWorkStatus.set(sessionKey, {
      phase: prev?.phase === "recovering" ? "recovering" : "executing",
      detail: detail.trim() || prev?.detail || "Выполняю запрос…",
      startedAt: prev?.startedAt ?? now,
      lastProgressAt: now,
      runId: runId ?? prev?.runId,
    });
    const active = this.activeSessionWork.get(sessionKey);
    if (active) active.lastActivity = detail.trim() || active.lastActivity;
  }

  private finishSessionWork(sessionKey: string): void {
    this.chatWorkStatus.delete(sessionKey);
    const active = this.activeSessionWork.get(sessionKey);
    active?.stopHeartbeat?.();
    this.activeSessionWork.delete(sessionKey);
  }

  private startActivityHeartbeat(
    update: BotApiMessage,
    sessionKey: string,
    getMessage: () => string,
  ): () => void {
    if (!this.config.supra.sendTyping && !this.config.supra.sendThoughtStatus) {
      return () => undefined;
    }
    const timer = setInterval(() => {
      if (!this.activeSessionWork.has(sessionKey)) return;
      if (!this.isSessionLive(sessionKey)) return;
      const message = getMessage();
      if (!message) return;
      void this.setActivityStatus(update, message, true);
    }, 45_000);
    return () => clearInterval(timer);
  }

  /** Восстанавливает ответы, прерванные перезапуском бота. Не блокирует WebSocket. */
  async recoverPendingRuns(): Promise<void> {
    const pruned = this.cursor.pruneStalePendingRuns();
    if (pruned > 0) {
      console.log(`[handler] Очищено устаревших pending runs: ${pruned}`);
    }

    const pending = this.cursor.listPendingRuns();
    if (!pending.length) return;

    console.log(`[handler] Восстановление ${pending.length} незавершённых ответов…`);
    for (const record of pending) {
      try {
        await this.recoverOnePendingRun(record);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[handler] recover ${record.runId} (unexpected):`, msg);
        this.cursor.pruneStalePendingRuns();
      }
    }
  }

  private async recoverOnePendingRun(record: PendingRunRecord): Promise<void> {
    const sessionKey = record.sessionKey;
    const workToken = Symbol("recover");
    const update = this.pendingRunToUpdate(record);
    const statusText = "Проверяю прерванный ответ…";
    const workerTimeoutMs = this.config.cursor.recoverRunTimeoutMs;
    const retryTimeoutMs = 5 * 60_000;
    const recoveryTimeoutMs = workerTimeoutMs + 20_000 + retryTimeoutMs;
    let delivered = false;

    const ageMs = Date.now() - Date.parse(record.startedAt);
    if (Number.isFinite(ageMs) && ageMs > PENDING_RUN_SKIP_RECOVERY_MS) {
      console.warn(
        `[handler] Pending run ${record.runId} слишком старый (${Math.round(ageMs / 60_000)} мин), пропускаем восстановление`,
      );
      this.cursor.abandonPendingRun(sessionKey);
      await this.notifyRecoveryFailed(update);
      return;
    }

    this.beginSessionWork(sessionKey, "recovering", statusText, record.runId);
    this.sessions.setRuntime(sessionKey, "recovering", statusText);
    this.activeSessionWork.set(sessionKey, {
      sessionKey,
      token: workToken,
      thoughtStatus: null,
      thoughtBuffer: null,
      update,
      lastActivity: statusText,
      stopHeartbeat: this.startActivityHeartbeat(update, sessionKey, () =>
        this.activeSessionWork.get(sessionKey)?.lastActivity || statusText,
      ),
    });

    const finishRecoveryWork = async (): Promise<void> => {
      const active = this.activeSessionWork.get(sessionKey);
      if (active?.token === workToken) {
        active.stopHeartbeat?.();
        this.activeSessionWork.delete(sessionKey);
        this.finishSessionWork(sessionKey);
        this.sessions.setRuntime(sessionKey, "idle");
      }
      if (this.config.supra.sendTyping) {
        await this.setTyping(update, false);
      }
    };

    try {
      const live = this.isSessionLive(sessionKey);
      const thoughtStatus = this.shouldPublishThoughtStatus(update, sessionKey)
          ? new ThoughtStatusPublisher(
              update,
              this.api,
              {
                minIntervalMs: this.config.supra.thoughtUpdateIntervalMs,
                maxChars: this.config.supra.thoughtMaxChars,
              },
              this.replyTarget(update),
            )
          : null;
      this.activeSessionWork.get(sessionKey)!.thoughtStatus = thoughtStatus;

      const onProgress = (event: AgentProgressEvent) => {
        if (event.kind === "thinking") {
          if (live) thoughtStatus?.push(event);
          return;
        }
        if (live && (this.config.supra.sendTyping || this.config.supra.sendThoughtStatus)) {
          void this.setActivityStatus(update, event.text, true);
        }
        this.touchSessionWorkProgress(sessionKey, event.text, record.runId);
      };

      if (live && this.config.supra.sendTyping) {
        await this.setActivityStatus(update, statusText, true);
      }

      const runRecovery = async (): Promise<Awaited<
        ReturnType<CursorBridge["recoverRun"]>
      > | null> => {
        const finished = await Promise.race([
          this.cursor.peekFinishedRun(record),
          sleep(5_000).then(() => null),
        ]);
        if (!this.isActiveWork(sessionKey, workToken)) return null;
        if (finished) return finished;

        this.touchSessionWorkProgress(sessionKey, "Подключаюсь к прерванному run…", record.runId);
        const recovered = await Promise.race([
          this.cursor.recoverRun(record, onProgress),
          sleep(workerTimeoutMs).then(() => null),
        ]);
        if (!this.isActiveWork(sessionKey, workToken)) return null;
        if (recovered) return recovered;

        if (!record.prompt?.trim()) {
          console.warn(`[handler] Нет сохранённого prompt для ${sessionKey}, автопродолжение невозможно`);
          return null;
        }

        console.log(
          `[handler] Run ${record.runId} недоступен — выполняю запрос заново (сессия ${sessionKey})`,
        );
        this.touchSessionWorkProgress(sessionKey, "Продолжаю запрос заново…", record.runId);
        return this.continueInterruptedSession(record, sessionKey, workToken, onProgress);
      };

      const reply = await raceTimeout(runRecovery(), recoveryTimeoutMs, "recovery");
      if (!this.isActiveWork(sessionKey, workToken)) return;

      thoughtStatus?.dispose();

      if (reply && !reply.superseded && reply.status !== "cancelled") {
        await this.deliverAgentReply(update, sessionKey, reply);
        delivered = reply.status !== "error";
        return;
      }

      this.cursor.abandonPendingRun(sessionKey);
      await this.notifyRecoveryFailed(update);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[handler] recover ${record.runId}:`, msg);
      if (this.isActiveWork(sessionKey, workToken)) {
        await this.interruptSessionWork(sessionKey);
      }
      this.cursor.abandonPendingRun(sessionKey);
      await this.notifyRecoveryFailed(update);
    } finally {
      await finishRecoveryWork();
      if (!delivered) {
        this.cursor.abandonPendingRun(sessionKey);
      }
    }
  }

  /** Повторяет сохранённый prompt в новой сессии агента (run после перезапуска бота уже недоступен). */
  private async continueInterruptedSession(
    record: PendingRunRecord,
    sessionKey: string,
    workToken: symbol,
    onProgress?: (event: AgentProgressEvent) => void,
  ): Promise<Awaited<ReturnType<CursorBridge["ask"]>> | null> {
    const prompt = record.prompt?.trim();
    if (!prompt) return null;

    this.beginSessionWork(sessionKey, "executing", "Продолжаю запрос…", record.runId);
    this.sessions.setRuntime(sessionKey, "executing", "Продолжаю запрос…");
    const active = this.activeSessionWork.get(sessionKey);
    if (active) {
      active.lastActivity = "Продолжаю запрос…";
    }

    const reply = await this.cursor.ask(sessionKey, prompt, {
      promptIsComplete: true,
      forceNewAgent: true,
      onProgress,
      delivery: {
        sessionKey,
        sessionId: record.sessionId,
        inboxId: record.inboxId,
        chatId: record.chatId,
        chatType: record.chatType,
        chatName: record.chatName,
        senderLogin: record.senderLogin,
        senderName: record.senderName,
      },
    });

    if (!this.isActiveWork(sessionKey, workToken)) return null;
    return reply;
  }

  private async notifyRecoveryFailed(update: BotApiMessage): Promise<void> {
    try {
      await this.reply(
        update,
        "После перезапуска бота Cursor-run уже недоступен, а повторный запуск вашего сообщения не удался. Отправьте запрос ещё раз.",
        { skipDedup: true },
      );
    } catch (err) {
      console.warn(
        "[handler] notifyRecoveryFailed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  private pendingRunToUpdate(record: PendingRunRecord): BotApiMessage {
    return {
      id: record.inboxId,
      messageId: "",
      chatId: record.chatId,
      chatType: record.chatType,
      chatName: record.chatName ?? null,
      senderId: "",
      senderLogin: record.senderLogin ?? "",
      senderName: record.senderName ?? "",
      text: "",
      timestamp: record.startedAt,
    };
  }

  private async deliverAgentReply(
    update: BotApiMessage,
    sessionKey: string,
    reply: { text: string; runId: string; status: string; superseded?: boolean; errorDetail?: string },
    isStillActive?: () => boolean,
  ): Promise<void> {
    if (reply.superseded) return;

    const parsed = parseSessionKey(sessionKey);
    const live = this.isSessionLive(sessionKey);

    const deliverText = async (text: string, opts?: { skipDedup?: boolean }): Promise<boolean> => {
      if (live) {
        const messageId = await this.reply(update, text, opts);
        return !!messageId;
      }
      if (parsed) {
        await this.outbox.append(parsed.chatId, parsed.sessionId, text);
        return true;
      }
      return false;
    };

    if (reply.status === "error") {
      console.error(
        `[handler] запрос не выполнен после автоповторов (${sessionKey}, run ${reply.runId}):`,
        reply.errorDetail ?? "(без описания)",
      );
      const detail = reply.errorDetail?.trim();
      await deliverText(
        detail
          ? `Ошибка: ${detail}`
          : "Запрос не выполнен. Попробуйте ещё раз или переформулируйте задачу.",
      );
      return;
    }

    if (reply.status === "cancelled") {
      await deliverText("Запрос отменён.");
      return;
    }

    const chunks = splitMessage(reply.text, this.config.supra.maxMessageChars);
    for (const chunk of chunks) {
      if (isStillActive && !isStillActive()) return;
      const ok = await deliverText(chunk, { skipDedup: chunks.length > 1 });
      if (!ok) {
        console.error(
          `[handler] не удалось доставить часть ответа (${sessionKey}, run ${reply.runId})`,
        );
      }
    }
  }

  private async withTyping(update: BotApiMessage, fn: () => Promise<void>): Promise<void> {
    if (!this.config.supra.sendTyping) {
      await fn();
      return;
    }

    await this.setTyping(update, true);
    try {
      await fn();
    } finally {
      await this.setTyping(update, false);
    }
  }

  private replyTarget(update: BotApiMessage): ReplyTarget {
    if (update.chatType === "direct" && update.senderLogin) {
      return { userLogin: update.senderLogin };
    }
    return { chatId: update.chatId };
  }

  private async setTyping(update: BotApiMessage, active: boolean, activityMessage?: string): Promise<void> {
    try {
      await this.api.sendActivity({
        ...this.replyTarget(update),
        activityType: "typing",
        active,
        activityMessage: activityMessage || undefined,
      });
    } catch (err) {
      console.warn("[handler] sendActivity failed:", err instanceof Error ? err.message : err);
    }
  }

  private async setActivityStatus(
    update: BotApiMessage,
    message: string | null,
    active = true,
  ): Promise<void> {
    const sessionKey = this.sessions.getActiveSessionKey(update.chatId);
    if (!sessionKey) return;
    const activeWork = this.activeSessionWork.get(sessionKey);
    if (activeWork && message) activeWork.lastActivity = message;
    await this.setTyping(update, active, message || undefined);
  }

  private async reply(
    update: BotApiMessage,
    text: string,
    opts?: { skipDedup?: boolean },
  ): Promise<string | undefined> {
    const trimmed = text.trim();
    if (!trimmed) return undefined;

    const dedupKey = `${update.chatId}:${trimmed}`;
    const now = Date.now();
    if (!opts?.skipDedup) {
      const lastAt = this.recentReplies.get(dedupKey);
      if (lastAt != null && now - lastAt < 5000) return undefined;
    }
    this.recentReplies.set(dedupKey, now);
    if (this.recentReplies.size > 200) {
      for (const [key, at] of this.recentReplies) {
        if (now - at > 60_000) this.recentReplies.delete(key);
      }
    }

    try {
      const result = await this.api.sendMessage({ ...this.replyTarget(update), text: trimmed });
      if (!result.success) {
        console.error("[handler] sendMessage failed:", result.error ?? "unknown");
        this.recentReplies.delete(dedupKey);
        return undefined;
      }
      return result.messageId;
    } catch (err) {
      console.error(
        "[handler] sendMessage error:",
        err instanceof Error ? err.message : err,
      );
      this.recentReplies.delete(dedupKey);
      return undefined;
    }
  }

  async editReply(update: BotApiMessage, messageId: string, text: string): Promise<void> {
    const result = await this.api.editMessage({
      chatId: update.chatId,
      messageId,
      text,
    });
    if (!result.success) {
      console.error("[handler] editMessage failed:", result.error ?? "unknown");
    }
  }

  async deleteReply(update: BotApiMessage, messageId: string, deleteForEveryone = true): Promise<void> {
    const result = await this.api.deleteMessage({
      chatId: update.chatId,
      messageId,
      deleteForEveryone,
    });
    if (!result.success) {
      throw new Error(result.error || "deleteMessage failed");
    }
    if (deleteForEveryone && result.deleteScope !== "everyone") {
      console.warn(
        `[handler] message ${messageId} hidden only for bot (need server update: bot deleteForEveryone in direct chat)`,
      );
    }
  }

  private writeDeployStatusTarget(update: BotApiMessage): void {
    const sessionKey = this.sessions.getActiveSessionKey(update.chatId);
    const basePath = sessionKey
      ? this.cursor.getProjectPath(sessionKey)
      : this.projects.defaultPath;
    const targetPath = join(basePath, "tmp", "deploy", "status-target.json");
    const payload = {
      baseUrl: this.config.supra.baseUrl,
      botLogin: this.config.supra.login,
      botToken: this.config.supra.token,
      chatId: update.chatType !== "direct" ? update.chatId : "",
      userLogin: update.chatType === "direct" ? (update.senderLogin || "") : "",
      updatedAt: new Date().toISOString(),
    };
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, JSON.stringify(payload, null, 2), "utf8");
  }
}
