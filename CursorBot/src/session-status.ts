import { formatModeLabel, type CursorBotMode } from "./cursor-mode.js";
import type { ModelCatalog } from "./model-catalog.js";
import type { ProjectCatalog } from "./project-catalog.js";
import type { PendingRunRecord } from "./state-store.js";
import type { BotApiActivityDto } from "./supra-bot-api.js";

export type ChatWorkPhase = "idle" | "executing" | "recovering" | "setup";

export interface ChatWorkSnapshot {
  phase: ChatWorkPhase;
  detail: string;
  startedAt?: string;
  lastProgressAt?: string;
  runId?: string;
}

export function formatSessionResetMessage(
  mode: CursorBotMode,
  modelKey: string,
  catalog: ModelCatalog,
): string {
  return [
    "Сессия Cursor сброшена. Контекст начинается заново.",
    `Режим: ${formatModeLabel(mode)}.`,
    `Модель: ${catalog.formatLabel(modelKey)}.`,
  ].join("\n");
}

function formatDuration(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec} сек`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem ? `${min} мин ${rem} сек` : `${min} мин`;
}

function formatIsoAge(iso: string | undefined, now = Date.now()): string | undefined {
  if (!iso) return undefined;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return undefined;
  return formatDuration(now - ts);
}

function describeWorkPhase(snapshot: ChatWorkSnapshot | undefined, pending?: PendingRunRecord): string {
  if (snapshot?.phase === "setup") {
    return "Ожидаю выбор режима и модели (/new).";
  }
  if (snapshot?.phase === "recovering") {
    const age = formatIsoAge(snapshot.startedAt);
    const detail = snapshot.detail.trim() || "Продолжаю запрос после перезапуска";
    return age ? `${detail} (${age}).` : `${detail} после перезапуска.`;
  }
  if (snapshot?.phase === "executing") {
    const detail = snapshot.detail.trim() || "Выполняю запрос…";
    const age = formatIsoAge(snapshot.startedAt);
    const staleMs =
      snapshot.lastProgressAt != null
        ? Date.now() - Date.parse(snapshot.lastProgressAt)
        : snapshot.startedAt != null
          ? Date.now() - Date.parse(snapshot.startedAt)
          : 0;
    const lines = [detail];
    if (age) lines.push(`Работаю уже ${age}.`);
    if (staleMs > 3 * 60_000) {
      lines.push("⚠ Долго нет обновлений — возможно зависло. Попробуйте /new или повторите запрос.");
    }
    if (snapshot.runId) lines.push(`Run ID: ${snapshot.runId}`);
    return lines.join("\n");
  }
  if (pending) {
    const age = formatIsoAge(pending.startedAt);
    return age
      ? `Есть незавершённый run (${age}), ожидает восстановления.`
      : "Есть незавершённый run, ожидает восстановления.";
  }
  return "Свободен — жду вашего сообщения.";
}

function describeServerActivity(activities: BotApiActivityDto[] | undefined): string | undefined {
  if (!activities?.length) return undefined;
  const typing = activities.find((a) => a.active && a.activityType === "typing");
  if (!typing) return undefined;
  const msg = (typing.activityMessage || "").trim();
  const lines = [msg || "Печатает…"];
  if (typing.expiresAt) {
    const expires = Date.parse(typing.expiresAt);
    if (!Number.isNaN(expires)) {
      const leftMs = expires - Date.now();
      if (leftMs > 0) {
        lines.push(`Статус на сервере обновится через ${formatDuration(leftMs)}.`);
      } else {
        lines.push("Статус на сервере устарел — клиент мог его не получить.");
      }
    }
  }
  return lines.join("\n");
}

export function formatStatusMessage(
  update: { chatId: string; chatType: string },
  mode: CursorBotMode,
  modelKey: string,
  catalog: ModelCatalog,
  agentId: string | undefined,
  runtime: string,
  projectId: string,
  projects: ProjectCatalog,
  projectPath: string,
  work: ChatWorkSnapshot | undefined,
  pending: PendingRunRecord | undefined,
  serverActivities: BotApiActivityDto[] | undefined,
): string {
  const workLine = describeWorkPhase(work, pending);
  const serverLine = describeServerActivity(serverActivities);

  const lines = [
    `Чат: ${update.chatId}`,
    `Тип: ${update.chatType}`,
    `Проект: ${projects.formatLabel(projectId)}`,
    `Папка: ${projectPath}`,
    `Режим: ${formatModeLabel(mode)}`,
    `Модель: ${catalog.formatLabel(modelKey)}`,
    `Cursor runtime: ${runtime}`,
    `Agent ID: ${agentId ?? "(ещё не создан)"}`,
    "",
    `Состояние: ${workLine}`,
  ];

  if (serverLine) {
    lines.push("", `На сервере: ${serverLine}`);
  }

  return lines.join("\n");
}
