import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mergeAssistantConfig,
  type AssistantConfig,
  type AssistantConfigFile,
} from "./assistant-config.js";

export interface BotProjectConfig {
  id: string;
  name: string;
  path: string;
}

export interface BotSettingsFile {
  /** Логин единственного пользователя (без @). Пусто — доступ для всех. */
  allowedUser?: string | null;
  defaultProjectId?: string;
  projects: BotProjectConfig[];
  /** Меню и действия режима помощника. */
  assistant?: AssistantConfigFile;
}

export interface BotSettings {
  allowedUser: string | null;
  defaultProjectId: string;
  projects: BotProjectConfig[];
  assistant: AssistantConfig;
}

export function normalizeUserLogin(login: string): string {
  return login.trim().replace(/^@+/, "").toLowerCase();
}

export function loadBotSettings(filePath: string): BotSettings {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    throw new Error(`Файл настроек бота не найден: ${absPath}`);
  }

  let parsed: BotSettingsFile;
  try {
    parsed = JSON.parse(readFileSync(absPath, "utf8")) as BotSettingsFile;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Не удалось прочитать ${absPath}: ${msg}`);
  }

  const projects: BotProjectConfig[] = [];
  const seenIds = new Set<string>();

  for (const raw of parsed.projects ?? []) {
    const id = (raw.id ?? "").trim();
    const name = (raw.name ?? "").trim();
    const path = (raw.path ?? "").trim();
    if (!id || !name || !path) {
      throw new Error(`Каждый проект должен иметь id, name и path (${absPath})`);
    }
    const key = id.toLowerCase();
    if (seenIds.has(key)) {
      throw new Error(`Дублирующийся id проекта «${id}» в ${absPath}`);
    }
    seenIds.add(key);
    projects.push({ id, name, path: resolve(path) });
  }

  if (!projects.length) {
    throw new Error(`В ${absPath} нужен хотя бы один проект`);
  }

  const defaultProjectId = (parsed.defaultProjectId ?? projects[0].id).trim();
  const defaultKey = defaultProjectId.toLowerCase();
  if (!seenIds.has(defaultKey)) {
    throw new Error(`defaultProjectId «${defaultProjectId}» не найден среди projects`);
  }

  const allowedRaw = parsed.allowedUser;
  const allowedUser =
    allowedRaw == null || String(allowedRaw).trim() === ""
      ? null
      : normalizeUserLogin(String(allowedRaw));

  for (const project of projects) {
    if (!existsSync(project.path)) {
      console.warn(`[config] Папка проекта «${project.name}» не найдена: ${project.path}`);
    }
  }

  return {
    allowedUser,
    defaultProjectId: projects.find((p) => p.id.toLowerCase() === defaultKey)!.id,
    projects,
    assistant: mergeAssistantConfig(parsed.assistant),
  };
}
