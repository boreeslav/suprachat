import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CursorBotMode } from "./cursor-mode.js";

export type BotActionType = "script" | "agent";

export interface BotActionDefinition {
  id: string;
  title: string;
  type: BotActionType;
  /** Команда для type=script (node, powershell, cmd и т.д.) */
  command?: string;
  args?: string[];
  /** Рабочая папка (относительно корня CursorBot или абсолютный путь) */
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  /** Для type=agent */
  prompt?: string;
  mode?: CursorBotMode;
  replyPrefix?: string;
}

export interface BotActionsFile {
  actions?: BotActionDefinition[];
}

export function resolveActionsFilePath(configPath: string): string {
  const configDir = dirname(configPath);
  const candidates = [
    resolve(configDir, "actions.json"),
    resolve(configDir, "..", "actions.json"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0]!;
}

function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? filePath.slice(0, idx) : ".";
}

function normalizeAction(raw: BotActionDefinition, filePath: string): BotActionDefinition | null {
  const id = (raw.id ?? "").trim();
  const title = (raw.title ?? "").trim();
  const type = raw.type;
  if (!id || !title) return null;
  if (type !== "script" && type !== "agent") {
    console.warn(`[actions] Пропуск «${id}»: неизвестный type (${filePath})`);
    return null;
  }
  if (type === "script" && !(raw.command ?? "").trim()) {
    console.warn(`[actions] Пропуск «${id}»: для script нужен command (${filePath})`);
    return null;
  }
  if (type === "agent" && !(raw.prompt ?? "").trim()) {
    console.warn(`[actions] Пропуск «${id}»: для agent нужен prompt (${filePath})`);
    return null;
  }
  return {
    id,
    title,
    type,
    command: raw.command?.trim() || undefined,
    args: raw.args?.map((a) => String(a)),
    cwd: raw.cwd?.trim() || undefined,
    env: raw.env,
    timeoutMs: raw.timeoutMs,
    prompt: raw.prompt?.trim() || undefined,
    mode: raw.mode === "ask" ? "ask" : raw.mode === "agent" ? "agent" : undefined,
    replyPrefix: raw.replyPrefix,
  };
}

/** Читает actions.json при каждом вызове — всегда актуальный каталог. */
export function loadActionsConfig(configPath: string): BotActionDefinition[] {
  const filePath = resolveActionsFilePath(configPath);
  if (!existsSync(filePath)) return [];

  let parsed: BotActionsFile;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8")) as BotActionsFile;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Не удалось прочитать ${filePath}: ${msg}`);
  }

  const seen = new Set<string>();
  const result: BotActionDefinition[] = [];
  for (const raw of parsed.actions ?? []) {
    const action = normalizeAction(raw, filePath);
    if (!action) continue;
    const key = action.id.toLowerCase();
    if (key.startsWith("_")) {
      console.warn(`[actions] Пропуск «${action.id}»: id не может начинаться с _ (${filePath})`);
      continue;
    }
    if (seen.has(key)) {
      console.warn(`[actions] Дублирующийся id «${action.id}» в ${filePath}`);
      continue;
    }
    seen.add(key);
    result.push(action);
  }
  return result;
}
