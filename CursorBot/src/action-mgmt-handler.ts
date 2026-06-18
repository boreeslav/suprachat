import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "./config.js";
import type { CursorBridge } from "./cursor-bridge.js";
import { loadActionsConfig, resolveActionsFilePath } from "./actions-config.js";
import { getActionPickerPage } from "./action-catalog-pages.js";
import {
  ACTION_CMD_PREFIX,
  META_ADD,
  META_DELETE,
  META_EDIT,
  META_MANAGE,
  META_PAGE,
} from "./actions-constants.js";
import { buildActionMgmtPrompt, type ActionMgmtTask } from "./action-mgmt-prompt.js";
import type { BotApiMessage, BotMessageButtonDto, SupraBotApi } from "./supra-bot-api.js";
import type { SessionRegistry } from "./session-registry.js";
import { makeSessionKey, UI_CANCEL_CMD } from "./session-keys.js";

const MGMT_BUTTON_COUNT = 1;

export interface PendingActionMgmt {
  task: ActionMgmtTask;
  actionId?: string;
  actionTitle?: string;
}

export function isMetaActionId(actionId: string): boolean {
  return actionId.startsWith("_");
}

export function parseMetaActionId(
  actionId: string,
):
  | { kind: "add" }
  | { kind: "manage" }
  | { kind: "page"; pageIndex: number }
  | { kind: "edit_list"; pageIndex: number }
  | { kind: "edit"; targetId: string }
  | { kind: "delete_list"; pageIndex: number }
  | { kind: "delete"; targetId: string }
  | null {
  if (actionId === META_ADD) return { kind: "add" };
  if (actionId === META_MANAGE) return { kind: "manage" };
  if (actionId === META_EDIT) return { kind: "edit_list", pageIndex: 0 };
  if (actionId === META_DELETE) return { kind: "delete_list", pageIndex: 0 };
  if (actionId.startsWith(`${META_PAGE}:`)) {
    const pageIndex = Number.parseInt(actionId.slice(META_PAGE.length + 1).trim(), 10);
    if (Number.isFinite(pageIndex) && pageIndex >= 0) return { kind: "page", pageIndex };
  }
  if (actionId.startsWith(`${META_EDIT}:`)) {
    const rest = actionId.slice(META_EDIT.length + 1).trim();
    if (rest.startsWith("page:")) {
      const pageIndex = Number.parseInt(rest.slice("page:".length).trim(), 10);
      if (Number.isFinite(pageIndex) && pageIndex >= 0) return { kind: "edit_list", pageIndex };
    }
    if (rest) return { kind: "edit", targetId: rest };
  }
  if (actionId.startsWith(`${META_DELETE}:`)) {
    const rest = actionId.slice(META_DELETE.length + 1).trim();
    if (rest.startsWith("page:")) {
      const pageIndex = Number.parseInt(rest.slice("page:".length).trim(), 10);
      if (Number.isFinite(pageIndex) && pageIndex >= 0) return { kind: "delete_list", pageIndex };
    }
    if (rest) return { kind: "delete", targetId: rest };
  }
  return null;
}

function cursorBotRoot(): string {
  return resolve(fileURLToPath(import.meta.url), "..", "..");
}

type ReplyFn = (update: BotApiMessage, text: string) => Promise<void>;
type ReplyWithButtonsFn = (
  update: BotApiMessage,
  text: string,
  buttons: BotMessageButtonDto[],
) => Promise<string | undefined>;
type OnCompleteFn = () => Promise<void>;

const PICKER_TEXT = "Выберите действие:";

export class ActionMgmtHandler {
  private readonly botRoot = cursorBotRoot();
  private readonly pending = new Map<string, PendingActionMgmt>();

  constructor(
    private readonly api: SupraBotApi,
    private readonly cursor: CursorBridge,
    private readonly sessions: SessionRegistry,
    private readonly config: AppConfig,
  ) {}

  getActionsFilePath(): string {
    return resolveActionsFilePath(this.config.bot.configPath);
  }

  hasPending(chatId: string): boolean {
    return this.pending.has(chatId);
  }

  clearPending(chatId: string): void {
    this.pending.delete(chatId);
  }

  maxUserActionButtons(totalSlots: number): number {
    return Math.max(0, totalSlots - MGMT_BUTTON_COUNT);
  }

