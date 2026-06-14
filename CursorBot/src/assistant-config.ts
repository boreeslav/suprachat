import type { BotApiMenuDto, BotApiMenuItemDto } from "./supra-bot-api.js";

export type AssistantContentType = "text" | "photo" | "collage" | "file";
export type AssistantCursorMode = "ask" | "agent";

export interface AssistantActionConfig {
  mode: AssistantCursorMode;
  prompt: string;
  replyPrefix?: string;
}

export interface AssistantContentTypeConfig {
  label?: string;
  hint?: string;
}

export interface AssistantMenuItemConfig {
  id: string;
  text: string;
  action: string;
  /** Для каких типов контента показывать пункт (пусто — для всех). */
  for?: AssistantContentType[];
  submenu?: AssistantMenuItemConfig[];
}

export interface AssistantConfigFile {
  actions?: Record<string, AssistantActionConfig>;
  contentTypes?: Partial<Record<AssistantContentType, AssistantContentTypeConfig>>;
  menu?: { items?: AssistantMenuItemConfig[] };
}

export interface AssistantConfig {
  actions: Record<string, AssistantActionConfig>;
  contentTypes: Record<AssistantContentType, AssistantContentTypeConfig>;
  menu: { items: AssistantMenuItemConfig[] };
}

const DEFAULT_ACTIONS: Record<string, AssistantActionConfig> = {
  describe: {
    mode: "ask",
    prompt:
      "Кратко опиши, что в сообщении(ях): тип контента (текст, одна картинка, несколько картинок, файл), суть текста.",
    replyPrefix: "📋 ",
  },
  reply: {
    mode: "agent",
    prompt:
      "Подготовь ответ, который пользователь сможет вставить обратно в исходный чат. Ответ должен быть готов к отправке как есть.",
    replyPrefix: "",
  },
};

const DEFAULT_CONTENT_TYPES: Record<AssistantContentType, AssistantContentTypeConfig> = {
  text: { label: "текст", hint: "Текстовое сообщение" },
  photo: { label: "фото", hint: "Одно изображение" },
  collage: { label: "коллаж", hint: "Несколько изображений" },
  file: { label: "файл", hint: "Файловое вложение" },
};

const DEFAULT_MENU_ITEMS: AssistantMenuItemConfig[] = [
  { id: "describe_ask", text: "Описать (ask)", action: "describe", for: ["text", "photo", "collage", "file"] },
  { id: "reply_auto", text: "Ответить в чат (auto)", action: "reply", for: ["text"] },
];

export const DEFAULT_ASSISTANT_CONFIG: AssistantConfig = {
  actions: DEFAULT_ACTIONS,
  contentTypes: DEFAULT_CONTENT_TYPES,
  menu: { items: DEFAULT_MENU_ITEMS },
};

function normalizeMenuItems(items: AssistantMenuItemConfig[] | undefined): AssistantMenuItemConfig[] {
  const source = items?.length ? items : DEFAULT_MENU_ITEMS;
  const result: AssistantMenuItemConfig[] = [];
  for (const raw of source) {
    const id = (raw.id ?? "").trim();
    const text = (raw.text ?? "").trim();
    const action = (raw.action ?? "").trim();
    if (!id || !text) continue;
    const submenu = raw.submenu?.length ? normalizeMenuItems(raw.submenu) : undefined;
    if (submenu?.length) {
      result.push({ id, text, action: action || id, submenu });
      continue;
    }
    if (!action) continue;
    const forTypes = Array.isArray(raw.for)
      ? raw.for.map((t) => String(t).trim().toLowerCase()).filter(isAssistantContentType)
      : undefined;
    result.push({ id, text, action, for: forTypes?.length ? forTypes : undefined });
  }
  return result.length ? result : DEFAULT_MENU_ITEMS;
}

function isAssistantContentType(value: string): value is AssistantContentType {
  return value === "text" || value === "photo" || value === "collage" || value === "file";
}

