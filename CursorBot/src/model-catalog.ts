import { Cursor, type ModelListItem, type ModelSelection } from "@cursor/sdk";

export const MODEL_PRESET_AUTO = "auto";
export const MODEL_PRESET_PRO = "pro";

const MENU_MODEL_KEYS = [
  MODEL_PRESET_AUTO,
  MODEL_PRESET_PRO,
  "composer-2.5",
  "claude-opus-4-8",
  "claude-sonnet-4-6",
  "gpt-5.4",
  "gpt-5.3-codex",
] as const;

export interface MenuModelItem {
  key: string;
  label: string;
}

export class ModelCatalog {
  private models: ModelListItem[] = [];
  private readonly byId = new Map<string, ModelListItem>();
  private readonly aliasToId = new Map<string, string>();
  private effectiveProModelId: string;

  constructor(
    private readonly apiKey: string,
    proModelId: string,
  ) {
    this.effectiveProModelId = proModelId;
  }

  async load(): Promise<void> {
    this.models = await Cursor.models.list({ apiKey: this.apiKey });
    this.byId.clear();
    this.aliasToId.clear();

    for (const model of this.models) {
      this.byId.set(model.id.toLowerCase(), model);
      this.aliasToId.set(model.id.toLowerCase(), model.id);
      for (const alias of model.aliases ?? []) {
        this.aliasToId.set(alias.toLowerCase(), model.id);
      }
    }

    if (!this.byId.has(this.effectiveProModelId.toLowerCase()) && this.models.length > 0) {
      const fallback =
        this.models.find((m) => m.id.includes("opus"))?.id ??
        this.models.find((m) => m.id.startsWith("claude-"))?.id ??
        this.models[1]?.id;
      if (fallback) {
        console.warn(
          `[model] CURSOR_PRO_MODEL=${this.effectiveProModelId} недоступна, используем ${fallback}`,
        );
        this.effectiveProModelId = fallback;
      }
    }
  }

  get defaultKey(): string {
    return MODEL_PRESET_AUTO;
  }

  normalizeKey(input: string | undefined): string | null {
    const raw = (input ?? "").trim().toLowerCase();
    if (!raw) return null;

    if (raw === MODEL_PRESET_AUTO || raw === "default") return MODEL_PRESET_AUTO;
    if (raw === MODEL_PRESET_PRO || raw === "premium") return MODEL_PRESET_PRO;

    if (this.aliasToId.has(raw)) return this.aliasToId.get(raw)!;
    if (this.byId.has(raw)) return this.byId.get(raw)!.id;

    return null;
  }

  resolveSelection(key: string): ModelSelection | null {
    const norm = this.normalizeKey(key);
    if (!norm) return null;

    if (norm === MODEL_PRESET_AUTO) return { id: "default" };
    if (norm === MODEL_PRESET_PRO) return { id: this.effectiveProModelId };

    return { id: norm };
  }

  formatLabel(key: string): string {
    const norm = this.normalizeKey(key) ?? key;

    if (norm === MODEL_PRESET_AUTO) return "Auto";
    if (norm === MODEL_PRESET_PRO) {
      const pro = this.byId.get(this.effectiveProModelId.toLowerCase());
      return pro ? `Pro (${pro.displayName})` : "Pro (Premium)";
    }

    const model = this.byId.get(norm.toLowerCase());
    return model?.displayName ?? norm;
  }

  getMenuModels(): MenuModelItem[] {
    const items: MenuModelItem[] = [];
    const seen = new Set<string>();

    for (const key of MENU_MODEL_KEYS) {
      const norm = this.normalizeKey(key);
      if (!norm || seen.has(norm)) continue;
      if (norm !== MODEL_PRESET_AUTO && norm !== MODEL_PRESET_PRO && !this.byId.has(norm.toLowerCase())) {
        continue;
      }
      seen.add(norm);
      items.push({ key: norm, label: this.formatLabel(norm) });
    }

    if (items.length === 0) {
      items.push({ key: MODEL_PRESET_AUTO, label: "Auto" });
    }
    return items;
  }

  listAvailableLabels(max = 12): string[] {
    return this.getMenuModels()
      .slice(0, max)
      .map((m) => `${m.key} — ${m.label}`);
  }
}
