import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { BotApiMessage, SupraBotApi } from "./supra-bot-api.js";

export const THOUGHTS_MARKER = "⟦мысли⟧";

export interface AgentProgressEvent {
  kind: "thinking" | "tool" | "status" | "task";
  text: string;
}

export interface ThoughtStatusOptions {
  minIntervalMs: number;
  maxChars: number;
}

export interface ThoughtFinalizeResult {
  converted: boolean;
  messageId?: string;
}

type ReplyTarget = { userLogin?: string; chatId?: string };

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /502|503|504|429|timeout|timed out|fetch failed/i.test(msg);
}

function normalizeFragment(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function rotateBuffer(buffer: string, maxBody: number): string {
  if (buffer.length <= maxBody) return buffer;
  let trimmed = buffer.slice(-maxBody);
  const cut = trimmed.indexOf(" ");
  if (cut > 0 && cut < 24) trimmed = trimmed.slice(cut + 1);
  return trimmed;
}

function formatThoughtMessage(buffer: string, maxChars: number): string {
  const header = `${THOUGHTS_MARKER}\n`;
  const maxBody = Math.max(40, maxChars - header.length);
  const body = rotateBuffer(buffer.trim(), maxBody);
  return header + body;
}

function isThoughtText(text: string): boolean {
  return text.includes(THOUGHTS_MARKER);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Буфер мыслей для фоновой сессии (без отправки в чат). */
export class ThoughtBuffer {
  private buffer = "";

  constructor(
    private readonly filePath: string,
    private readonly maxChars: number,
  ) {}

  push(event: AgentProgressEvent): void {
    if (event.kind !== "thinking" && event.kind !== "status") return;
    const fragment = normalizeFragment(event.text);
    if (!fragment) return;
    this.buffer = this.buffer ? `${this.buffer} ${fragment}` : fragment;
    const maxBody = Math.max(40, this.maxChars - `${THOUGHTS_MARKER}\n`.length);
    this.buffer = rotateBuffer(this.buffer, maxBody);
    void this.persist();
  }

  getFormattedText(): string | null {
    if (!this.buffer.trim()) return null;
    return formatThoughtMessage(this.buffer, this.maxChars);
  }

  clear(): void {
    this.buffer = "";
    void writeFile(this.filePath, "", "utf8").catch(() => undefined);
  }

  private async persist(): Promise<void> {
    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, this.buffer, "utf8");
    } catch {
      /* ignore */
    }
  }

  static async load(filePath: string, maxChars: number): Promise<ThoughtBuffer> {
    const buf = new ThoughtBuffer(filePath, maxChars);
    try {
      const { readFile } = await import("node:fs/promises");
      const raw = await readFile(filePath, "utf8");
      buf.buffer = raw.trim();
    } catch {
      /* empty */
    }
    return buf;
  }
}

export class ThoughtStatusPublisher {
  private messageId: string | undefined;
  private buffer = "";
  private lastPublishedAt = 0;
  private lastPublishedText = "";
  private latestPending: string | null = null;
  private workerRunning = false;
  private disposed = false;
  /** id сообщений, созданных/обновлённых именно как «мысли» — удаляем только их. */
  private readonly thoughtMessageIds = new Set<string>();
  private workerIdle: Promise<void> = Promise.resolve();
  private workerIdleResolve: (() => void) | null = null;

  constructor(
    private readonly update: BotApiMessage,
    private readonly api: SupraBotApi,
    private readonly options: ThoughtStatusOptions,
    private readonly replyTarget: ReplyTarget,
    initialText?: string,
  ) {
    if (initialText?.trim()) {
      this.buffer = initialText.replace(new RegExp(`^${THOUGHTS_MARKER}\\n?`), "").trim();
      this.latestPending = formatThoughtMessage(this.buffer, this.options.maxChars);
      this.scheduleWorker();
    }
  }

  push(event: AgentProgressEvent): void {
    if (this.disposed || (event.kind !== "thinking" && event.kind !== "status")) return;

    const fragment = normalizeFragment(event.text);
    if (!fragment) return;

    this.buffer = this.buffer ? `${this.buffer} ${fragment}` : fragment;

    const maxBody = Math.max(40, this.options.maxChars - `${THOUGHTS_MARKER}\n`.length);
    this.buffer = rotateBuffer(this.buffer, maxBody);

    const text = formatThoughtMessage(this.buffer, this.options.maxChars);
    if (!text || text === this.lastPublishedText) return;

    this.latestPending = text;
    this.scheduleWorker();
  }

  private markWorkerBusy(): void {
    if (this.workerRunning) return;
    this.workerRunning = true;
    this.workerIdle = new Promise<void>((resolve) => {
      this.workerIdleResolve = resolve;
    });
  }

  private markWorkerIdle(): void {
    if (!this.workerRunning) return;
    this.workerRunning = false;
    this.workerIdleResolve?.();
    this.workerIdleResolve = null;
  }

