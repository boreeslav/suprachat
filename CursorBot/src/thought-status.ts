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

  private scheduleWorker(): void {
    if (this.disposed || this.workerRunning) return;
    this.workerRunning = true;
    void this.runWorker();
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
      this.workerRunning = false;
      if (this.latestPending && !this.disposed) this.scheduleWorker();
    }
  }

  private async publish(text: string): Promise<void> {
    if (!this.messageId) {
      const result = await this.api.sendMessage({ ...this.replyTarget, text });
      if (result.success && result.messageId) {
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
    this.lastPublishedText = text;
    this.lastPublishedAt = Date.now();
  }

  /** Неблокирующая очистка: основной поток не ждёт сеть. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.latestPending = null;
    this.buffer = "";

    const messageId = this.messageId;
    this.messageId = undefined;
    if (!messageId) return;

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
