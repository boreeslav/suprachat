import { buildBotMenu, buildDefaultBotMenu } from "./bot-menu.js";
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
  private globalPublished = false;
  private globalFingerprint = "";

  constructor(
    private readonly api: SupraBotApi,
    private readonly cursor: CursorBridge,
    private readonly sessions: SessionRegistry,
    private readonly models: ModelCatalog,
    private readonly projects: ProjectCatalog,
  ) {}

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
    if (this.globalPublished && !force) return;
    const menu = buildDefaultBotMenu(
      this.models.getMenuModels(),
      this.projects.listMenuProjects(),
      this.projects.defaultKey,
    );
    const fingerprint = menuFingerprint(menu);
    if (!force && this.globalFingerprint === fingerprint) {
      this.globalPublished = true;
      return;
    }
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

  /**
   * Публикует меню для чата. setMenu вызывается только если содержимое изменилось
   * (активная сессия, ⚙ у занятых, режим/модель/проект, список сессий).
   */
  async publishForChat(chatId: string, force = false): Promise<boolean> {
    if (!chatId) return false;
    const menu = this.buildChatMenu(chatId);
    const fingerprint = menuFingerprint(menu);
    if (!force && this.publishedFingerprints.get(chatId) === fingerprint) {
      return false;
    }

    const sessionKey = this.sessions.getActiveSessionKey(chatId);
    const mode = sessionKey ? this.cursor.getMode(sessionKey) : "agent";
    const model = sessionKey ? this.cursor.getModel(sessionKey) : "auto";
    const projectId = sessionKey ? this.cursor.getProjectId(sessionKey) : this.projects.defaultKey;
    try {
      const resp = await this.api.setMenu({ menu, chatId });
      if (resp.success) {
        this.syncedChats.add(chatId);
        this.publishedFingerprints.set(chatId, fingerprint);
        console.log(
          `[menu] меню чата ${chatId} обновлено (проект: ${projectId}, режим: ${mode}, модель: ${model})`,
        );
        return true;
      }
      console.warn(`[menu] setMenu chat ${chatId}:`, resp.error);
    } catch (err) {
      console.warn(`[menu] publishForChat ${chatId} failed:`, err instanceof Error ? err.message : err);
    }
    return false;
  }

  /** Обновляет меню чата при первом сообщении или после смены настроек. */
  async syncChatMenu(chatId: string, force = false): Promise<void> {
    if (!chatId) return;
    if (!force && this.syncedChats.has(chatId)) return;
    await this.publishForChat(chatId, force);
  }

  invalidateChat(chatId: string): void {
    this.syncedChats.delete(chatId);
    this.publishedFingerprints.delete(chatId);
  }
}
