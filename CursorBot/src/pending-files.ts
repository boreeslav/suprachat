import type { IngestedFile } from "./media-inbox.js";

export class PendingFilesStore {
  private readonly pending = new Map<string, IngestedFile[]>();

  add(chatId: string, files: IngestedFile[]): void {
    if (!files.length) return;
    const prev = this.pending.get(chatId) ?? [];
    this.pending.set(chatId, [...prev, ...files]);
  }

  has(chatId: string): boolean {
    return (this.pending.get(chatId)?.length ?? 0) > 0;
  }

  list(chatId: string): IngestedFile[] {
    return [...(this.pending.get(chatId) ?? [])];
  }

  take(chatId: string): IngestedFile[] {
    const files = this.pending.get(chatId) ?? [];
    this.pending.delete(chatId);
    return files;
  }

  clear(chatId: string): void {
    this.pending.delete(chatId);
  }

  formatUserNotice(files: IngestedFile[]): string {
    const lines = files.map((f) => {
      const sizeKb = Math.max(1, Math.round(f.fileSize / 1024));
      return `• ${f.fileName} (${sizeKb} KB)\n  \`${f.localPath}\``;
    });
    return [
      "📎 Получил файл(ы):",
      ...lines,
      "",
      "Напишите, что с ними сделать — передам задачу агенту с локальными путями.",
    ].join("\n");
  }

  buildAgentPrompt(files: IngestedFile[], instruction: string): string {
    const fileLines = files.map(
      (f) =>
        `- ${f.localPath} (${f.fileName}, ${f.mimeType || "application/octet-stream"}, ${f.fileSize} bytes)`,
    );
    return [
      "Пользователь ранее отправил файлы в чат:",
      ...fileLines,
      "",
      `Инструкция пользователя: ${instruction.trim()}`,
      "",
      "Обработай файлы по указанным локальным путям (Read и другие инструменты Cursor).",
    ].join("\n");
  }
}
