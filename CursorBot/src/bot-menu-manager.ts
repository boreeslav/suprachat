import { buildBotMenu, buildDefaultBotMenu } from "./bot-menu.js";
import { isGroupChatType } from "./chat-type.js";
import { buildSessionSubmenuItems } from "./session-picker.js";
import type { CursorBridge } from "./cursor-bridge.js";
import type { ModelCatalog } from "./model-catalog.js";
import type { ProjectCatalog } from "./project-catalog.js";
import type { SessionRegistry } from "./session-registry.js";
import type { BotApiMenuDto, SupraBotApi } from "./supra-bot-api.js";

function menuFingerprint(menu: BotApiMenuDto): string {
  return JSON.stringify(menu);
}

export class BotMenuManager {
  private readonly syncedChats = new Set<string>();
  private readonly publishedFingerprints = new Map<string, string>();
  private readonly chatTypes = new Map<string, string>();
  private globalPublished = false;
  private globalGroupPublished = false;
  private globalFingerprint = "";
  private globalGroupFingerprint = "";

  constructor(
    private readonly api: SupraBotApi,
    private readonly cursor: CursorBridge,
    private readonly sessions: SessionRegistry,
    private readonly models: ModelCatalog,
    private readonly projects: ProjectCatalog,
  ) {}

  rememberChatType(chatId: string, chatType: string | undefined | null): void {
    if (!chatId || !chatType) return;
    this.chatTypes.set(chatId, chatType);
  }

  getChatType(chatId: string): string | undefined {
    return this.chatTypes.get(chatId);
  }

  private resolveChatType(chatId: string, chatType?: string | null): string | undefined {
    if (chatType) return chatType;
    return this.chatTypes.get(chatId);
  }

  private isGroupChat(chatId: string, chatType?: string | null): boolean {
    return isGroupChatType(this.resolveChatType(chatId, chatType));
  }

  private buildChatMenu(chatId: string): BotApiMenuDto {
    const sessionKey = this.sessions.getActiveSessionKey(chatId);
    return buildBotMenu(
      sessionKey ? this.cursor.getMode(sessionKey) : "agent",
      sessionKey ? this.cursor.getModel(sessionKey) : "auto",
      this.models.getMenuModels(),
      this.projects.listMenuProjects(),
      sessionKey ? this.cursor.getProjectId(sessionKey) : this.projects.defaultKey,
      buildSessionSubmenuItems(this.sessions, chatId),
    );
  }

  /** Публикует глобальное меню (fallback для новых чатов). */
  async publishGlobal(force = false): Promise<void> {
    const menu = buildDefaultBotMenu(
      this.models.getMenuModels(),
      this.projects.listMenuProjects(),
      this.projects.defaultKey,
    );
    const fingerprint = menuFingerprint(menu);

    if (!force && this.globalPublished && this.globalFingerprint === fingerprint) {
      /* direct global already up to date */
    } else {
      try {
        const resp = await this.api.setMenu({ menu });
        if (resp.success) {
          this.globalPublished = true;
          this.globalFingerprint = fingerprint;
          console.log("[menu] глобальное меню опубликовано");
        } else {
          console.warn("[menu] не удалось опубликовать глобальное меню:", resp.error);
        }
      } catch (err) {
        console.warn("[menu] publishGlobal failed:", err instanceof Error ? err.message : err);
      }
    }

    if (!force && this.globalGroupPublished && this.globalGroupFingerprint === fingerprint) {
      return;
    }

    try {
      const resp = await this.api.setGroupMenu({ groupMenu: menu });
      if (resp.success) {
        this.globalGroupPublished = true;
        this.globalGroupFingerprint = fingerprint;
        console.log("[menu] глобальное групповое меню опубликовано");
      } else {
        console.warn("[menu] не удалось опубликовать глобальное групповое меню:", resp.error);
      }
    } catch (err) {
      console.warn(
        "[menu] publishGlobal group failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Публикует меню для чата. setMenu/setGroupMenu вызывается только если содержимое изменилось.
   */
  async publishForChat(
    chatId: string,
    chatType?: string | null,
    force = false,
  ): Promise<boolean> {
    if (!chatId) return false;
    this.rememberChatType(chatId, chatType ?? this.chatTypes.get(chatId));

    const menu = this.buildChatMenu(chatId);
    const fingerprint = menuFingerprint(menu);
    if (!force && this.publishedFingerprints.get(chatId) === fingerprint) {
      return false;
    }

    const sessionKey = this.sessions.getActiveSessionKey(chatId);
    const mode = sessionKey ? this.cursor.getMode(sessionKey) : "agent";
    const model = sessionKey ? this.cursor.getModel(sessionKey) : "auto";
    const projectId = sessionKey ? this.cursor.getProjectId(sessionKey) : this.projects.defaultKey;
    const group = this.isGroupChat(chatId, chatType);

    try {
      const resp = group
        ? await this.api.setGroupMenu({ groupMenu: menu, chatId })
        : await this.api.setMenu({ menu, chatId });

      if (resp.success) {
        this.syncedChats.add(chatId);
        this.publishedFingerprints.set(chatId, fingerprint);
        console.log(
          `[menu] ${group ? "групповое" : "личное"} меню чата ${chatId} обновлено (проект: ${projectId}, режим: ${mode}, модель: ${model})`,
        );
        return true;
      }
      console.warn(`[menu] set${group ? "Group" : ""}Menu chat ${chatId}:`, resp.error);
    } catch (err) {
      console.warn(`[menu] publishForChat ${chatId} failed:`, err instanceof Error ? err.message : err);
    }
    return false;
  }

  /** Обновляет меню чата при первом сообщении или после смены настроек. */
  async syncChatMenu(
    chatId: string,
    chatType?: string | null,
    force = false,
  ): Promise<void> {
    if (!chatId) return;
    this.rememberChatType(chatId, chatType);
    if (!force && this.syncedChats.has(chatId)) return;
    await this.publishForChat(chatId, chatType, force);
  }

  invalidateChat(chatId: string): void {
    this.syncedChats.delete(chatId);
    this.publishedFingerprints.delete(chatId);
    this.chatTypes.delete(chatId);
  }
}
