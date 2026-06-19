import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { appendProjectToSettings, type BotProjectConfig } from "./bot-config.js";
import type { BotMenuManager } from "./bot-menu-manager.js";
import type { CursorBridge } from "./cursor-bridge.js";
import type { AppConfig } from "./config.js";
import { PROJECT_ADD_CMD } from "./bot-menu.js";
import type { ProjectCatalog } from "./project-catalog.js";
import type { BotApiMessage } from "./supra-bot-api.js";
import type { SessionRegistry } from "./session-registry.js";

type ReplyFn = (update: BotApiMessage, text: string) => Promise<void>;

interface PendingProjectAdd {
  step: "name" | "path";
  name?: string;
}

function slugifyProjectId(name: string, existingIds: Set<string>): string {
  let base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) base = "project";

  let id = base;
  let suffix = 2;
  while (existingIds.has(id.toLowerCase())) {
    id = `${base}-${suffix++}`;
  }
  return id;
}

export class ProjectAddHandler {
  private readonly pending = new Map<string, PendingProjectAdd>();

  constructor(
    private readonly config: AppConfig,
    private readonly projects: ProjectCatalog,
    private readonly cursor: CursorBridge,
    private readonly sessions: SessionRegistry,
    private readonly menuManager: BotMenuManager,
  ) {}

  hasPending(chatId: string): boolean {
    return this.pending.has(chatId);
  }

  clearPending(chatId: string): void {
    this.pending.delete(chatId);
  }

  isAddCommand(text: string): boolean {
    const trimmed = text.trim();
    return trimmed === PROJECT_ADD_CMD || trimmed.startsWith(`${PROJECT_ADD_CMD} `);
  }

  async startAdd(update: BotApiMessage, reply: ReplyFn): Promise<void> {
    this.pending.set(update.chatId, { step: "name" });
    await reply(update, "Пришлите название проекта");
  }

  async tryHandlePending(
    update: BotApiMessage,
    text: string,
    reply: ReplyFn,
  ): Promise<boolean> {
    const pending = this.pending.get(update.chatId);
    if (!pending) return false;

    const value = text.trim();
    if (!value) {
      await reply(
        update,
        pending.step === "name"
          ? "Пришлите название проекта."
          : "Пришлите путь к папке.",
      );
      return true;
    }

    if (pending.step === "name") {
      pending.name = value;
      pending.step = "path";
      await reply(update, "Пришлите путь к папке");
      return true;
    }

    this.pending.delete(update.chatId);
    await this.createProject(update, pending.name!, value, reply);
    return true;
  }

  private async createProject(
    update: BotApiMessage,
    name: string,
    rawPath: string,
    reply: ReplyFn,
  ): Promise<void> {
    const trimmedPath = rawPath.trim();
    const absPath = resolve(trimmedPath);
    if (!existsSync(absPath)) {
      await reply(update, `Папка не найдена: ${absPath}`);
      return;
    }

    const existingIds = new Set(
      this.projects.listAllProjects().map((p) => p.id.toLowerCase()),
    );
    const id = slugifyProjectId(name, existingIds);
    const project: BotProjectConfig = { id, name: name.trim(), path: absPath };

    try {
      appendProjectToSettings(this.config.bot.configPath, project, trimmedPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await reply(update, `Не удалось сохранить проект: ${msg}`);
      return;
    }

    try {
      this.projects.addProject(project);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await reply(update, msg);
      return;
    }

    this.config.bot.projects.push(project);

    const sessionKey = this.sessions.getActiveSessionKey(update.chatId);
    if (sessionKey) {
      await this.cursor.setProject(sessionKey, id);
    } else {
      this.sessions.setRoomDefaultProject(update.chatId, id);
    }

    await this.menuManager.refreshAfterProjectsChanged(this.sessions.listKnownChatIds());
    if (sessionKey) {
      await this.menuManager.publishForChat(update.chatId, update.chatType, true);
    }

    const displayPath = absPath.includes(" ") ? `"${absPath}"` : absPath;
    await reply(
      update,
      [
        `Проект «${name.trim()}» добавлен и выбран.`,
        `Id: ${id}`,
        `Папка: ${displayPath}`,
      ].join("\n"),
    );
  }
}
