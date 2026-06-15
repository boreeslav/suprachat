# Архитектура и реализация

## Обзор слоёв

```
┌─────────────────────────────────────────────────────────┐
│  Browser: supra-messenger.js + supra-integration.js     │
│  (UI, MessengerApiClient, MessengerTransport, Cache)    │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP + SignalR (cookie auth)
┌──────────────────────────▼──────────────────────────────┐
│  SuperMessenger.Web                                       │
│  Controllers, Hubs, Middleware, Services (~40 сервисов)   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  SuperMessenger.Infrastructure                            │
│  SupraMessengerService, BotApiService, FileDataStore      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  SuperMessenger.Core                                      │
│  Entities, DTOs, IDataStore                               │
└───────────────────────────────────────────────────────────┘
```

## Проекты решения

| Проект | Ответственность |
|--------|----------------|
| **Core** | `UserRecord`, `SupraChatRecord`, `InvitationRecord`, DTO Supra*, интерфейс `IDataStore` |
| **Infrastructure** | `FileDataStore`, `JsonFileCollectionStore`, `SupraMessengerService` (partial), `BotApiService`, `SupraEncryptionService` |
| **Web** | ASP.NET Core 8, cookie authentication, 14 controllers, SignalR hub, middleware, static wwwroot |

Отдельного `.sln` нет — проекты собираются через `SuperMessenger.Web.csproj`.

## Хранение данных

Реализация: `FileDataStore` → JSON-файлы в `data/` (настраивается `Data:Root` в `appsettings.json`).

Типичные файлы:

- `users.json`, `invitations.json`
- `chats.json`, `participants.json`, `messages.json`
- `folders.json`, `folder_members.json`
- `bots.json`, `bot-tokens.json`, `bot-inbox.json`
- `chat-member-keys.json` (E2EE)
- `push-subscriptions.json`, `push-preferences.json`
- `files.json` + бинарные файлы в `data/uploads/`, аватары в `data/avatars/`
- `appearance.json` (брендинг)
- `dpkeys/` — ключи ASP.NET Data Protection

Замена на БД: реализовать `IDataStore` и зарегистрировать в DI вместо `FileDataStore`.

## Доменная модель

### UserRecord

- Идентификация: `Id`, `Login`, `PasswordHash`, `DisplayName`
- `Type`: User | Admin | Bot
- Профиль: `Email`, `Phone`, `AvatarPath`, `StatusText`, `AboutText`
- Приватность: `SearchableByLogin`, `SearchableByName`, `AllowInvite`, `ShowOnlineStatus`, `AllowWrite`
- E2EE: `EncryptionPublicKey`, `EncryptionPrivateKeyEnc`, `MasterPasswordSalt`
- `LastSeenAt`, `IsActive`

### SupraChatRecord

- `Id`, `Name`, `Type` (`direct` | `group` | `public_group` | `channel` | `group_branch`)
- `CreatorUserId`, `AvatarPath`, `AllowJoinByLink`
- Для каналов: `Slug`, `DeletedAt` (мягкое удаление)
- Для веток: `ParentChatId`, `BranchSlug`, `BranchOrder`

### Участники и сообщения

- `SupraChatParticipantRecord`: `ChatId`, `UserId`, `IsAdmin`, роль в канале
- `SupraChatMessageRecord`: текст (`E1:` на сервере), `SenderUserId`, `Status`, `CreatedOn`, `EditedAt`
- Папки: `SupraChatFolderRecord`, `SupraChatFolderMemberRecord` (`IsArchive` для архива)

## SupraMessengerService

Центральный сервис бизнес-логики, разбит на partial-классы:

| Файл | Ответственность |
|------|-----------------|
| `SupraMessengerService.cs` | Базовые чаты, контакты, папки, группы |
| `SupraMessengerService.Messages.cs` | Сообщения, edit/delete/forward |
| `SupraMessengerService.Sync.cs` | RequestSync, SyncChatPanel |
| `SupraMessengerService.Channels.cs` | Каналы |
| `SupraMessengerService.GroupBranches.cs` | Ветки групп |
| `SupraMessengerService.Bots.cs` | Боты, токены |
| `SupraMessengerService.Assistant.cs` | Режим ассистента |
| `SupraMessengerService.Blocking.cs` | Блокировки |
| `SupraMessengerService.Batch.cs` | BatchRequest |
| `SupraMessengerService.GroupBotMenu.cs` | Inline-меню ботов |

Основные группы методов:

