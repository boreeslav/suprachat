import type { SessionRegistry } from "./session-registry.js";
import { SESSION_CMD_PREFIX, UI_CANCEL_CMD } from "./session-keys.js";
import type { BotApiMenuItemDto, BotMessageButtonDto } from "./supra-bot-api.js";

/**
 * Подменю «Сессии» в основном меню: только «Стоп» и «Завершить» для активной сессии.
 * Если активной сессии нет — пустой список (меню откроет пикер через /sessions),
 * где доступны список сессий и создание новой.
 */
export function buildSessionSubmenuItems(
  registry: SessionRegistry,
  chatId: string,
): BotApiMenuItemDto[] {
  const activeId = registry.getActiveSessionId(chatId);
  if (!activeId) return [];

  return [
    {
      id: "sess-stop",
      text: "Стоп",
      message: `${SESSION_CMD_PREFIX}stop`,
    },
    {
      id: "sess-end",
      text: "Завершить",
      message: `${SESSION_CMD_PREFIX}end`,
    },
  ];
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

  if (activeId) {
    buttons.push({
      id: "sess-stop",
      text: "Стоп",
      action: `${SESSION_CMD_PREFIX}stop`,
      color: "danger",
    });
    buttons.push({
      id: "sess-end",
      text: "Завершить",
      action: `${SESSION_CMD_PREFIX}end`,
      color: "secondary",
    });
  }

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

  buttons.push({
    id: "sess-cancel",
    text: "Отмена",
    action: UI_CANCEL_CMD,
    color: "default",
  });

  return buttons;
}
