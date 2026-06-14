import type { SupraBotApi } from "./supra-bot-api.js";
import { buildAssistantMenuDto, type AssistantConfig } from "./assistant-config.js";

export class AssistantMenuManager {
  private globalPublished = false;

  constructor(
    private readonly api: SupraBotApi,
    private readonly config: AssistantConfig,
  ) {}

  async publishGlobal(force = false): Promise<void> {
    if (this.globalPublished && !force) return;
    try {
      const resp = await this.api.setAssistantMenu({ menu: buildAssistantMenuDto(this.config) });
      if (resp.success) {
        this.globalPublished = true;
        console.log("[assistant-menu] глобальное меню помощника опубликовано");
      } else {
        console.warn("[assistant-menu] setAssistantMenu:", resp.error);
      }
    } catch (err) {
      console.warn("[assistant-menu] publishGlobal failed:", err instanceof Error ? err.message : err);
    }
  }
}