| Группа | Методы |
|--------|--------|
| Пользователь | `GetCurrentUserAsync` |
| Чаты | `GetChatsAsync`, `RequestSyncAsync`, `CreateDirectChatAsync`, `CreateGroupAsync`, … |
| Сообщения | `GetMessagesAsync`, `SendMessageAsync`, `EditMessageAsync`, `DeleteMessageAsync`, `ForwardMessageAsync`, … |
| Каналы | `CreateChannelAsync`, `SubscribeChannelAsync`, `GetChannelInfoAsync`, … |
| Ветки | `CreateGroupBranchAsync`, `UpdateGroupBranchAsync`, `ReorderGroupBranchesAsync`, … |
| Боты | `CreateBotAsync`, `StartBotAsync`, `GenerateBotTokenAsync`, … |
| Папки | `GetFoldersAsync`, `SaveFolderAsync`, … |
| Группы | `GetGroupInfoAsync`, `UpdateGroupAsync`, … |

Проверки доступа: участник чата, админ группы, роль в канале, настройки `allowWrite` / `showOnlineStatus`.

Дополнительные сервисы Infrastructure:

- **`BotApiService`** — REST/WS Bot API
- **`SupraEncryptionService`** — E2EE на сервере
- **`ChatFileService`** — файлы и аватары

## Контроллеры Web

| Контроллер | Route | Auth |
|------------|-------|------|
| `AuthController` | `/api/auth` | login — anonymous |
| `ProfileController` | `/api/profile` | Authorize |
| `SupraMessengerController` | `/api/messenger/{method}` | Authorize |
| `GroupController` | `/api/group` | Authorize |
| `ChannelController` | `/api/channel` | Authorize |
| `BotController` | `/api/bot` | Authorize |
| `FilesController` | `/api/files` | частично AllowAnonymous |
| `PublicPreviewController` | `/api/public` | AllowAnonymous |
| `RegisterController` | `/api/register` | token endpoints |
| `AdminController` | `/api/admin` | Admin |
| `EncryptionController` | `/api/encryption` | Authorize |
| `AppController` | `/api/app` | частично AllowAnonymous |
| `PushController` | `/api/push` | Authorize |
| `BotApiController` | `/api/bot-api` | Bot token |

`SupraMessengerController.Invoke` — единая точка RPC-стиля: имя метода в URL, тело JSON, ответ `{ MethodNameResult: ... }`.

После мутаций контроллер вызывает `RealtimeNotifier` для рассылки WebSocket-payload участникам.

## Middleware

| Middleware | Назначение |
|------------|------------|
| `BotWebSocketMiddleware` | Upgrade `/ws/bot` для Bot API |
| `ProtectedStaticPageMiddleware` | Защита `/admin.html` |

## Фоновые сервисы (Hosted Services)

| Сервис | Назначение |
|--------|------------|
| `PresenceMonitorService` | Idle-таймаут → offline |
| `BotInboxCleanupService` | Очистка inbox ботов (старше 1 суток) |
| `ChatFileReferenceBootstrap` | Инициализация ссылок на файлы при старте |

## Realtime

### MessengerHub (`/hubs/messenger`)

- `OnConnectedAsync` / `OnDisconnectedAsync` — группа `user:{userId}`, presence, `LastSeenAt`
- При connect — `SupraSyncHint` (подсказка клиенту вызвать `RequestSync`)
- `ReportActivity()` — сброс idle → online для контактов с правом видеть статус
- `Heartbeat()` — keep-alive

### RealtimeNotifier

```csharp
SendToUserAsync(userId, payload)
// envelope: { Header: { BodyTypeName: "SupraMessenger" }, Body: payload }
```

### Типы payload (Body)

| Класс | Назначение |
|-------|------------|
| `SupraWsNewMessagePayload` | Новое сообщение |
| `SupraWsMessageEditedPayload` | Редактирование |
| `SupraWsMessageDeletedPayload` | Удаление |
| `SupraWsStatusPayload` | Статус прочтения |
| `SupraWsNewChatPayload` | Новый чат в списке |
| `SupraWsUserActivityPayload` | Печатает / запись голоса и т.д. |
| `SupraWsChatHistoryClearedPayload` | Очистка истории |
| `SupraWsPresencePayload` | online / idle / offline |
| `SupraWsGroupUpdatedPayload` | Изменение группы |
| `SupraWsChannelUpdatedPayload` | Изменение канала |
| `SupraWsBotUpdatedPayload` | Изменение бота |
| `SupraWsAppearanceUpdatedPayload` | Брендинг/тема |
| `SupraWsSyncHintPayload` | Подсказка синхронизации (`RequestSync`) |
| `SupraWsProfileUpdatedPayload` | Обновление профиля контакта |

