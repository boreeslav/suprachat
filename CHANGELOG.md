# История изменений

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).  
Версионирование: `major.minor.patch` (см. `deploy/release.json`).

## [1.2.56] — 2026-06-26

### Добавлено

- **Закреплённые сообщения** — глобальные (`scope=all`, модераторы) и личные (`scope=self`); API `GetPinnedMessages`, `PinMessage`, `UnpinMessage`; поле `pinnedMessages` в `SyncChatPanel`; WS `SupraMessagePinned` / `SupraMessageUnpinned`. Документация: [docs/11-pinned-messages.md](docs/11-pinned-messages.md).
- **Copy-тег markdown** `[copy]…[/copy]` — клик копирует текст, серый фон, без выделения сообщения. Документация: [docs/10-message-markup.md](docs/10-message-markup.md).
- **Основная ветка группы** в списке веток (`isMain`, `mainBranchName`, `mainBranchOrder`); переименование и сортировка через `UpdateGroupBranch` / `ReorderGroupBranches`.
- Скрипты деплоя: `deploy-all.ps1`, `setup-new-server.ps1`, `restore-data.ps1`; в `deploy.ps1` — `-SkipBuild`, host key из конфига, retry HTTP-проверок.

### Изменено

- Документация: разделы по разметке, закрепам, веткам, деплою.

## [1.2.0] — 2026-06-15

### Добавлено

- **Каналы** — создание, подписка, роли (owner/admin/author/subscriber), публичный просмотр по slug.
- **Ветки групп** (`group_branch`) — подчаты внутри группы с собственным URL.
- **Боты** — создание ботов, Bot API (REST `/api/bot-api/*` + WebSocket `/ws/bot`), режим ассистента.
- **Редактирование, удаление и пересылка** сообщений.
- **Блокировки** пользователей и групп.
- **PWA и push-уведомления** — manifest, Service Worker, VAPID, per-chat mute.
- **Админка брендинга** — логотип, иконки PWA, тема, звуки, HTML-контент (about/help/changelog).
- Публичные API каналов: `/api/public/channel/{slug}`.
- `CursorBot/` — пример интеграции с Cursor Agent SDK.

### Изменено

- `SupraMessengerService` разбит на partial-классы (Messages, Channels, Bots, Sync и др.).
- Расширен Admin API (appearance, push-diagnostics).
- Документация актуализирована по всем модулям проекта.

## [1.1.109] — 2026-06-08

### Добавлено

- **RequestSync** — единый бандл синхронизации (`POST /api/messenger/RequestSync`): список чатов, новые сообщения по курсорам из IndexedDB, профили direct-контактов, ключи шифрования.
- **SupraSyncHint** — при подключении к SignalR сервер подсказывает клиенту выполнить синхронизацию.
- Серверные сервисы `MessengerSyncService`, `SupraMessengerService.Sync` и пакетное чтение данных (`GetAllMessagesAsync`, `GetAllParticipantsAsync`, `GetAllChatMemberKeysAsync`).
- Клиент: `requestSyncBundle`, кеш профилей и ключей из бандла, дебаунс повторной синхронизации.
- Документация [docs/06-network-sync.md](docs/06-network-sync.md) — полное описание сетевой логики.

### Изменено

- **GetChats** на сервере собирается за одно чтение JSON-файлов вместо N проходов по сообщениям каждого чата.
- При загрузке и переподключении вместо цепочки `GetChats` + N×`GetMessages` выполняется один **RequestSync**.
- Открытие чата: убраны лишние `GetChats`, `GET /api/profile/{id}`; превью в списке берётся из локального кеша.
- **MarkMessagesRead** не отправляется при повторном открытии уже прочитанного чата (без badge).
- Расшифровка превью в sidebar не затирает текст на 🔒, пока ключи ещё не готовы.

### Исправлено

- Прочтение не уходило на сервер, пока чат открыт и приходят новые сообщения — у отправителя не обновлялся статус «прочитано».
- После выхода из приложения и возврата снова появлялся badge непрочитанных при открытом чате.
- Синхронизация при `setChats` снова помечает открытый видимый чат для отправки прочтения, если сервер ещё считает сообщения непрочитанными.

## [1.1.106] — 2026-06-08

### Добавлено

- Персональная настройка фона чата (`useThemeChatBg`), хранение в `MessengerUserPreferencesStore`.
- WebSocket-событие `SupraAppearanceUpdated` при изменении темы/брендинга в админке.
- Кеширование обоев чата по имени файла (`?f=` + `?r=` для immutable cache).

### Изменено

- Улучшения UI мессенджера и админки брендинга.
