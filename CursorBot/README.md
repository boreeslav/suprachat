# CursorBot — AI-бот SuperMessenger на Cursor Agent SDK

Бот подключается к [SuperMessenger Bot API](../docs/07-bot-api.md) и отвечает через **Cursor Agent** (локально или в облаке).

## Возможности

- Полный Bot API: REST (`me`, `sendMessage`, `getMessages`) + WebSocket `/ws/bot`
- Автопереподключение и догрузка пропущенных сообщений (`afterMessageId`)
- Личные чаты, группы и каналы (при наличии прав у бота)
- Отдельная сессия Cursor Agent на каждый `chatId`
- Команды: `/help`, `/new`, `/project`, `/mode agent|ask`, `/model auto|pro|<id>`, `/status`, `/actions`
- Меню бота: проект, режим, модель, действия (обновляется онлайн)
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
| `BOT_CONFIG` | Путь к JSON-конфигу проектов и доступа (по умолчанию `./data/bot-config.json`; шаблон — `bot-config.example.json`) |

Проекты и персонализация задаются в JSON-конфиге:

```bash
cp bot-config.example.json data/bot-config.json
cp actions.example.json data/actions.json   # опционально
xcopy /E /I scripts\actions.example scripts\actions   # скрипты для type=script (Windows)
# отредактируйте data/bot-config.json и data/actions.json
```

```json
{
  "allowedUsers": ["your_login"],
  "defaultProjectId": "super-messenger",
  "projects": [
    { "id": "super-messenger", "name": "SuperMessenger", "path": ".." }
  ]
}
```

- `allowedUsers` — массив **логинов** (без `@`), не отображаемых имён; пустой массив — доступ для всех
- Рабочий файл по умолчанию — `data/bot-config.json` (не коммитится; в репозитории только `bot-config.example.json`)
- `projects` — список папок; переключение через меню «Проект» или `/project <id>`

Рабочие конфиги и скрипты действий **не коммитятся**: `data/`, `actions.json`, `scripts/actions/`. В репозитории — только шаблоны `*.example.json` и `scripts/actions.example/`.

### Каталог действий (`actions.json`)

Рядом с `bot-config.json` (в той же папке) лежит `actions.json` — список кнопок-действий. Шаблон: `actions.example.json`. Файл перечитывается при каждом открытии каталога и при запуске действия.

Меню бота → **Действия** или команда `/actions` — сообщение с кнопками. Скриптовые действия выполняются без агента; для `type: "agent"` нужна активная сессия.

Управление каталогом через чат (кнопки внизу списка):
- **Добавить действие** — опишите задачу, агент создаст запись в `actions.json` (в отдельной сессии)
- **Редактировать** / **Удалить** — выбор действия и описание изменений
- `/cancel` — отмена ввода описания

Пример:

```json
{
  "actions": [
    {
      "id": "screenshot",
      "title": "Скриншот рабочего стола",
      "type": "script",
      "command": "node",
      "args": ["scripts/actions/screenshot.mjs"]
    },
    {
      "id": "summarize",
      "title": "Краткое резюме",
      "type": "agent",
      "mode": "ask",
      "prompt": "Кратко опиши состояние проекта."
    }
  ]
}
```

Скрипт может вывести текст в stdout или JSON в последней строке: `{"text":"...", "photo":"path/to.png", "caption":"..."}`. Агент может добавлять и менять действия, редактируя `actions.json`.

| `CURSOR_REPO_URL` | GitHub URL (для cloud) |
| `CURSOR_CWD` | *(устарело)* — используйте `bot-config.json` |

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

## Автозапуск и устойчивость

Бот супервизируется `scripts/watchdog.ps1`: при ненулевом коде выхода он поднимает процесс
заново. Чтобы бот **не лежал насовсем** после случайного прерывания, на сигнал завершения
(Ctrl+C, закрытие окна консоли, logoff) бот выходит кодом `42` («перезапустить»), а не `0`.

**Штатная остановка** (чтобы watchdog НЕ перезапускал):

```bat
stop.cmd
```

Создаёт маркер `data/watchdog.stop` и гасит watchdog + процесс бота. Пока маркер существует,
watchdog не перезапускает бот; автозапуск удалит маркер и поднимет бот при следующем входе.

**Автозапуск при входе в систему** (переживает перезагрузку, не зависит от окна консоли):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-autostart.ps1          # зарегистрировать
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-autostart.ps1 -Start    # и сразу запустить
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\uninstall-autostart.ps1         # удалить автозапуск
```

Регистрирует Scheduled Task `CursorBot Watchdog` (триггер — вход пользователя, автоперезапуск
при сбое, скрытое окно). Прав администратора не требует. Ограничение: при выходе из системы
(logoff) бот останавливается и поднимается при следующем входе.

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
