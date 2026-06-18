import type { CursorBotMode } from "./cursor-mode.js";
import { formatModeLabel } from "./cursor-mode.js";
import { SESSION_CMD_PREFIX } from "./session-keys.js";
import type { MenuModelItem } from "./model-catalog.js";
import type { MenuProjectItem } from "./project-catalog.js";
import type { BotApiMenuDto, BotApiMenuItemDto } from "./supra-bot-api.js";

function modeMenuItem(id: string, mode: CursorBotMode, activeMode: CursorBotMode): BotApiMenuItemDto {
  const active = mode === activeMode;
  return {
    id,
    text: active ? `${formatModeLabel(mode)} ✓` : formatModeLabel(mode),
    message: `/mode ${mode}`,
  };
}

function modelMenuItem(id: string, item: MenuModelItem, activeKey: string): BotApiMenuItemDto {
  const active = item.key === activeKey;
  return {
    id,
    text: active ? `${item.label} ✓` : item.label,
    message: `/model ${item.key}`,
  };
}

function projectMenuItem(id: string, item: MenuProjectItem, activeKey: string): BotApiMenuItemDto {
  const active = item.id.toLowerCase() === activeKey.toLowerCase();
  return {
    id,
    text: active ? `${item.name} ✓` : item.name,
    message: `/project ${item.id}`,
  };
}

export function buildBotMenu(
  activeMode: CursorBotMode = "agent",
  activeModel: string = "auto",
  modelItems: MenuModelItem[] = [],
  projectItems: MenuProjectItem[] = [],
  activeProject: string = "",
  sessionItems: BotApiMenuItemDto[] = [],
  activeSessionId: string | null = null,
): BotApiMenuDto {
  const items: BotApiMenuItemDto[] = [
    { id: "help", text: "Справка", message: "/help" },
  ];

  if (sessionItems.length > 0) {
    items.push({
      id: "sessions",
      text: "Сессии",
      submenu: sessionItems,
    });
  } else {
    items.push({ id: "sessions", text: "Сессии", message: "/sessions" });
  }

  if (activeSessionId) {
    items.push({
      id: "sess-stop",
      text: "Стоп",
      message: `${SESSION_CMD_PREFIX}stop`,
    });
  }

  if (projectItems.length > 0) {
    items.push({
      id: "project",
      text: "Проект",
      submenu: projectItems.map((item, index) =>
        projectMenuItem(`project-${index}`, item, activeProject),
      ),
    });
  }

  items.push(
    {
      id: "mode",
      text: "Режим",
      submenu: [
        modeMenuItem("mode-agent", "agent", activeMode),
        modeMenuItem("mode-ask", "ask", activeMode),
      ],
    },
    {
      id: "model",
      text: "Модель",
      submenu: modelItems.map((item, index) =>
        modelMenuItem(`model-${index}`, item, activeModel),
      ),
    },
    { id: "actions", text: "Действия", message: "/actions" },
    { id: "status", text: "Статус", message: "/status" },
  );

  return { items };
}

/** Глобальное меню по умолчанию (без отметки активных настроек). */
export function buildDefaultBotMenu(
  modelItems: MenuModelItem[] = [],
  projectItems: MenuProjectItem[] = [],
  defaultProjectId = "",
): BotApiMenuDto {
  return buildBotMenu("agent", "auto", modelItems, projectItems, defaultProjectId);
}