Клиент (`MessengerTransport`) подписывается на `message` и маршрутизирует по полям payload в `Messenger.#onTransportMessage`.

Подробная схема сетевых запросов, кешей и hot path: **[06-network-sync.md](06-network-sync.md)**.

## Присутствие (UserPresenceService)

- In-memory статусы пользователей.
- Подключение SignalR → online; таймаут без активности → idle; отключение → offline.
- `CanSeeOnlineStatusAsync` фильтрует, кому слать обновления.

## Аутентификация

- Cookie Authentication (`AddAuthentication().AddCookie`, sliding 14 дней).
- Claims: `NameIdentifier` = `User.Id`.
- `CurrentUserAccessor` — получение `UserRecord` из HTTP context.
- API-запросы без cookie → 401 JSON (не redirect), кроме явных `[AllowAnonymous]`.
- Bot API — отдельная аутентификация по `login` + `token` (SHA-256).

## Маршрутизация SPA

`Program.cs`:

- `MapGet("/@{login}")` → `index.html`
- `MapGet("/+{token}")` → регистрация
- `MapFallback` — `IndexShellRenderer` для не-API путей (инъекция брендинга/версии)

## Клиентская архитектура

### Инициализация (`class Messenger`)

1. Создание singleton-инстансов: cache, i18n, icons, utils, theme, api, avatar, presence, renderer, panels, modals, sidebar, transport.
2. `MODE_APP` → `#initApp()`: render, кеш чатов из localStorage, `RequestSync`, folders, deep link `/@...`.
3. `MODE_CHAT` → `#initChat()`: один чат по `chatId`.

### Поток открытия чата

```
MessengerSidebar (click) → MessengerAppView.#openChat
  → панель из pool или createPanel
  → loadHistory из IndexedDB (GetMessages только если кеш пуст)
  → markReadIfEngaged только при непрочитанных
```

Синхронизация при boot/reconnect: `requestSyncBundle` → `POST RequestSync` (см. [06-network-sync.md](06-network-sync.md)).

### Кеш сообщений

`MessengerMessageService` + `MessengerCache` (IndexedDB):

- Сохранение при получении/отправке.
- `RequestSync` — догоняющие сообщения по `chatCursors` (lastId из IndexedDB).
- `reconcileOnStartup` — подтверждение зависших `sending` (отдельно от бандла).
- Дедупликация по `id` / `localId`.

### Crypto-режимы

- **Secure (HTTPS):** нативный Web Crypto API, `SupraSecureStore` (IndexedDB) для persistent unlock.
- **Legacy (HTTP/LAN):** node-forge polyfill (`supra-webcrypto.bundle.js`), sessionStorage.

Определяется в `supra-env.js` (генерируется при деплое через `SM_DEPLOY_PROTOCOL`).

### Адаптивность

- `MessengerUtils.isMobile()` → `window.innerWidth <= 680`
- `isMobileSheetMenu()` → `<= 1199` (bottom sheet меню)
- CSS media queries синхронизированы с этими порогами

## Совместимость с OtbMessenger

Standalone SuperMessenger воспроизводит контракт Supra/OtbMessenger автономно, без host-платформы Creatio/SupraHost, но сохраняет совместимость имён методов и формата WS.

## Деплой

- **Docker:** `docker compose up -d --build`
- **Windows remote:** `deploy.cmd` → `deploy/deploy.ps1` (PuTTY `pscp`/`plink`, Docker на сервере)
- Версионирование: `deploy/release.json` + `deploy/apply-release.ps1`
- Конфиг деплоя: `tmp/deploy/deploy.env` (создаётся при первом запуске)

## Конфигурация

`appsettings.json`:

- `Data:Root`, `Data:FilesPath`
- `Admin:Login`, `Admin:Password` — начальный админ (`DataInitializer`)
- `App:PublicUrl` — публичный URL для push/manifest

Переменные окружения Docker: `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `PUBLIC_URL`, `APP_PORT`.

## Расширение

1. Новый метод API → `SupraMessengerService` + case в `SupraMessengerController` + метод `MessengerApiClient` + UI.
2. Новое поле пользователя → `UserRecord` + JSON store + Profile API + форма профиля.
3. Новый тип WS-события → DTO в Core + отправка в controller/hub + обработчик в `Messenger.#onTransportMessage`.
4. Замена хранилища → реализовать `IDataStore`, зарегистрировать в DI.
