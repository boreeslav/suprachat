import {
  Agent,
  AgentNotFoundError,
  type Run,
  type SDKAgent,
  type SDKMessage,
  type SDKToolUseMessage,
} from "@cursor/sdk";
import type { AppConfig, CursorRuntime } from "./config.js";
import {
  normalizeMode,
  toSdkMode,
  type CursorBotMode,
} from "./cursor-mode.js";
import type { ModelCatalog } from "./model-catalog.js";
import type { ProjectCatalog } from "./project-catalog.js";
import { spawnRecoverRun } from "./recover-run-spawn.js";
import {
  buildPromptWithAgentContext,
  captureAgentContext,
  mergeAgentContext,
} from "./agent-context.js";
import type { PendingRunRecord, StateStore } from "./state-store.js";
import type { AgentProgressEvent } from "./thought-status.js";

/** Старше — pending run считается устаревшим и очищается без обращения к SDK. */
const PENDING_RUN_MAX_AGE_MS = 4 * 60 * 60 * 1000;
/** Старше — не пытаемся подключиться к run, сразу просим повторить запрос. */
export const PENDING_RUN_SKIP_RECOVERY_MS = 15 * 60 * 1000;
const MAX_ASK_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 1500;
const RESUME_RETRY_ATTEMPTS = 3;
const AGENT_SDK_TIMEOUT_MS = 90_000;
const PEEK_RUN_TIMEOUT_MS = 10_000;
const STUCK_RUN_TIMEOUT_MS = 15_000;
/** Ожидание run.wait() после завершения stream — защита от бесконечного зависания. */
const RUN_WAIT_TIMEOUT_MS = 30 * 60 * 1000;

export interface AgentReply {
  text: string;
  agentId: string;
  runId: string;
  status: string;
  /** Запрос прерван командой /new или сменой сессии — ответ пользователю не нужен. */
  superseded?: boolean;
  /** Текст ошибки из stream/status, если run завершился с error. */
  errorDetail?: string;
}

export interface AskOptions {
  senderName?: string;
  chatType?: string;
  chatName?: string | null;
  onProgress?: (event: AgentProgressEvent) => void;
  /** Контекст для сохранения незавершённого run (восстановление после перезапуска). */
  delivery?: PendingDeliveryContext;
  /** prompt уже содержит префиксы чата/отправителя — не добавлять повторно. */
  promptIsComplete?: boolean;
  /** Создать нового агента и передать сохранённый контекст (не resume). */
  forceNewAgent?: boolean;
}

export interface PendingDeliveryContext {
  sessionKey: string;
  sessionId: string;
  inboxId: string;
  chatId: string;
  chatType: string;
  chatName?: string | null;
  senderLogin?: string;
  senderName?: string;
  /** Заполняется в ask() — полный текст для автоповтора. */
  prompt?: string;
}

interface ChatRunControl {
  abort: AbortController;
  run: Run | null;
  generation: number;
}

class SessionSupersededError extends Error {
  constructor() {
    super("session superseded");
    this.name = "SessionSupersededError";
  }
}

function isAgentIdForRuntime(agentId: string, runtime: CursorRuntime): boolean {
  const isCloud = agentId.startsWith("bc-");
  return runtime === "cloud" ? isCloud : !isCloud;
}

function isAgentNotFoundError(err: unknown): boolean {
  if (err instanceof AgentNotFoundError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("agent_not_found") ||
      msg.includes("agent not found") ||
      (msg.includes("run ") && msg.includes("not found"))
    );
  }
  return false;
}

function isActiveRunConflictError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("already has active run");
}

function extractStreamError(event: SDKMessage): string | undefined {
  if (event.type === "status" && event.status === "ERROR" && event.message?.trim()) {
    return event.message.trim();
  }
  return undefined;
}

function pickErrorDetail(streamError: string | undefined, resultText: string): string | undefined {
  if (streamError) return streamError;
  const text = resultText.trim();
  if (text && text !== "(пустой ответ)") return text;
  return undefined;
}

function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path;
}

