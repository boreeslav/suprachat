import { existsSync, readFileSync } from "node:fs";

export type ActionMgmtTask = "add" | "edit" | "delete";

export interface ActionMgmtPromptParams {
  task: ActionMgmtTask;
  actionsFilePath: string;
  botRoot: string;
  userDescription: string;
  actionId?: string;
  actionTitle?: string;
}

const RULES = `Правила каталога действий (actions.json):

Структура файла:
{
  "actions": [
    {
      "id": "unique-id",
      "title": "Название на кнопке",
      "type": "script",
      "command": "node",
      "args": ["scripts/actions/example.mjs"],
      "cwd": "опционально",
      "timeoutMs": 120000,
      "env": { "KEY": "value" }
    },
    {
      "id": "ask-something",
      "title": "Спросить агента",
      "type": "agent",
      "mode": "ask",
      "prompt": "Текст запроса агенту при нажатии кнопки",
      "replyPrefix": "опциональный префикс ответа"
    }
  ]
}

Обязательные поля:
- id — латиница, цифры, дефис, подчёркивание; НЕ начинать с «_» (зарезервировано)
- title — короткий текст кнопки в чате
- type — «script» (без ИИ) или «agent» (через Cursor-агента, нужна сессия)

Для type=script:
- command и args обязательны
- Пути в args относительно корня CursorBot: ${"{CURSOR_BOT_ROOT}"}
- stdout → текст ответа в чат
- Последняя строка stdout может быть JSON: {"text":"...", "photo":"путь/к/файлу.png", "caption":"..."}
- Пример скриншота: scripts/actions.example/screenshot.mjs (скопируйте в scripts/actions/)

Для type=agent:
- prompt обязателен; mode: «ask» или «agent»

При редактировании сохраняй остальные действия без лишних изменений.
Файл должен оставаться валидным JSON с отступами в 2 пробела.`;

function readActionsJsonSnippet(filePath: string): string {
  if (!existsSync(filePath)) return '(файл ещё не существует — создайте с {"actions":[]})';
  try {
    const raw = readFileSync(filePath, "utf8");
    return raw.trim() || '{"actions":[]}';
  } catch {
    return "(не удалось прочитать файл)";
  }
}

export function buildActionMgmtPrompt(params: ActionMgmtPromptParams): string {
  const currentJson = readActionsJsonSnippet(params.actionsFilePath);
  const taskLines: Record<ActionMgmtTask, string> = {
    add: "Добавь новое действие в каталог по описанию пользователя.",
    edit: `Измени действие «${params.actionTitle ?? params.actionId}» (id: ${params.actionId}).`,
    delete: `Удали действие «${params.actionTitle ?? params.actionId}» (id: ${params.actionId}) из каталога.`,
  };

  return [
    "Ты настраиваешь каталог кнопок-действий CursorBot в SuperMessenger.",
    "",
    RULES.replace("${CURSOR_BOT_ROOT}", params.botRoot),
    "",
    `Файл для редактирования: ${params.actionsFilePath}`,
    `Корень CursorBot: ${params.botRoot}`,
    "",
    "Текущее содержимое actions.json:",
    "```json",
    currentJson,
    "```",
    "",
    `Задача: ${taskLines[params.task]}`,
    "",
    "Описание от пользователя:",
    params.userDescription.trim(),
    "",
    "Отредактируй файл actions.json. Создай вспомогательные скрипты в scripts/actions/ при необходимости.",
    "В ответе пользователю кратко опиши, что сделано (какое действие добавлено/изменено/удалено).",
  ].join("\n");
}
