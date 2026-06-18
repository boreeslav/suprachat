import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { SupraBotApi } from "./supra-bot-api.js";

/** Цель ответа для подтверждения после перезапуска бота. */
export interface RestartNotice {
  chatId?: string;
  userLogin?: string;
  requestedAt: string;
}

function noticePath(stateFile: string): string {
  return join(dirname(stateFile), "restart-notice.json");
}

/** Сохраняет, в какой чат отправить подтверждение после рестарта (читает уже новый процесс). */
export function writeRestartNotice(stateFile: string, notice: RestartNotice): void {
  const path = noticePath(stateFile);
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(notice), "utf8");
  } catch (err) {
    console.warn("[restart] writeRestartNotice failed:", err instanceof Error ? err.message : err);
  }
}

function readAndClear(stateFile: string): RestartNotice | null {
  const path = noticePath(stateFile);
  if (!existsSync(path)) return null;
  let notice: RestartNotice | null = null;
  try {
    notice = JSON.parse(readFileSync(path, "utf8")) as RestartNotice;
  } catch {
    notice = null;
  }
  try {
    rmSync(path, { force: true });
  } catch {
    /* ignore */
  }
  return notice;
}

/** После старта отправляет «перезапущен» в чат, запросивший рестарт (если был запрос). */
export async function deliverRestartNotice(
  api: SupraBotApi,
  stateFile: string,
  text = "✅ CursorBot перезапущен и готов к работе.",
): Promise<void> {
  const notice = readAndClear(stateFile);
  if (!notice) return;
  const target = notice.userLogin
    ? { userLogin: notice.userLogin }
    : notice.chatId
      ? { chatId: notice.chatId }
      : null;
  if (!target) return;

  try {
    const resp = await api.sendMessage({ ...target, text });
    if (!resp.success) {
      console.warn("[restart] restart notice sendMessage failed:", resp.error);
    }
  } catch (err) {
    console.warn("[restart] restart notice error:", err instanceof Error ? err.message : err);
  }
}
