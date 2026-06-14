import type { SessionRegistry } from "./session-registry.js";
import { SESSION_CMD_PREFIX } from "./session-keys.js";
import type { BotApiMenuItemDto, BotMessageButtonDto } from "./supra-bot-api.js";

export function buildSessionSubmenuItems(
  registry: SessionRegistry,
  chatId: string,
): BotApiMenuItemDto[] {
  const activeId = registry.getActiveSessionId(chatId);
  const items: BotApiMenuItemDto[] = [];

  for (const sessionId of registry.listSessionIds(chatId)) {
    const sessionKey = `${chatId}::${sessionId}`;
    const marks: string[] = [];
    if (sessionId === activeId) marks.push("✓");
    if (registry.isBusy(sessionKey)) marks.push("⚙");
    const prefix = marks.length ? `${marks.join(" ")} ` : "";
    items.push({
      id: `sess-${sessionId}`,
      text: `${prefix}${registry.sessionTitle(sessionId)}`,
      message: `${SESSION_CMD_PREFIX}${sessionId}`,
    });
  }

  if (activeId) {
    items.push({
      id: "sess-end",
      text: "Завершить сессию",
      message: `${SESSION_CMD_PREFIX}end`,
    });
  }

  items.push({
    id: "sess-new",
    text: "➕ Новая",
    message: `${SESSION_CMD_PREFIX}new`,
  });

  return items;
}

export function buildSessionPickerText(registry: SessionRegistry, chatId: string): string {
  const activeId = registry.getActiveSessionId(chatId);
  if (!activeId) {
    const others = registry.listSessionIds(chatId);
    if (!others.length) {
      return "Нет активной сессии.\nСоздайте новую сессию:";
    }
    return "Нет активной сессии.\nВыберите сессию из списка или создайте новую:";
  }
  const activeTitle = registry.sessionTitle(activeId);
  return `Сессии агента\nАктивна: ${activeTitle}\nВыберите сессию или создайте новую:`;
}

export function buildSessionPickerButtons(registry: SessionRegistry, chatId: string): BotMessageButtonDto[] {
  const activeId = registry.getActiveSessionId(chatId);
  const buttons: BotMessageButtonDto[] = [];

  for (const sessionId of registry.listSessionIds(chatId)) {
    const sessionKey = `${chatId}::${sessionId}`;
    const marks: string[] = [];
    if (sessionId === activeId) marks.push("✓");
    if (registry.isBusy(sessionKey)) marks.push("⚙️");
    const prefix = marks.length ? `${marks.join(" ")} ` : "";
    buttons.push({
      id: `sess-${sessionId}`,
      text: `${prefix}${registry.sessionTitle(sessionId)}`,
      action: `${SESSION_CMD_PREFIX}${sessionId}`,
      color: sessionId === activeId ? "primary" : "default",
    });
  }

  buttons.push({
    id: "sess-new",
    text: "➕ Новая сессия",
    action: `${SESSION_CMD_PREFIX}new`,
    color: "success",
  });

  return buttons;
}