  private scheduleWorker(): void {
    if (this.disposed || this.workerRunning) return;
    this.markWorkerBusy();
    void this.runWorker();
  }

  /** Ждёт завершения фонового worker и всех in-flight publish. */
  async drain(): Promise<void> {
    await this.workerIdle;
    for (let i = 0; i < 50 && this.workerRunning; i++) {
      await sleep(20);
    }
  }

  private async runWorker(): Promise<void> {
    try {
      while (!this.disposed && this.latestPending) {
        const elapsed = Date.now() - this.lastPublishedAt;
        const waitMs = Math.max(0, this.options.minIntervalMs - elapsed);
        if (waitMs > 0) {
          await sleep(waitMs);
          if (this.disposed) return;
        }

        const text = this.latestPending;
        this.latestPending = null;
        if (!text || text === this.lastPublishedText) continue;

        try {
          await this.publish(text);
        } catch (err) {
          if (isRetryableError(err)) {
            console.warn(
              "[thought-status] update dropped (transient):",
              err instanceof Error ? err.message : err,
            );
          } else {
            console.warn("[thought-status] update dropped:", err instanceof Error ? err.message : err);
          }
        }
      }
    } finally {
      this.markWorkerIdle();
      if (this.latestPending && !this.disposed) this.scheduleWorker();
    }
  }

  private trackThoughtMessage(messageId: string): void {
    this.thoughtMessageIds.add(messageId);
  }

  private async publish(text: string): Promise<void> {
    if (!isThoughtText(text)) {
      console.warn("[thought-status] skip publish — not a thought payload");
      return;
    }

    if (!this.messageId) {
      const result = await this.api.sendMessage({ ...this.replyTarget, text });
      if (result.success && result.messageId) {
        this.trackThoughtMessage(result.messageId);
        if (this.disposed) {
          this.deleteThoughtMessage(result.messageId, "disposed-during-create");
          return;
        }
        this.messageId = result.messageId;
        this.lastPublishedText = text;
        this.lastPublishedAt = Date.now();
      }
      return;
    }

    if (text === this.lastPublishedText) return;

    await this.api.editMessage({
      chatId: this.update.chatId,
      messageId: this.messageId,
      text,
    });
    this.trackThoughtMessage(this.messageId);
    this.lastPublishedText = text;
    this.lastPublishedAt = Date.now();
  }

  /**
   * Завершает публикацию мыслей: ждёт worker, превращает пузырь мыслей в финальный ответ
   * (edit без маркера) вместо delete+send — устраняет гонку, когда delete сносил финальный текст.
   */
  async finalize(finalText: string): Promise<ThoughtFinalizeResult> {
    if (this.disposed) return { converted: false };

    this.disposed = true;
    this.latestPending = null;
    await this.drain();

    const messageId = this.messageId;
    this.messageId = undefined;
    this.buffer = "";

    const trimmed = finalText.trim();
    if (!messageId) {
      console.log("[thought-status] finalize: no thought bubble, will send new message");
      return { converted: false };
    }
    if (!trimmed) {
      this.deleteThoughtMessage(messageId, "finalize-empty");
      return { converted: false };
    }

    try {
      const result = await this.api.editMessage({
        chatId: this.update.chatId,
        messageId,
        text: trimmed,
      });
      if (!result.success) {
        console.warn("[thought-status] finalize edit failed:", result.error ?? "unknown");
        this.deleteThoughtMessage(messageId, "finalize-edit-failed");
        return { converted: false };
      }
      this.thoughtMessageIds.delete(messageId);
      console.log(
        `[thought-status] finalized thought ${messageId} as answer (${trimmed.length} chars, chat ${this.update.chatId})`,
      );
      return { converted: true, messageId };
    } catch (err) {
      console.warn("[thought-status] finalize edit error:", err instanceof Error ? err.message : err);
      this.deleteThoughtMessage(messageId, "finalize-edit-error");
      return { converted: false };
    }
  }

  /** Неблокирующая очистка при прерывании (stop / switch session). */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.latestPending = null;
    this.buffer = "";

    const messageId = this.messageId;
    this.messageId = undefined;
    if (messageId) this.deleteThoughtMessage(messageId, "dispose");
  }

  private deleteThoughtMessage(messageId: string, reason: string): void {
    if (!this.thoughtMessageIds.has(messageId)) {
      console.warn(
        `[thought-status] skip delete ${messageId} (${reason}) — not tracked as thought message`,
      );
      return;
    }
    this.thoughtMessageIds.delete(messageId);
    console.log(`[thought-status] delete thought message ${messageId} (${reason})`);
    void this.api
      .deleteMessage({
        chatId: this.update.chatId,
        messageId,
        deleteForEveryone: true,
      })
      .catch((err) => {
        console.warn("[thought-status] delete failed:", err instanceof Error ? err.message : err);
      });
  }
}
