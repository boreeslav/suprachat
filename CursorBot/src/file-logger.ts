import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { dirname } from "node:path";

const MAX_BYTES = 5 * 1024 * 1024;

function format(level: string, args: unknown[]): string {
  const ts = new Date().toISOString();
  const text = args
    .map((a) => {
      if (typeof a === "string") return a;
      if (a instanceof Error) return a.stack || a.message;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");
  return `[${ts}] [${level}] ${text}\n`;
}

/**
 * Дублирует console.log/info/warn/error в файл (data/bot.log) с ротацией.
 * Нужно для диагностики: вывод watchdog уходит в скрытое окно и теряется.
 */
export function installFileLogger(logPath: string): void {
  try {
    mkdirSync(dirname(logPath), { recursive: true });
  } catch {
    /* ignore */
  }

  const write = (level: string, args: unknown[]): void => {
    try {
      if (existsSync(logPath) && statSync(logPath).size > MAX_BYTES) {
        try {
          renameSync(logPath, `${logPath}.1`);
        } catch {
          /* ignore rotate error */
        }
      }
      appendFileSync(logPath, format(level, args));
    } catch {
      /* logging must never crash the bot */
    }
  };

  const patch = (
    method: "log" | "info" | "warn" | "error",
    level: string,
  ): void => {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]): void => {
      original(...args);
      write(level, args);
    };
  };

  patch("log", "INFO");
  patch("info", "INFO");
  patch("warn", "WARN");
  patch("error", "ERROR");
}