  async tryHandlePendingDescription(
    update: BotApiMessage,
    text: string,
    reply: ReplyFn,
    onComplete?: OnCompleteFn,
  ): Promise<boolean> {
    const pending = this.pending.get(update.chatId);
    if (!pending) return false;

    const description = text.trim();
    if (!description) {
      await reply(update, "Опишите задачу текстом или отправьте /cancel для отмены.");
      return true;
    }

    this.pending.delete(update.chatId);
    await this.runMgmtAgent(update, pending, description, reply, onComplete);
    return true;
  }

  async handleMetaAction(
    update: BotApiMessage,
    actionId: string,
    reply: ReplyFn,
    replyWithButtons: ReplyWithButtonsFn,
  ): Promise<void> {
    const meta = parseMetaActionId(actionId);
    if (!meta) {
      await reply(update, `Неизвестная служебная команда: ${actionId}`);
      return;
    }

    const actions = loadActionsConfig(this.config.bot.configPath);

    if (meta.kind === "add") {
      this.pending.set(update.chatId, { task: "add" });
      await reply(
        update,
        [
          "Опишите, что должно делать новое действие:",
          "• название кнопки",
          "• скрипт без ИИ или запрос к агенту",
          "• что именно выполнять",
          "",
          "Отправьте описание одним сообщением. /cancel — отмена.",
        ].join("\n"),
      );
      return;
    }

    if (meta.kind === "manage") {
      await replyWithButtons(update, "Управление каталогом:", [
        {
          id: "act-mgmt-add",
          text: "➕ Добавить действие",
          action: `${ACTION_CMD_PREFIX}${META_ADD}`,
          color: "success",
        },
        {
          id: "act-mgmt-edit",
          text: "✏️ Редактировать",
          action: `${ACTION_CMD_PREFIX}${META_EDIT}`,
          color: "default",
        },
        {
          id: "act-mgmt-delete",
          text: "🗑 Удалить",
          action: `${ACTION_CMD_PREFIX}${META_DELETE}`,
          color: "secondary",
        },
        {
          id: "act-mgmt-cancel",
          text: "Отмена",
          action: UI_CANCEL_CMD,
          color: "default",
        },
      ]);
      return;
    }

    if (meta.kind === "edit_list") {
      if (!actions.length) {
        await reply(update, "Нет действий для редактирования.");
        return;
      }
      await replyWithButtons(
        update,
        PICKER_TEXT,
        this.buildPickerButtons(actions, META_EDIT, meta.pageIndex),
      );
      return;
    }

    if (meta.kind === "delete_list") {
      if (!actions.length) {
        await reply(update, "Нет действий для удаления.");
        return;
      }
      await replyWithButtons(
        update,
        PICKER_TEXT,
        this.buildPickerButtons(actions, META_DELETE, meta.pageIndex),
      );
      return;
    }

    if (meta.kind === "edit") {
      const action = actions.find((a) => a.id.toLowerCase() === meta.targetId.toLowerCase());
      if (!action) {
        await reply(update, `Действие «${meta.targetId}» не найдено.`);
        return;
      }
      this.pending.set(update.chatId, {
        task: "edit",
        actionId: action.id,
        actionTitle: action.title,
      });
      await reply(
        update,
        [
          `Редактирование: «${action.title}» (id: ${action.id})`,
          "",
          "Опишите, что изменить (название, скрипт, prompt, тип и т.д.).",
          "/cancel — отмена.",
        ].join("\n"),
      );
      return;
    }

    if (meta.kind === "delete") {
      const action = actions.find((a) => a.id.toLowerCase() === meta.targetId.toLowerCase());
      if (!action) {
        await reply(update, `Действие «${meta.targetId}» не найдено.`);
        return;
      }
      this.pending.set(update.chatId, {
        task: "delete",
        actionId: action.id,
        actionTitle: action.title,
      });
      await reply(
        update,
        [
          `Удаление: «${action.title}» (id: ${action.id})`,
          "",
          "Подтвердите удаление или опишите причину. Агент уберёт действие из каталога.",
          "/cancel — отмена.",
        ].join("\n"),
      );
    }
  }

  private buildPickerButtons(
    actions: ReturnType<typeof loadActionsConfig>,
    prefix: typeof META_EDIT | typeof META_DELETE,
    pageIndex = 0,
  ): BotMessageButtonDto[] {
    return getActionPickerPage(
      actions,
      prefix,
      pageIndex,
      prefix === META_DELETE ? "secondary" : "default",
    ).buttons;
  }

