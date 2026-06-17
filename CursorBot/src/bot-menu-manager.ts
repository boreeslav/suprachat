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

interface GroupFamilyScope {
  chatIds: string[];
  parentChatId?: string;
  branchChatIds: string[];
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

  private chatTypeForFamilyMember(
    chatId: string,
    scope: GroupFamilyScope,
    fallback?: string | null,
  ): string | undefined {
    if (scope.parentChatId && chatId === scope.parentChatId) return "group";
    if (scope.branchChatIds.includes(chatId)) return "group_branch";
    return this.resolveChatType(chatId, fallback);
  }

  private async resolveGroupFamily(chatId: string): Promise<GroupFamilyScope> {
    const chatIds = new Set<string>([chatId]);
    let parentChatId: string | undefined;
    const branchChatIds: string[] = [];

    try {
      const info = await this.api.getChatInfo({ chatId });
      if (!info.success) {
        return { chatIds: [...chatIds], branchChatIds };
      }

      if (info.parentChatId) {
        parentChatId = info.parentChatId;
        chatIds.add(parentChatId);
        const parentInfo = await this.api.getChatInfo({ chatId: parentChatId });
        if (parentInfo.success) {
          for (const branch of parentInfo.branches ?? []) {
            if (branch.id) {
              chatIds.add(branch.id);
              branchChatIds.push(branch.id);
            }
          }
        }
      } else {
        for (const branch of info.branches ?? []) {
          if (branch.id) {
            chatIds.add(branch.id);
            branchChatIds.push(branch.id);
          }
        }
      }
    } catch (err) {
      console.warn(
        "[menu] resolveGroupFamily failed:",
        chatId,
        err instanceof Error ? err.message : err,
      );
    }

    return {
      chatIds: [...chatIds],
      parentChatId,
      branchChatIds,
    };
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
      this.sessions.getActiveSessionId(chatId),
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
   * Для групп и веток — отдельное меню на каждый chatId в семействе (родитель + все ветки).
   */
  async publishForChat(
    chatId: string,
    chatType?: string | null,
    force = false,
  ): Promise<boolean> {
    if (!chatId) return false;

    let effectiveType = this.resolveChatType(chatId, chatType);
    if (!effectiveType) {
      try {
        const info = await this.api.getChatInfo({ chatId });
        if (info.success && info.chatType) {
          effectiveType = info.chatType;
          this.rememberChatType(chatId, effectiveType);
        }
      } catch {
        /* direct chat or API unavailable */
      }
    } else {
      this.rememberChatType(chatId, effectiveType);
    }

    if (this.isGroupChat(chatId, effectiveType)) {
      const scope = await this.resolveGroupFamily(chatId);
      let any = false;
      for (const familyChatId of scope.chatIds) {
        const type = this.chatTypeForFamilyMember(familyChatId, scope, effectiveType);
        this.rememberChatType(familyChatId, type);
        const published = await this.publishForChatSingle(familyChatId, type, force);
        if (published) any = true;
      }
      return any;
    }

    return await this.publishForChatSingle(chatId, effectiveType, force);
  }

  private async publishForChatSingle(
    chatId: string,
    chatType?: string | null,
    force = false,
  ): Promise<boolean> {
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

    let effectiveType = this.resolveChatType(chatId, chatType);
    if (!effectiveType) {
      try {
        const info = await this.api.getChatInfo({ chatId });
        if (info.success && info.chatType) {
          effectiveType = info.chatType;
        }
      } catch {
        /* ignore */
      }
    }
    if (effectiveType) this.rememberChatType(chatId, effectiveType);

    if (this.isGroupChat(chatId, effectiveType)) {
      await this.publishForChat(chatId, effectiveType, force);
      return;
    }

    if (!force && this.syncedChats.has(chatId)) return;
    await this.publishForChat(chatId, effectiveType, force);
  }

  invalidateChat(chatId: string): void {
    this.syncedChats.delete(chatId);
    this.publishedFingerprints.delete(chatId);
    this.chatTypes.delete(chatId);
  }

  /** Перепубликует меню для всех известных чатов (после перезапуска бота). */
  async publishAllKnownChats(chatIds: string[], force = true): Promise<void> {
    const seenFamilies = new Set<string>();
    for (const chatId of chatIds) {
      if (!chatId) continue;
      const chatType = this.chatTypes.get(chatId);
      if (this.isGroupChat(chatId, chatType)) {
        const scope = await this.resolveGroupFamily(chatId);
        const familyKey = scope.parentChatId ?? chatId;
        if (seenFamilies.has(familyKey)) continue;
        seenFamilies.add(familyKey);
        await this.publishForChat(chatId, chatType, force);
      } else {
        await this.publishForChat(chatId, chatType, force);
      }
    }
  }
}