export function mergeAssistantConfig(raw?: AssistantConfigFile | null): AssistantConfig {
  const actions: Record<string, AssistantActionConfig> = { ...DEFAULT_ACTIONS };
  for (const [key, value] of Object.entries(raw?.actions ?? {})) {
    const id = key.trim();
    if (!id || !value) continue;
    const mode = value.mode === "ask" ? "ask" : "agent";
    const prompt = (value.prompt ?? "").trim();
    if (!prompt) continue;
    actions[id] = {
      mode,
      prompt,
      replyPrefix: value.replyPrefix ?? actions[id]?.replyPrefix ?? "",
    };
  }

  const contentTypes = { ...DEFAULT_CONTENT_TYPES };
  for (const key of ["text", "photo", "collage", "file"] as const) {
    const patch = raw?.contentTypes?.[key];
    if (!patch) continue;
    contentTypes[key] = {
      label: patch.label?.trim() || contentTypes[key].label,
      hint: patch.hint?.trim() || contentTypes[key].hint,
    };
  }

  return {
    actions,
    contentTypes,
    menu: { items: normalizeMenuItems(raw?.menu?.items) },
  };
}

export function encodeAssistantMenuMessage(item: AssistantMenuItemConfig): string {
  const action = (item.action || "").trim();
  const suffix = item.for?.length ? `@${item.for.join(",")}` : "";
  return `assistant:${action}${suffix}`;
}

function menuItemToDto(item: AssistantMenuItemConfig): BotApiMenuItemDto | null {
  const text = item.text.trim();
  const id = item.id.trim();
  if (!text || !id) return null;
  if (item.submenu?.length) {
    const submenu = item.submenu.map(menuItemToDto).filter(Boolean) as BotApiMenuItemDto[];
    if (!submenu.length) return null;
    return { id, text, submenu };
  }
  const action = item.action.trim();
  if (!action) return null;
  return {
    id,
    text,
    message: encodeAssistantMenuMessage(item),
  };
}

export function buildAssistantMenuDto(config: AssistantConfig): BotApiMenuDto {
  const items = config.menu.items.map(menuItemToDto).filter(Boolean) as BotApiMenuItemDto[];
  return { items };
}

export interface ParsedAssistantCommand {
  action: string;
  contentTypes: AssistantContentType[] | null;
}

export function parseAssistantCommand(command: string, config: AssistantConfig): ParsedAssistantCommand & {
  mode: AssistantCursorMode;
  actionConfig: AssistantActionConfig;
} {
  const norm = (command || "").trim();
  const match = norm.match(/^assistant:([^@]+)(?:@([\w,]+))?$/i);
  const actionKey = (match?.[1] ?? norm.replace(/^assistant:/i, "").split("@")[0] ?? "reply").trim().toLowerCase();
  const typesRaw = match?.[2] ?? "";
  const contentTypes = typesRaw
    ? typesRaw.split(",").map((t) => t.trim().toLowerCase()).filter(isAssistantContentType)
    : null;

  const actionConfig = config.actions[actionKey] ?? config.actions.reply ?? DEFAULT_ACTIONS.reply;
  return {
    action: actionKey,
    contentTypes: contentTypes?.length ? contentTypes : null,
    mode: actionConfig.mode,
    actionConfig,
  };
}

export function detectAssistantContentType(text: string): AssistantContentType {
  const t = (text || "").trim();
  if (t.includes('type="photo_album"')) return "collage";
  if (t.includes('type="image"')) return "photo";
  if (t.includes('type="file"')) return "file";
  return "text";
}

export function detectPrimaryContentTypes(messages: Array<{ text?: string | null }>): Set<AssistantContentType> {
  const types = new Set<AssistantContentType>();
  for (const msg of messages) {
    types.add(detectAssistantContentType(msg.text || ""));
  }
  if (!types.size) types.add("text");
  return types;
}

export function menuItemSupportsContentTypes(
  itemTypes: AssistantContentType[] | null | undefined,
  selected: Set<AssistantContentType>,
): boolean {
  if (!itemTypes?.length) return true;
  for (const t of selected) {
    if (!itemTypes.includes(t)) return false;
  }
  return true;
}
