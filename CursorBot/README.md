# CursorBot — AI-бот SuperMessenger на Cursor Agent SDK

Бот подключается к [SuperMessenger Bot API](https://github.com/your-org/SuperMessenger/blob/main/docs/07-bot-api.md) и отвечает через **Cursor Agent** (локально или в облаке).

## Возможности

- Полный Bot API: REST (`me`, `sendMessage`, `getMessages`) + WebSocket `/ws/bot`
- Автопереподключение и догрузка пропущенных сообщений (`afterMessageId`)
- Личные чаты, группы и каналы (при наличии прав у бота)
- Отдельная сессия Cursor Agent на каждый `chatId`
- Команды: `/help`, `/new`, `/project`, `/mode agent|ask`, `/model auto|pro|<id>`, `/status`
- Меню бота: проект, режим, модель (обновляется онлайн)
- Сохранение `lastInboxId`, `agentId`, `projectId` и незавершённых run между перезапусками

## Подготовка в SuperMessenger

1. Создайте бота в UI: **Мои боты** → создать.
2. Сгенерируйте API-токен в настройках бота.
3. Пользователи начинают диалог через `/start` (для личных чатов).
4. Добавьте бота в группу или назначьте роль в канале (`admin` / `author`).

## Установка

```bash
cd CursorBot
npm install
cp .env.example .env
# отредактируйте .env
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `SUPRA_BASE_URL` | URL сервера SuperMessenger |
| `SUPRA_BOT_LOGIN` | Slug бота, например `cursor_bot` |
| `SUPRA_BOT_TOKEN` | API-токен бота |
| `CURSOR_API_KEY` | Ключ из [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations) |
| `CURSOR_DEFAULT_MODEL` | Модель по умолчанию для новых чатов: `auto`, `pro` или id модели |
| `CURSOR_PRO_MODEL` | Модель для пресета Pro (Premium), по умолчанию `claude-opus-4-8` |
| `CURSOR_MODEL` | Устаревший алиас для `CURSOR_DEFAULT_MODEL` |
| `CURSOR_RUNTIME` | `cloud` или `local` |
| `BOT_CONFIG` | Путь к JSON-конфигу проектов и доступа (по умолчанию `./data/bot-config.json`) |

Проекты и персонализация задаются в **`data/bot-config.json`**:

```json
{
  "allowedUser": "your_login",
  "defaultProjectId": "super-messenger",
  "projects": [
    { "id": "super-messenger", "name": "SuperMessenger", "path": ".." }
  ]
}
```

- `allowedUser` — единственный пользователь (логин без `@`); пусто — доступ для всех
- `projects` — список папок; переключение через меню «Проект» или `/project <id>`

| `CURSOR_REPO_URL` | GitHub URL (для cloud) |
| `CURSOR_CWD` | *(устарело)* — используйте `data/bot-config.json` |

## Запуск

**Windows (рекомендуется):** двойной клик или из консоли:

```bat
run.cmd
```

Скрипт сам установит зависимости при необходимости, пересоберёт проект если изменились `src/`, и **автоматически перезапустит** бота после сбоя.

```bash
npm start
```

Разработка с автоперезагрузкой:

```bash
npm run dev
```

## Архитектура

```
SuperMessenger WS/REST  →  SupraBotApi  →  MessageHandler  →  CursorBridge  →  @cursor/sdk
                                              ↓
                                         StateStore (data/state.json)
```

## Ограничения

- Боты SuperMessenger работают только с **незашифрованными** сообщениями.
- Inbox хранится на сервере **1 сутки**.
- Cloud Agent: один активный run на агента (очередь по `chatId` в боте).
- Длинные ответы разбиваются на части (`SUPRA_MAX_MESSAGE_CHARS`, по умолчанию 8000).

## Связанные документы

- SuperMessenger: `docs/07-bot-api.md`
- Cursor SDK: https://cursor.com/docs/sdk/typescript
- Cloud Agents API: https://cursor.com/docs/cloud-agent/api/endpoints