  private async runMgmtAgent(
    update: BotApiMessage,
    pending: PendingActionMgmt,
    userDescription: string,
    reply: ReplyFn,
    onComplete?: OnCompleteFn,
  ): Promise<void> {
    const chatId = update.chatId;
    const prevActive = this.sessions.getActiveSessionId(chatId);
    const created = this.sessions.createSession(chatId);
    if (!created.ok) {
      await reply(
        update,
        `${created.reason}\nОсвободите слот сессии (/sessions) и повторите.`,
      );
      return;
    }

    const mgmtSessionId = created.sessionId;
    this.sessions.switchActive(chatId, mgmtSessionId);
    const sessionKey = makeSessionKey(chatId, mgmtSessionId);

    try {
      await this.cursor.resetSession(sessionKey);
      await this.cursor.setMode(sessionKey, "agent");

      const prompt = buildActionMgmtPrompt({
        task: pending.task,
        actionsFilePath: this.getActionsFilePath(),
        botRoot: this.botRoot,
        userDescription,
        actionId: pending.actionId,
        actionTitle: pending.actionTitle,
      });

      await this.withTyping(update, async () => {
        const agentReply = await this.cursor.ask(sessionKey, prompt, {
          promptIsComplete: true,
          forceNewAgent: true,
          senderName: update.senderName,
          chatType: update.chatType,
          chatName: update.chatName,
        });

        if (agentReply.superseded) return;

        if (agentReply.status === "error") {
          await reply(update, `❌ ${agentReply.errorDetail ?? "Ошибка агента"}`);
          return;
        }

        const validation = this.validateActionsFile();
        if (!validation.ok) {
          await reply(
            update,
            `⚠️ Агент ответил, но actions.json некорректен: ${validation.error}\n\n${(agentReply.text || "").trim()}`,
          );
          return;
        }

        const agentText = (agentReply.text || "").trim();
        const summary = this.buildResultSummary(pending, validation.count);
        await reply(update, agentText ? `${agentText}\n\n${summary}` : summary);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[action-mgmt]", msg);
      await reply(update, `❌ Не удалось настроить действие: ${msg}`);
    } finally {
      this.sessions.endSession(chatId, mgmtSessionId);
      if (prevActive && prevActive !== mgmtSessionId) {
        this.sessions.switchActive(chatId, prevActive);
      }
      if (onComplete) {
        try {
          await onComplete();
        } catch (err) {
          console.warn("[action-mgmt] onComplete failed:", err instanceof Error ? err.message : err);
        }
      }
    }
  }

  private async withTyping(update: BotApiMessage, fn: () => Promise<void>): Promise<void> {
    const target =
      update.chatType === "direct" && update.senderLogin
        ? { userLogin: update.senderLogin }
        : { chatId: update.chatId };
    try {
      await this.api.sendActivity({
        ...target,
        activityType: "typing",
        active: true,
        activityMessage: "Настраиваю каталог действий…",
      });
    } catch {
      /* ignore */
    }
    try {
      await fn();
    } finally {
      try {
        await this.api.clearActivities(target);
      } catch {
        /* ignore */
      }
    }
  }

  private validateActionsFile(): { ok: true; count: number } | { ok: false; error: string } {
    const path = this.getActionsFilePath();
    if (!existsSync(path)) {
      return { ok: false, error: "файл не создан" };
    }
    try {
      const raw = readFileSync(path, "utf8");
      const parsed = JSON.parse(raw) as { actions?: unknown };
      if (!Array.isArray(parsed.actions)) {
        return { ok: false, error: 'нет массива "actions"' };
      }
      const count = loadActionsConfig(this.config.bot.configPath).length;
      return { ok: true, count };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  }

  private buildResultSummary(pending: PendingActionMgmt, count: number): string {
    const verbs: Record<ActionMgmtTask, string> = {
      add: "Добавление",
      edit: "Редактирование",
      delete: "Удаление",
    };
    const target = pending.actionTitle ? ` «${pending.actionTitle}»` : "";
    return `✅ ${verbs[pending.task]}${target} завершено. В каталоге ${count} действий. /actions — обновлённый список.`;
  }
}