function extractToolPath(args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined;
  const record = args as Record<string, unknown>;
  for (const key of ["path", "target_directory", "target_directory"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function formatToolProgress(event: SDKToolUseMessage): string {
  const name = event.name || "tool";
  const path = extractToolPath(event.args);

  if (event.status === "error") {
    return `${name}: ошибка`;
  }

  if (event.status === "completed") {
    if (path) return `${name}: ${basename(path)} ✓`;
    return `${name} ✓`;
  }

  switch (name) {
    case "Read":
      return path ? `Читаю ${basename(path)}` : "Читаю файл…";
    case "Grep":
    case "Glob":
      return "Ищу в коде…";
    case "Shell":
      return "Выполняю команду…";
    case "Write":
      return path ? `Создаю ${basename(path)}` : "Записываю файл…";
    case "StrReplace":
      return path ? `Правлю ${basename(path)}` : "Редактирую файл…";
    case "Task":
      return "Запускаю подзадачу…";
    default:
      return path ? `${name}: ${basename(path)}` : `${name}…`;
  }
}

function summarizeThinking(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "Думаю…";
  return lines.slice(-2).join(" ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withSdkTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = AGENT_SDK_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label}: таймаут ${Math.round(timeoutMs / 1000)} с`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class CursorBridge {
  private readonly agents = new Map<string, SDKAgent>();
  private readonly queues = new Map<string, Promise<void>>();
  private readonly chatRuns = new Map<string, ChatRunControl>();

  constructor(
    private readonly config: AppConfig["cursor"],
    private readonly state: StateStore,
    private readonly models: ModelCatalog,
    private readonly projects: ProjectCatalog,
  ) {}

  async dispose(options?: { cancelActiveRuns?: boolean }): Promise<void> {
    const cancelActive = options?.cancelActiveRuns !== false;
    if (cancelActive) {
      for (const chatId of [...this.chatRuns.keys()]) {
        await this.cancelChat(chatId);
      }
    }
    for (const agent of this.agents.values()) {
      try {
        await agent[Symbol.asyncDispose]();
      } catch {
        /* ignore */
      }
    }
    this.agents.clear();
    this.queues.clear();
    this.chatRuns.clear();
  }

  /** Прерывает активный run в чате (без сброса сессии). */
  async interruptChat(chatId: string): Promise<void> {
    this.bumpGeneration(chatId);
    await this.cancelChat(chatId);
  }

  listPendingRuns(): PendingRunRecord[] {
    return this.state.listPendingRuns();
  }

  /** Удаляет зависшие pending runs (слишком старые или с неверным runtime). */
  pruneStalePendingRuns(): number {
    let removed = 0;
    for (const record of this.state.listPendingRuns()) {
      const ageMs = Date.now() - Date.parse(record.startedAt);
      if (Number.isFinite(ageMs) && ageMs > PENDING_RUN_MAX_AGE_MS) {
        console.warn(
          `[cursor] Устаревший pending run ${record.runId} (${Math.round(ageMs / 60_000)} мин), очищаем`,
        );
        this.state.clearPendingRun(record.sessionKey);
        removed++;
        continue;
      }
      if (!isAgentIdForRuntime(record.agentId, this.config.runtime)) {
        console.warn(
          `[cursor] Pending run ${record.runId} не для runtime=${this.config.runtime}, очищаем`,
        );
        this.state.clearPendingRun(record.sessionKey);
        removed++;
      }
    }
    return removed;
  }

  getPendingRun(chatId: string): PendingRunRecord | undefined {
    return this.state.getPendingRun(chatId);
  }

  abandonPendingRun(sessionKey: string): void {
    this.state.clearPendingRun(sessionKey);
  }

  private getOrCreateRunControl(chatId: string): ChatRunControl {
    let control = this.chatRuns.get(chatId);
    if (!control) {
      control = {
        abort: new AbortController(),
        run: null,
        generation: 0,
      };
      this.chatRuns.set(chatId, control);
    }
    return control;
  }

  private bumpGeneration(chatId: string): number {
    const control = this.getOrCreateRunControl(chatId);
    control.generation += 1;
    return control.generation;
  }

  private async cancelChat(chatId: string): Promise<void> {
    const control = this.chatRuns.get(chatId);
    if (!control) return;

    if (!control.abort.signal.aborted) {
      control.abort.abort("cancelled");
    }

    const run = control.run;
    control.run = null;
    if (run?.supports("cancel")) {
      try {
        await run.cancel();
      } catch (err) {
        console.warn("[cursor] run.cancel failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  private enqueue<T>(chatId: string, fn: (epoch: number) => Promise<T>): Promise<T> {
    const control = this.getOrCreateRunControl(chatId);
    const epoch = control.generation;
    const prev = this.queues.get(chatId) ?? Promise.resolve();
    const next = prev
      .catch(() => undefined)
      .then(async () => {
        if ((this.chatRuns.get(chatId)?.generation ?? 0) !== epoch) {
          throw new SessionSupersededError();
        }
        return fn(epoch);
      })
      .finally(() => {
        if (this.queues.get(chatId) === next) {
          this.queues.delete(chatId);
        }
      }) as Promise<T>;
    this.queues.set(chatId, next.then(() => undefined));
    return next;
  }

  private resolveCwd(chatId: string): string {
    return this.projects.resolvePath(this.getProjectId(chatId));
  }

  private buildGetRunOptions(agentId: string, chatId: string) {
    if (this.config.runtime === "cloud") {
      return {
        runtime: "cloud" as const,
        agentId,
        apiKey: this.config.apiKey,
      };
    }
    return {
      runtime: "local" as const,
      cwd: this.resolveCwd(chatId),
    };
  }

  private buildListRunsOptions(chatId: string) {
    if (this.config.runtime === "cloud") {
      return {
        runtime: "cloud" as const,
        apiKey: this.config.apiKey,
      };
    }
    return {
      runtime: "local" as const,
      cwd: this.resolveCwd(chatId),
    };
  }

  /** Снимает зависшие run перед созданием новой сессии агента. */
  private async clearStuckRuns(chatId: string, agentId: string, runId?: string): Promise<void> {
    const getRunOpts = this.buildGetRunOptions(agentId, chatId);
    if (runId) {
      this.state.clearPendingRunIfMatch(chatId, runId);
    } else {
      this.state.clearPendingRun(chatId);
    }

    if (runId) {
      try {
        await withSdkTimeout(
          Agent.cancelRun(runId, getRunOpts),
          `cancelRun(${runId})`,
          STUCK_RUN_TIMEOUT_MS,
        );
      } catch (err) {
        console.warn(
          `[cursor] cancelRun ${runId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    try {
      const page = await withSdkTimeout(
        Agent.listRuns(agentId, {
          ...this.buildListRunsOptions(chatId),
          limit: 20,
        }),
        `listRuns(${agentId})`,
        STUCK_RUN_TIMEOUT_MS,
      );
      for (const run of page.items) {
        if (run.status !== "running") continue;
        try {
          if (run.supports("cancel")) {
            await withSdkTimeout(run.cancel(), `cancel(${run.id})`, STUCK_RUN_TIMEOUT_MS);
          } else {
            await withSdkTimeout(
              Agent.cancelRun(run.id, getRunOpts),
              `cancelRun(${run.id})`,
              STUCK_RUN_TIMEOUT_MS,
            );
          }
        } catch (err) {
          console.warn(
            `[cursor] cancel stuck run ${run.id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    } catch (err) {
      console.warn(
        `[cursor] listRuns for ${agentId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /** Переподключает live-агент, сохраняя agentId и историю Cursor. */
  private async refreshAgent(chatId: string, mode: CursorBotMode): Promise<SDKAgent> {
    await this.disposeLiveAgent(chatId);
    const saved = this.state.getChatSession(chatId);
    const agentId = saved?.agentId;

    if (agentId && isAgentIdForRuntime(agentId, this.config.runtime)) {
      for (let attempt = 1; attempt <= RESUME_RETRY_ATTEMPTS; attempt++) {
        try {
          const agent = await withSdkTimeout(
            Agent.resume(agentId, {
              ...this.buildAgentOptions(chatId, saved?.mode ?? mode),
            }),
            `Agent.resume(${agentId})`,
          );
          this.agents.set(chatId, agent);
          console.log(
            `[cursor] Возобновлён агент ${agent.agentId} для ${chatId} (попытка ${attempt})`,
          );
          return agent;
        } catch (err) {
          if (!isAgentNotFoundError(err)) throw err;
          if (attempt < RESUME_RETRY_ATTEMPTS) {
            await sleep(RETRY_BASE_DELAY_MS * attempt);
            continue;
          }
          console.warn(
            `[cursor] Агент ${agentId} недоступен после ${attempt} попыток resume, создаём новый`,
          );
        }
      }
    }

    return this.createAgent(chatId, mode);
  }

  /** Снимает зависшие run и создаёт нового агента, сохраняя контекст диалога. */
  private async replaceAgentSession(
    chatId: string,
    mode: CursorBotMode,
    runId?: string,
    run?: Run | null,
  ): Promise<SDKAgent> {
    const saved = this.state.getChatSession(chatId);
    const oldAgentId = saved?.agentId;

    let captured: string | undefined;
    if (oldAgentId) {
      captured = await captureAgentContext({
        chatId,
        agentId: oldAgentId,
        runtime: this.config.runtime,
        cwd: this.resolveCwd(chatId),
        apiKey: this.config.apiKey,
        runId,
        run,
      });
      await this.clearStuckRuns(chatId, oldAgentId, runId);
    }

    await this.disposeLiveAgent(chatId);

    const mergedContext = mergeAgentContext(saved?.conversationContext, captured);
    if (saved) {
      delete saved.agentId;
      if (mergedContext) {
        saved.conversationContext = mergedContext;
      } else {
        delete saved.conversationContext;
      }
      saved.updatedAt = new Date().toISOString();
      this.state.setChatSession(chatId, saved);
    } else if (mergedContext) {
      this.state.setChatSession(chatId, {
        mode,
        model: this.getModel(chatId),
        projectId: this.getProjectId(chatId),
        conversationContext: mergedContext,
        updatedAt: new Date().toISOString(),
      });
    }

    if (mergedContext) {
      console.log(
        `[cursor] Контекст сессии ${chatId} сохранён (${mergedContext.length} симв.), создаём нового агента`,
      );
    } else {
      console.log(`[cursor] Создаём нового агента для ${chatId} (контекст недоступен)`);
    }

    return this.createAgent(chatId, mode);
  }

  private getStoredAgentContext(chatId: string): string | undefined {
    return this.state.getChatSession(chatId)?.conversationContext?.trim() || undefined;
  }

  private clearStoredAgentContext(chatId: string): void {
    const session = this.state.getChatSession(chatId);
    if (!session?.conversationContext) return;
    delete session.conversationContext;
    this.state.setChatSession(chatId, session);
  }

  private async persistAgentContextFromSession(
    chatId: string,
    agentId: string,
    runId?: string,
  ): Promise<void> {
    const captured = await captureAgentContext({
      chatId,
      agentId,
      runtime: this.config.runtime,
      cwd: this.resolveCwd(chatId),
      apiKey: this.config.apiKey,
      runId,
    });
    if (!captured) return;

    const session = this.state.getChatSession(chatId);
    const merged = mergeAgentContext(session?.conversationContext, captured);
    if (!merged) return;

    if (session) {
      session.conversationContext = merged;
      session.updatedAt = new Date().toISOString();
      this.state.setChatSession(chatId, session);
    } else {
      this.state.setChatSession(chatId, {
        mode: "agent",
        model: this.getModel(chatId),
        projectId: this.getProjectId(chatId),
        conversationContext: merged,
        updatedAt: new Date().toISOString(),
      });
    }
    console.log(
      `[cursor] Контекст сессии ${chatId} сохранён (${merged.length} симв.) перед новой сессией`,
    );
  }

  private persistPendingRun(
    delivery: PendingDeliveryContext,
    runId: string,
    agentId: string,
  ): void {
    this.state.setPendingRun({
      sessionKey: delivery.sessionKey,
      chatId: delivery.chatId,
      sessionId: delivery.sessionId,
      runId,
      agentId,
      inboxId: delivery.inboxId,
      chatType: delivery.chatType,
      chatName: delivery.chatName,
      senderLogin: delivery.senderLogin,
      senderName: delivery.senderName,
      prompt: delivery.prompt,
      startedAt: new Date().toISOString(),
    });
  }

  private async collectRunReply(
    run: Run,
    agentId: string,
    onProgress?: AskOptions["onProgress"],
  ): Promise<AgentReply> {
    const chunks: string[] = [];
    let streamError: string | undefined;

    if (run.supports("stream")) {
      for await (const event of run.stream()) {
        streamError = extractStreamError(event) ?? streamError;
        this.handleStreamEvent(event, onProgress);
        if (event.type === "assistant") {
          for (const block of event.message.content) {
            if (block.type === "text" && block.text) chunks.push(block.text);
          }
        }
      }
    }

    const result = await run.wait();
    const streamed = chunks.join("").trim();
    const text = (result.result ?? streamed).trim() || "(пустой ответ)";
    const errorDetail =
      result.status === "error" ? pickErrorDetail(streamError, text) : undefined;

    if (result.status === "error") {
      console.error(
        `[cursor] run ${result.id} error:`,
        errorDetail ?? "(без описания)",
      );
    }

    return {
      text,
      agentId,
      runId: result.id,
      status: result.status,
      errorDetail,
    };
  }

  /** Быстрая проверка: run уже завершён — забрать готовый ответ без stream/wait. */
  async peekFinishedRun(record: PendingRunRecord): Promise<AgentReply | null> {
    if (!isAgentIdForRuntime(record.agentId, this.config.runtime)) {
      return null;
    }

    try {
      const run = await withSdkTimeout(
        Agent.getRun(record.runId, this.buildGetRunOptions(record.agentId, record.sessionKey)),
        `peekFinishedRun(${record.runId})`,
        PEEK_RUN_TIMEOUT_MS,
      );

      if (run.status !== "finished") return null;

      const text = (run.result ?? "").trim() || "(пустой ответ)";
      this.persistRecoveredSession(record);
      this.state.clearPendingRunIfMatch(record.sessionKey, record.runId);
      console.log(`[cursor] Run ${record.runId} уже завершён — доставляем готовый ответ`);
      return {
        text,
        agentId: record.agentId,
        runId: record.runId,
        status: "finished",
      };
    } catch (err) {
      console.warn(
        `[cursor] peekFinishedRun ${record.runId}:`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  /** Сохраняет контекст и снимает зависшие run перед автопродолжением. */
  async prepareContinuation(record: PendingRunRecord): Promise<void> {
    try {
      await this.persistAgentContextFromSession(
        record.sessionKey,
        record.agentId,
        record.runId,
      );
    } catch (err) {
      console.warn(
        `[cursor] prepareContinuation persist context:`,
        err instanceof Error ? err.message : err,
      );
    }

    try {
      await this.clearStuckRuns(record.sessionKey, record.agentId, record.runId);
    } catch (err) {
      console.warn(
        `[cursor] prepareContinuation clearStuckRuns:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /** Подключается к сохранённому run и дожидается результата (после перезапуска бота). */
  async recoverRun(
    record: PendingRunRecord,
    _onProgress?: AskOptions["onProgress"],
  ): Promise<AgentReply | null> {
    if (!isAgentIdForRuntime(record.agentId, this.config.runtime)) {
      console.warn(
        `[cursor] Пропуск восстановления run ${record.runId}: agent ${record.agentId} не для runtime=${this.config.runtime}`,
      );
      this.state.clearPendingRun(record.sessionKey);
      return null;
    }

    const clearPending = () => this.state.clearPendingRunIfMatch(record.sessionKey, record.runId);

    console.log(
      `[cursor] Восстановление run ${record.runId} для сессии ${record.sessionKey} (worker)`,
    );

    try {
      const worker = await spawnRecoverRun(
        {
          runId: record.runId,
          agentId: record.agentId,
          chatId: record.chatId,
          cwd: this.resolveCwd(record.sessionKey),
          runtime: this.config.runtime,
          repoUrl: this.config.repoUrl,
          repoRef: this.config.repoRef,
          timeoutMs: Math.max(30_000, this.config.recoverRunTimeoutMs - 5_000),
        },
        this.config.recoverRunTimeoutMs,
      );

      if (!worker.ok || !worker.reply) {
        console.warn(
          `[cursor] Worker не восстановил run ${record.runId}: ${worker.reason ?? "unknown"}`,
          worker.message ?? "",
        );
        // not_found — run уже не существует после перезапуска; не тратим время на SDK cleanup.
        if (worker.reason !== "not_found") {
          await this.persistAgentContextFromSession(
            record.sessionKey,
            record.agentId,
            record.runId,
          );
          await this.clearStuckRuns(record.sessionKey, record.agentId, record.runId);
        }
        clearPending();
        return null;
      }

      if (worker.reply.status === "error") {
        console.warn(
          `[cursor] Восстановленный run ${record.runId} завершился с error:`,
          worker.reply.errorDetail ?? "(без описания)",
        );
        await this.persistAgentContextFromSession(
          record.sessionKey,
          record.agentId,
          record.runId,
        );
        await this.clearStuckRuns(record.sessionKey, record.agentId, record.runId);
        clearPending();
        return null;
      }

      this.persistRecoveredSession(record);
      clearPending();
      return {
        text: worker.reply.text,
        agentId: worker.reply.agentId,
        runId: worker.reply.runId,
        status: worker.reply.status,
        errorDetail: worker.reply.errorDetail,
      };
    } catch (err) {
      console.error(
        `[cursor] Ошибка восстановления run ${record.runId}:`,
        err instanceof Error ? err.message : err,
      );
      try {
        await this.persistAgentContextFromSession(
          record.sessionKey,
          record.agentId,
          record.runId,
        );
        await this.clearStuckRuns(record.sessionKey, record.agentId, record.runId);
      } catch (persistErr) {
        console.warn(
          `[cursor] Не удалось сохранить контекст после сбоя восстановления:`,
          persistErr instanceof Error ? persistErr.message : persistErr,
        );
      }
      clearPending();
      return null;
    }
  }

  private persistRecoveredSession(record: PendingRunRecord): void {
    const session = this.state.getChatSession(record.sessionKey);
    if (!session) return;
    session.agentId = record.agentId;
    session.updatedAt = new Date().toISOString();
    this.state.setChatSession(record.sessionKey, session);
  }

  private buildAgentOptions(chatId: string, mode: CursorBotMode) {
    const modelKey = this.getModel(chatId);
    const modelSelection = this.models.resolveSelection(modelKey);
    const base = {
      apiKey: this.config.apiKey,
      model: modelSelection ?? { id: "default" },
      mode: toSdkMode(mode),
    } as const;

    if (this.config.runtime === "local") {
      return {
        ...base,
        local: { cwd: this.resolveCwd(chatId) },
      };
    }

    return {
      ...base,
      cloud: {
        repos: [{ url: this.config.repoUrl, startingRef: this.config.repoRef }],
        autoCreatePR: this.config.autoCreatePr,
      },
    };
  }

  /** Полностью удаляет сессию агента (после завершения в меню сессий). */
  async disposeSession(sessionKey: string): Promise<void> {
    this.bumpGeneration(sessionKey);
    await this.cancelChat(sessionKey);
    this.queues.delete(sessionKey);
    this.chatRuns.delete(sessionKey);
    this.state.clearPendingRun(sessionKey);
    await this.disposeLiveAgent(sessionKey);
    this.state.deleteChatSession(sessionKey);
  }

  /** Прерывает активный run и сбрасывает сессию без ожидания очереди ask(). */
  async resetSession(chatId: string): Promise<void> {
    const mode = this.getMode(chatId);
    const model = this.getModel(chatId);
    const projectId = this.getProjectId(chatId);
    this.bumpGeneration(chatId);
    await this.cancelChat(chatId);
    this.queues.set(chatId, Promise.resolve());
    this.state.clearPendingRun(chatId);

    await this.disposeLiveAgent(chatId);
    this.state.deleteChatSession(chatId);
    this.state.setChatSession(chatId, {
      mode,
      model,
      projectId,
      updatedAt: new Date().toISOString(),
    });

    const control = this.chatRuns.get(chatId);
    if (control) {
      control.run = null;
      control.abort = new AbortController();
    }
  }

  async setMode(chatId: string, mode: CursorBotMode): Promise<void> {
    this.bumpGeneration(chatId);
    await this.cancelChat(chatId);
    this.queues.set(chatId, Promise.resolve());

    const session = this.state.getChatSession(chatId);
    if (session) {
      session.mode = mode;
      session.updatedAt = new Date().toISOString();
      this.state.setChatSession(chatId, session);
    } else {
      this.state.setChatSession(chatId, {
        mode,
        model: this.getModel(chatId),
        projectId: this.getProjectId(chatId),
        updatedAt: new Date().toISOString(),
      });
    }
    await this.disposeLiveAgent(chatId);

    const control = this.chatRuns.get(chatId);
    if (control) {
      control.run = null;
      control.abort = new AbortController();
    }
  }

  async setModel(chatId: string, modelKey: string): Promise<void> {
    const normalized = this.models.normalizeKey(modelKey);
    if (!normalized) {
      throw new Error(`Неизвестная модель: ${modelKey}`);
    }

    this.bumpGeneration(chatId);
    await this.cancelChat(chatId);
    this.queues.set(chatId, Promise.resolve());

    const session = this.state.getChatSession(chatId);
    if (session) {
      session.model = normalized;
      session.updatedAt = new Date().toISOString();
      this.state.setChatSession(chatId, session);
    } else {
      this.state.setChatSession(chatId, {
        mode: "agent",
        model: normalized,
        projectId: this.getProjectId(chatId),
        updatedAt: new Date().toISOString(),
      });
    }
    await this.disposeLiveAgent(chatId);

    const control = this.chatRuns.get(chatId);
    if (control) {
      control.run = null;
      control.abort = new AbortController();
    }
  }

  async setProject(chatId: string, projectKey: string): Promise<string> {
    const normalized = this.projects.normalizeKey(projectKey);
    if (!normalized) {
      throw new Error(`Неизвестный проект: ${projectKey}`);
    }

    if (normalized === this.getProjectId(chatId)) {
      return normalized;
    }

    this.bumpGeneration(chatId);
    await this.cancelChat(chatId);
    this.queues.set(chatId, Promise.resolve());
    this.state.clearPendingRun(chatId);

    const session = this.state.getChatSession(chatId);
    if (session) {
      session.projectId = normalized;
      session.updatedAt = new Date().toISOString();
      this.state.setChatSession(chatId, session);
    } else {
      this.state.setChatSession(chatId, {
        mode: "agent",
        model: this.getModel(chatId),
        projectId: normalized,
        updatedAt: new Date().toISOString(),
      });
    }

    await this.disposeLiveAgent(chatId);

    const control = this.chatRuns.get(chatId);
    if (control) {
      control.run = null;
      control.abort = new AbortController();
    }

    console.log(
      `[cursor] Проект чата ${chatId}: ${this.projects.formatLabel(normalized)} (${this.projects.resolvePath(normalized)})`,
    );
    return normalized;
  }

  getProjectId(chatId: string): string {
    const saved = this.state.getChatSession(chatId)?.projectId;
    if (saved) {
      const normalized = this.projects.normalizeKey(saved);
      if (normalized) return normalized;
    }
    return this.projects.defaultKey;
  }

  getProjectPath(chatId: string): string {
    return this.resolveCwd(chatId);
  }

  getMode(chatId: string): CursorBotMode {
    return normalizeMode(this.state.getChatSession(chatId)?.mode);
  }

  getModel(chatId: string): string {
    const saved = this.state.getChatSession(chatId)?.model;
    if (saved) {
      return this.models.normalizeKey(saved) ?? this.models.defaultKey;
    }
    return this.models.normalizeKey(this.config.defaultModel) ?? this.models.defaultKey;
  }

  getAgentId(chatId: string): string | undefined {
    return this.state.getChatSession(chatId)?.agentId;
  }

  private async disposeLiveAgent(chatId: string): Promise<void> {
    const live = this.agents.get(chatId);
    if (!live) return;
    try {
      await live[Symbol.asyncDispose]();
    } catch {
      /* ignore */
    }
    this.agents.delete(chatId);
  }

  private async createAgent(chatId: string, mode: CursorBotMode): Promise<SDKAgent> {
    const saved = this.state.getChatSession(chatId);
    const agent = await withSdkTimeout(
      Agent.create(this.buildAgentOptions(chatId, saved?.mode ?? mode)),
      "Agent.create",
    );
    this.agents.set(chatId, agent);
    this.state.setChatSession(chatId, {
      agentId: agent.agentId,
      mode: saved?.mode ?? mode,
      model: saved?.model ?? this.getModel(chatId),
      projectId: saved?.projectId || this.getProjectId(chatId),
      conversationContext: saved?.conversationContext,
      updatedAt: new Date().toISOString(),
    });
    console.log(`[cursor] Новый агент для чата ${chatId}: ${agent.agentId}`);
    return agent;
  }

  private async getOrCreateAgent(chatId: string, mode: CursorBotMode): Promise<SDKAgent> {
    const cached = this.agents.get(chatId);
    if (cached) return cached;

    const pending = this.state.getPendingRun(chatId);
    if (pending?.agentId) {
      await this.clearStuckRuns(chatId, pending.agentId, pending.runId);
    }

    const saved = this.state.getChatSession(chatId);
    const canResume =
      saved?.agentId && isAgentIdForRuntime(saved.agentId, this.config.runtime);

    if (canResume && saved?.agentId) {
      for (let attempt = 1; attempt <= RESUME_RETRY_ATTEMPTS; attempt++) {
        try {
          const agent = await withSdkTimeout(
            Agent.resume(saved.agentId, {
              ...this.buildAgentOptions(chatId, saved.mode || mode),
            }),
            `Agent.resume(${saved.agentId})`,
          );
          this.agents.set(chatId, agent);
          console.log(`[cursor] Возобновлён агент ${agent.agentId} для чата ${chatId}`);
          return agent;
        } catch (err) {
          if (!isAgentNotFoundError(err)) throw err;
          if (attempt < RESUME_RETRY_ATTEMPTS) {
            await sleep(RETRY_BASE_DELAY_MS * attempt);
            continue;
          }
          console.warn(
            `[cursor] Агент ${saved.agentId} не найден (runtime=${this.config.runtime}), создаём новый`,
          );
        }
      }
    } else if (saved?.agentId) {
      console.warn(
        `[cursor] Сохранённый ${saved.agentId} не подходит для runtime=${this.config.runtime}, создаём новый`,
      );
      this.state.deleteChatSession(chatId);
    }

    return this.createAgent(chatId, mode);
  }

  private emitProgress(onProgress: AskOptions["onProgress"], event: AgentProgressEvent): void {
    if (!onProgress) return;
    try {
      onProgress(event);
    } catch (err) {
      console.warn("[cursor] onProgress failed:", err instanceof Error ? err.message : err);
    }
  }

  private handleStreamEvent(event: SDKMessage, onProgress?: AskOptions["onProgress"]): void {
    switch (event.type) {
      case "thinking": {
        const text = event.text;
        if (text.trim()) {
          this.emitProgress(onProgress, { kind: "thinking", text: summarizeThinking(text) });
        }
        break;
      }
      case "tool_call":
        this.emitProgress(onProgress, {
          kind: "tool",
          text: formatToolProgress(event),
        });
        break;
      case "status": {
        const message = event.message ?? event.status;
        if (message) this.emitProgress(onProgress, { kind: "status", text: message });
        break;
      }
      case "task": {
        const text = event.text || event.status || "Задача…";
        this.emitProgress(onProgress, { kind: "task", text });
        break;
      }
      default:
        break;
    }
  }

  private cancelledReply(
    agent: SDKAgent,
    runId: string,
    generation: number,
    chatId: string,
  ): AgentReply {
    const superseded = (this.chatRuns.get(chatId)?.generation ?? 0) !== generation;
    if (!superseded) {
      this.state.clearPendingRunIfMatch(chatId, runId);
    }
    return {
      text: "",
      agentId: agent.agentId,
      runId,
      status: "cancelled",
      superseded,
    };
  }

  private async runPrompt(
    agent: SDKAgent,
    chatId: string,
    fullPrompt: string,
    mode: CursorBotMode,
    onProgress: AskOptions["onProgress"] | undefined,
    generation: number,
    abortSignal: AbortSignal,
    delivery?: PendingDeliveryContext,
  ): Promise<AgentReply> {
    this.emitProgress(onProgress, { kind: "status", text: "Запускаю агента…" });

    const sendRun = async (activeAgent: SDKAgent) => {
      try {
        return await activeAgent.send(fullPrompt, { mode: toSdkMode(mode) });
      } catch (err) {
        if (!isActiveRunConflictError(err)) throw err;
        console.warn(`[cursor] active run conflict for ${chatId}, создаём новую сессию`);
        const refreshed = await this.replaceAgentSession(chatId, mode, undefined, null);
        return refreshed.send(fullPrompt, { mode: toSdkMode(mode) });
      }
    };

    const run = await sendRun(agent);
    if (delivery) {
      delivery.prompt = fullPrompt;
      this.persistPendingRun(delivery, run.id, agent.agentId);
    }

    const control = this.getOrCreateRunControl(chatId);
    control.run = run;

    try {
      const chunks: string[] = [];
      let streamError: string | undefined;

      for await (const event of run.stream()) {
        if (abortSignal.aborted || (this.chatRuns.get(chatId)?.generation ?? 0) !== generation) {
          if (run.supports("cancel")) {
            await run.cancel().catch(() => undefined);
          }
          return this.cancelledReply(agent, run.id, generation, chatId);
        }

        streamError = extractStreamError(event) ?? streamError;
        this.handleStreamEvent(event, onProgress);

        if (event.type === "assistant") {
          for (const block of event.message.content) {
            if (block.type === "text" && block.text) chunks.push(block.text);
          }
        }
      }

      if (abortSignal.aborted || (this.chatRuns.get(chatId)?.generation ?? 0) !== generation) {
        return this.cancelledReply(agent, run.id, generation, chatId);
      }

      let result;
      try {
        result = await withSdkTimeout(
          run.wait(),
          `run.wait(${run.id})`,
          RUN_WAIT_TIMEOUT_MS,
        );
      } catch (waitErr) {
        if (run.supports("cancel")) {
          await run.cancel().catch(() => undefined);
        }
        throw waitErr;
      }
      const streamed = chunks.join("").trim();
      const text = (result.result ?? streamed).trim() || "(пустой ответ)";

      if (result.status === "cancelled") {
        return this.cancelledReply(agent, result.id, generation, chatId);
      }

      const session = this.state.getChatSession(chatId);
      if (session) {
        session.agentId = agent.agentId;
        session.updatedAt = new Date().toISOString();
        this.state.setChatSession(chatId, session);
      }

      this.state.clearPendingRunIfMatch(chatId, result.id);

      if (result.status !== "error") {
        this.clearStoredAgentContext(chatId);
      }

      const errorDetail =
        result.status === "error" ? pickErrorDetail(streamError, text) : undefined;

      if (result.status === "error") {
        console.error(
          `[cursor] run ${result.id} error:`,
          errorDetail ?? "(без описания)",
        );
      }

      return {
        text,
        agentId: agent.agentId,
        runId: result.id,
        status: result.status,
        errorDetail,
      };
    } finally {
      if (control.run === run) {
        control.run = null;
      }
    }
  }

  async ask(chatId: string, prompt: string, context?: AskOptions): Promise<AgentReply> {
    try {
      return await this.enqueue(chatId, async (epoch) => {
        const control = this.getOrCreateRunControl(chatId);
        control.abort = new AbortController();
        const abortSignal = control.abort.signal;

        const mode = this.getMode(chatId);

        const prefix: string[] = [];
        if (context?.chatType && context.chatType !== "direct") {
          const label = context.chatName || context.chatType;
          prefix.push(`[Чат: ${label}]`);
        }
        if (context?.senderName) {
          prefix.push(`[От: ${context.senderName}]`);
        }
        const fullPrompt = context?.promptIsComplete
          ? prompt
          : prefix.length
            ? `${prefix.join(" ")}\n\n${prompt}`
            : prompt;

        const delivery = context?.delivery
          ? { ...context.delivery, prompt: fullPrompt }
          : undefined;

        let lastReply: AgentReply | null = null;

        for (let attempt = 1; attempt <= MAX_ASK_ATTEMPTS; attempt++) {
          if ((this.chatRuns.get(chatId)?.generation ?? 0) !== epoch) {
            throw new SessionSupersededError();
          }

          const needsFreshAgent = Boolean(context?.forceNewAgent) || attempt > 1;

          if (needsFreshAgent) {
            await this.replaceAgentSession(chatId, mode, lastReply?.runId, null);
          }

          const promptToSend = needsFreshAgent
            ? buildPromptWithAgentContext(fullPrompt, this.getStoredAgentContext(chatId))
            : fullPrompt;

          let agent = await this.getOrCreateAgent(chatId, mode);

          try {
            lastReply = await this.runPrompt(
              agent,
              chatId,
              promptToSend,
              mode,
              context?.onProgress,
              epoch,
              abortSignal,
              delivery,
            );
          } catch (err) {
            if (isActiveRunConflictError(err)) {
              console.warn(
                `[cursor] active run conflict при ask для ${chatId}, создаём новую сессию`,
              );
              agent = await this.replaceAgentSession(chatId, mode, lastReply?.runId, null);
              lastReply = await this.runPrompt(
                agent,
                chatId,
                buildPromptWithAgentContext(fullPrompt, this.getStoredAgentContext(chatId)),
                mode,
                context?.onProgress,
                epoch,
                abortSignal,
                delivery,
              );
            } else if (isAgentNotFoundError(err)) {
              console.warn(
                `[cursor] agent_not_found при send, создаём новую сессию ${chatId}`,
              );
              agent = await this.replaceAgentSession(chatId, mode, lastReply?.runId, null);
              lastReply = await this.runPrompt(
                agent,
                chatId,
                buildPromptWithAgentContext(fullPrompt, this.getStoredAgentContext(chatId)),
                mode,
                context?.onProgress,
                epoch,
                abortSignal,
                delivery,
              );
            } else {
              throw err;
            }
          }

          if (!lastReply) continue;

          if (lastReply.superseded || lastReply.status === "cancelled") {
            return lastReply;
          }

          if (lastReply.status !== "error") {
            return lastReply;
          }

          console.warn(
            `[cursor] run error attempt ${attempt}/${MAX_ASK_ATTEMPTS} for ${chatId}:`,
            lastReply.errorDetail ?? lastReply.runId,
          );

          if (attempt >= MAX_ASK_ATTEMPTS) {
            return lastReply;
          }

          this.emitProgress(context?.onProgress, {
            kind: "status",
            text: "Создаю новую сессию и повторяю запрос…",
          });
          await sleep(RETRY_BASE_DELAY_MS * attempt);
        }

        return (
          lastReply ?? {
            text: "",
            agentId: this.getAgentId(chatId) ?? "",
            runId: "",
            status: "error",
          }
        );
      });
    } catch (err) {
      if (err instanceof SessionSupersededError) {
        return {
          text: "",
          agentId: "",
          runId: "",
          status: "cancelled",
          superseded: true,
        };
      }
      throw err;
    }
  }
}
