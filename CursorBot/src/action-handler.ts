import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "./config.js";
import {
  loadActionsConfig,
  resolveActionsFilePath,
  type BotActionDefinition,
} from "./actions-config.js";
import { getActionCatalogPage } from "./action-catalog-pages.js";
import {
  ACTION_CMD_PREFIX,
  ACTIONS_CMD,
} from "./actions-constants.js";
import type { BotApiMessage, BotMessageButtonDto, SupraBotApi } from "./supra-bot-api.js";
import type { ActionMgmtHandler } from "./action-mgmt-handler.js";

export { ACTIONS_CMD, ACTION_CMD_PREFIX } from "./actions-constants.js";

const DEFAULT_SCRIPT_TIMEOUT_MS = 120_000;

export function isActionCommand(text: string): boolean {
  const t = text.trim();
  return t === ACTIONS_CMD || t.startsWith(`${ACTIONS_CMD} `) || t.startsWith(ACTION_CMD_PREFIX);
}

export function parseActionCommand(
  text: string,
): { kind: "list" } | { kind: "run"; actionId: string } | null {
  const t = text.trim();
  if (t === ACTIONS_CMD || t.startsWith(`${ACTIONS_CMD} `)) return { kind: "list" };
  if (t.startsWith(ACTION_CMD_PREFIX)) {
    const actionId = t.slice(ACTION_CMD_PREFIX.length).trim();
    if (actionId) return { kind: "run", actionId };
  }
  return null;
}

/** Кнопки UI скриптов действий (трансляция и т.п.) — обрабатываются subprocess через getMessages, не основным handler. */
const SCRIPT_UI_ACTION_RE =
  /^\/(?:desktop-stream|smart-desktop-stream)(?:-stop|-dur-(?:1m|5m|15m|30m|1h))$/;

export function isScriptActionUiCommand(text: string): boolean {
  return SCRIPT_UI_ACTION_RE.test(text.trim());
}

export interface ScriptActionResult {
  text?: string;
  photo?: string;
  caption?: string;
  /** Скрипт сам отправил ответ в чат (например, до смены сети). */
  handled?: boolean;
}

function cursorBotRoot(): string {
  return resolve(fileURLToPath(import.meta.url), "..", "..");
}

function resolveBotPath(pathValue: string | undefined, root: string): string {
  const trimmed = (pathValue ?? "").trim();
  if (!trimmed) return root;
  return isAbsolute(trimmed) ? trimmed : resolve(root, trimmed);
}

function parseScriptOutput(stdout: string): ScriptActionResult {
  const trimmed = stdout.trim();
  if (!trimmed) return {};

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim());
  const last = lines[lines.length - 1]?.trim() ?? "";
  if (last.startsWith("{")) {
    try {
      const json = JSON.parse(last) as Record<string, unknown>;
      const prefix = lines.slice(0, -1).join("\n").trim();
      const text =
        prefix ||
        (typeof json.text === "string" ? json.text : "") ||
        (typeof json.reply === "string" ? json.reply : "");
      const photo =
        (typeof json.photo === "string" ? json.photo : "") ||
        (typeof json.photoPath === "string" ? json.photoPath : "");
      const caption = typeof json.caption === "string" ? json.caption : undefined;
      const handled = json.handled === true;
      return {
        text: text || undefined,
        photo: photo || undefined,
        caption,
        handled,
      };
    } catch {
      /* plain text */
    }
  }
  return { text: trimmed };
}

type ReplyTarget = { userLogin?: string; chatId?: string };

export class ActionHandler {
  private readonly botRoot = cursorBotRoot();

  constructor(
    private readonly api: SupraBotApi,
    private readonly config: AppConfig,
  ) {}

  getActionsFilePath(): string {
    return resolveActionsFilePath(this.config.bot.configPath);
  }

  loadActions(): BotActionDefinition[] {
    return loadActionsConfig(this.config.bot.configPath);
  }

  buildActionButtons(actions: BotActionDefinition[], pageIndex = 0): BotMessageButtonDto[] {
    return getActionCatalogPage(actions, pageIndex).buttons;
  }

  buildCatalogText(): string {
    return "Выберите действие:";
  }

  async showCatalog(
    update: BotApiMessage,
    actionMgmt: ActionMgmtHandler,
    replyWithButtons: (
      update: BotApiMessage,
      text: string,
      buttons: BotMessageButtonDto[],
    ) => Promise<string | undefined>,
  ): Promise<string | undefined> {
    const actions = this.loadActions();
    const text = this.buildCatalogText();
    const buttons = this.buildActionButtons(actions);
    return replyWithButtons(update, text, buttons);
  }

