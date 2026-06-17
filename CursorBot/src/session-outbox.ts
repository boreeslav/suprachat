import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface OutboxEntry {
  text: string;
  ts: string;
}

export class SessionOutbox {
  constructor(private readonly rootDir: string) {}

  private filePath(chatId: string, sessionId: string): string {
    return join(this.rootDir, chatId, `${sessionId}.jsonl`);
  }

  async append(chatId: string, sessionId: string, text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    const path = this.filePath(chatId, sessionId);
    await mkdir(dirname(path), { recursive: true });
    const entry: OutboxEntry = { text: trimmed, ts: new Date().toISOString() };
    await appendFile(path, JSON.stringify(entry) + "\n", "utf8");
  }

  async readAll(chatId: string, sessionId: string): Promise<OutboxEntry[]> {
    const path = this.filePath(chatId, sessionId);
    try {
      const raw = await readFile(path, "utf8");
      const entries: OutboxEntry[] = [];
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as OutboxEntry;
          if (parsed.text?.trim()) entries.push(parsed);
        } catch {
          /* skip bad line */
        }
      }
      return entries;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return [];
      throw err;
    }
  }

  async clear(chatId: string, sessionId: string): Promise<void> {
    const path = this.filePath(chatId, sessionId);
    try {
      await writeFile(path, "", "utf8");
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return;
      throw err;
    }
  }

  /** @deprecated Prefer readAll + rewrite after confirmed delivery. */
  async drain(chatId: string, sessionId: string): Promise<OutboxEntry[]> {
    return this.readAll(chatId, sessionId);
  }

  async rewrite(chatId: string, sessionId: string, entries: OutboxEntry[]): Promise<void> {
    const path = this.filePath(chatId, sessionId);
    if (!entries.length) {
      await this.clear(chatId, sessionId);
      return;
    }
    await mkdir(dirname(path), { recursive: true });
    const body = entries.map((entry) => JSON.stringify(entry) + "\n").join("");
    await writeFile(path, body, "utf8");
  }
}
