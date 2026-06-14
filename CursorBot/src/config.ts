import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { loadBotSettings, type BotSettings } from "./bot-config.js";

loadEnv();

export type CursorRuntime = "cloud" | "local";

export interface AppConfig {
  supra: {
    baseUrl: string;
    login: string;
    token: string;
    maxMessageChars: number;
    sendTyping: boolean;
    sendThoughtStatus: boolean;
    thoughtUpdateIntervalMs: number;
    thoughtMaxChars: number;
    /** Макс. размер входящего файла (байты). */
    maxFileBytes: number;
  };
  cursor: {
    apiKey: string;
    /** Модель по умолчанию для новых чатов (ключ auto, pro или id). */
    defaultModel: string;
    /** Модель для пресета Pro (Premium). */
    proModel: string;
    runtime: CursorRuntime;
    repoUrl: string;
    repoRef: string;
    autoCreatePr: boolean;
    /** Таймаут попытки подключиться к прерванному run (мс); дальше — автопродолжение с контекстом. */
    recoverRunTimeoutMs: number;
  };
  bot: BotSettings & {
    configPath: string;
  };
  stateFile: string;
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Переменная окружения ${name} обязательна (см. .env.example)`);
  return v;
}

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (!v) return fallback;
  return v === "1" || v === "true" || v === "yes";
}

export function loadConfig(): AppConfig {
  const runtime = (process.env.CURSOR_RUNTIME?.trim().toLowerCase() || "cloud") as CursorRuntime;
  if (runtime !== "cloud" && runtime !== "local") {
    throw new Error("CURSOR_RUNTIME должен быть cloud или local");
  }

  const sendTyping = envBool("SUPRA_SEND_TYPING", envBool("SUPRA_SEND_THINKING", true));
  const botConfigPath = resolve(process.env.BOT_CONFIG?.trim() || "./data/bot-config.json");
  const botSettings = loadBotSettings(botConfigPath);

  const config: AppConfig = {
    supra: {
      baseUrl: requireEnv("SUPRA_BASE_URL"),
      login: requireEnv("SUPRA_BOT_LOGIN"),
      token: requireEnv("SUPRA_BOT_TOKEN"),
      maxMessageChars: Number(process.env.SUPRA_MAX_MESSAGE_CHARS) || 8000,
      sendTyping,
      sendThoughtStatus: envBool("SUPRA_SEND_THOUGHT_STATUS", true),
      thoughtUpdateIntervalMs: Number(process.env.SUPRA_THOUGHT_UPDATE_MS) || 3500,
      thoughtMaxChars: Number(process.env.SUPRA_THOUGHT_MAX_CHARS) || 600,
      maxFileBytes: Number(process.env.SUPRA_MAX_FILE_BYTES) || 100 * 1024 * 1024,
    },
    cursor: {
      apiKey: requireEnv("CURSOR_API_KEY"),
      defaultModel: process.env.CURSOR_DEFAULT_MODEL?.trim()
        || process.env.CURSOR_MODEL?.trim()
        || "auto",
      proModel: process.env.CURSOR_PRO_MODEL?.trim() || "claude-opus-4-8",
      runtime,
      repoUrl: process.env.CURSOR_REPO_URL?.trim() || "",
      repoRef: process.env.CURSOR_REPO_REF?.trim() || "main",
      autoCreatePr: envBool("CURSOR_AUTO_CREATE_PR", false),
      recoverRunTimeoutMs: Number(process.env.SUPRA_RECOVER_RUN_TIMEOUT_MS) || 90_000,
    },
    bot: {
      ...botSettings,
      configPath: botConfigPath,
    },
    stateFile: resolve(process.env.STATE_FILE?.trim() || "./data/state.json"),
  };

  if (config.cursor.runtime === "cloud" && !config.cursor.repoUrl) {
    throw new Error("CURSOR_REPO_URL обязателен при CURSOR_RUNTIME=cloud");
  }

  return config;
}