  async runAction(
    update: BotApiMessage,
    actionId: string,
    replyTarget: ReplyTarget,
    reply: (update: BotApiMessage, text: string) => Promise<void>,
    runAgentAction: (
      update: BotApiMessage,
      prompt: string,
      mode: "agent" | "ask",
      replyPrefix?: string,
    ) => Promise<void>,
  ): Promise<void> {
    const actions = this.loadActions();
    const action = actions.find((a) => a.id.toLowerCase() === actionId.toLowerCase());
    if (!action) {
      await reply(update, `Действие «${actionId}» не найдено. ${ACTIONS_CMD} — актуальный каталог.`);
      return;
    }

    const activityType = action.type === "agent" ? "typing" : "activityMessage";

    try {
      await this.api.sendActivity({
        ...replyTarget,
        activityType,
        active: true,
        activityMessage:
          action.type === "agent"
            ? `Выполняю «${action.title}»…`
            : `Запускаю «${action.title}»…`,
      });
    } catch {
      /* ignore */
    }

    try {
      if (action.type === "agent") {
        await runAgentAction(update, action.prompt!, action.mode ?? "ask", action.replyPrefix);
        return;
      }
      await this.runScriptAction(update, action, replyTarget, reply);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[actions] ${action.id}:`, msg);
      await reply(update, `❌ Действие «${action.title}»: ${msg}`);
    } finally {
      await this.api.clearActivities(replyTarget, [activityType, "typing", "activityMessage", "sendingImage"]);
    }
  }

  private async runScriptAction(
    update: BotApiMessage,
    action: BotActionDefinition,
    replyTarget: ReplyTarget,
    reply: (update: BotApiMessage, text: string) => Promise<void>,
  ): Promise<void> {
    const cwd = resolveBotPath(action.cwd, this.botRoot);
    const env = {
      ...process.env,
      BOT_CHAT_ID: update.chatId,
      BOT_CHAT_TYPE: update.chatType,
      BOT_CHAT_NAME: update.chatName ?? "",
      BOT_SENDER_LOGIN: update.senderLogin ?? "",
      BOT_SENDER_NAME: update.senderName ?? "",
      SUPRA_BASE_URL: this.config.supra.baseUrl,
      SUPRA_BOT_LOGIN: this.config.supra.login,
      SUPRA_BOT_TOKEN: this.config.supra.token,
      ACTIONS_CONFIG_DIR: resolve(dirname(this.config.bot.configPath)),
      CURSOR_BOT_ROOT: this.botRoot,
      ...(action.env ?? {}),
    };

    const { stdout, stderr, exitCode } = await this.spawnScript(
      action.command!,
      action.args ?? [],
      cwd,
      env,
      action.timeoutMs ?? DEFAULT_SCRIPT_TIMEOUT_MS,
    );

    if (exitCode !== 0) {
      const detail = (stderr || stdout).trim().slice(0, 500);
      throw new Error(detail || `код выхода ${exitCode}`);
    }

    const parsed = parseScriptOutput(stdout);
    if (parsed.handled) return;

    if (parsed.photo) {
      const photoPath = resolveBotPath(parsed.photo, cwd);
      if (!existsSync(photoPath)) {
        throw new Error(`Файл не найден: ${photoPath}`);
      }
      await this.sendPhoto(replyTarget, photoPath, parsed.caption);
      if (parsed.text) await reply(update, parsed.text);
      return;
    }

    if (parsed.text) {
      await reply(update, parsed.text);
      return;
    }

    await reply(update, `✅ ${action.title}`);
  }

  private spawnScript(
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    timeoutMs: number,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolvePromise, reject) => {
      const proc = spawn(command, args, {
        cwd,
        env,
        windowsHide: true,
        shell: false,
      });

      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        proc.kill("SIGTERM");
        reject(new Error(`таймаут ${Math.round(timeoutMs / 1000)} с`));
      }, timeoutMs);

      proc.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      proc.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });
      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        resolvePromise({ stdout, stderr, exitCode: code ?? 1 });
      });
    });
  }

  private async sendPhoto(
    replyTarget: ReplyTarget,
    photoPath: string,
    caption?: string,
  ): Promise<void> {
    const chatId = replyTarget.chatId;
    if (!chatId) {
      throw new Error("sendPhoto: chatId обязателен");
    }
    const buf = await readFile(photoPath);
    const fileName = basename(photoPath);
    const mime = fileName.toLowerCase().endsWith(".png")
      ? "image/png"
      : fileName.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    const upload = await this.api.uploadFile(chatId, buf, fileName, mime);
    if (!upload.success || !upload.fileId) {
      throw new Error(upload.error ?? "uploadFile failed");
    }
    const send = await this.api.sendMessage({
      ...replyTarget,
      photoFileId: upload.fileId,
      caption: caption?.trim() || undefined,
    });
    if (!send.success) {
      throw new Error(send.error ?? "sendMessage failed");
    }
  }
}

function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? filePath.slice(0, idx) : ".";
}
