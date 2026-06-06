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
│  Controllers, Hubs, Services (Presence, Realtime, Auth)   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  SuperMessenger.Infrastructure                            │
│  SupraMessengerService, FileDataStore, PasswordHasher     │
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
| **Infrastructure** | `FileDataStore`, `JsonFileCollectionStore`, `SupraMessengerService`, `PasswordHasher` |
| **Web** | ASP.NET Core 8, cookie authentication, controllers, SignalR hub, static wwwroot |

## Хранение данных

Реализация: `FileDataStore` → JSON-файлы в `data/` (настраивается `Data:Root` в `appsettings.json`).

Типичные файлы:

- `users.json`, `invitations.json`
- `chats.json`, `participants.json`, `messages.json`
- `folders.json`, `folder_members.json`
- `files.json` + бинарные файлы в `data/uploads/`, аватары в `data/avatars/`

Замена на БД: реализовать `IDataStore` и зарегистрировать в DI вместо `FileDataStore`.

## Доменная модель

### UserRecord

- Идентификация: `Id`, `Login`, `PasswordHash`, `DisplayName`
- `Type`: User | Admin
- Профиль: `Email`, `Phone`, `AvatarPath`, `StatusText`
- Приватность: `SearchableByLogin`, `SearchableByName`, `AllowInvite`, `ShowOnlineStatus`, `AllowWrite`
- `LastSeenAt`, `IsActive`

### SupraChatRecord

- `Id`, `Name`, `Type` (`direct` | `group` | `public_group`)
- `CreatorUserId`, `AvatarPath`, `AllowJoinByLink`

### Участники и сообщения

- `SupraChatParticipantRecord`: `ChatId`, `UserId`, `IsAdmin`
- `SupraChatMessageRecord`: текст, `SenderUserId`, `Status`, `CreatedOn`
- Папки: `SupraChatFolderRecord`, `SupraChatFolderMemberRecord` (`IsArchive` для архива)

## SupraMessengerService

Центральный сервис бизнес-логики (~1300 строк). Основные группы методов:

| Группа | Методы |
|--------|--------|
| Пользователь | `GetCurrentUserAsync` |
| Чаты | `GetChatsAsync`, `CreateDirectChatAsync`, `CreateGroupAsync`, `GetOrCreateChatByIdAsync`, `LeaveChatAsync` |
| Сообщения | `GetMessagesAsync`, `SendMessageAsync`, `MarkMessagesReadAsync`, `ClearChatHistoryAsync` |
| Контакты | `GetContactsAsync`, `GetAllContactsAsync` |
| Приватность | `CanSeeOnlineStatusAsync`, `CanWriteAsync` |
| Папки | `GetFoldersAsync`, `SaveFolderAsync`, `DeleteFolderAsync`, `SetChatFolderAsync`, `RemoveChatFromFolderAsync`, `ReorderFoldersAsync` |
| Группы | `GetGroupInfoAsync`, `UpdateGroupAsync`, `GetGroupLinkPreviewAsync`, `JoinGroupByLinkAsync`, `AddGroupMembersAsync`, `RemoveGroupMemberAsync`, `SetGroupMemberAdminAsync`, `SaveGroupAvatarPathAsync` |
| Системные | `InsertGroupSystemEventAsync`, `GetGroupUpdatedPayloadAsync` |
| Участники | `GetParticipantUserIdsAsync`, `GetDirectContactUserIdsAsync`, `GetChatContactUserIdsAsync` |

Проверки доступа: участник чата, админ группы, настройки `allowWrite` / `showOnlineStatus`.

## Контроллеры Web

| Контроллер | Route | Auth |
|------------|-------|------|
| `AuthController` | `/api/auth` | login — anonymous |
| `ProfileController` | `/api/profile` | Authorize |
| `SupraMessengerController` | `/api/messenger/{method}` | Authorize |
| `GroupController` | `/api/group` | Authorize |
| `FilesController` | `/api/files` | частично AllowAnonymous |
| `PublicPreviewController` | `/api/public` | AllowAnonymous |
| `RegisterController` | `/api/register` | token endpoints |
| `AdminController` | `/api/admin` | Admin |

`SupraMessengerController.Invoke` — единая точка RPC-стиля: имя метода в URL, тело JSON, ответ `{ MethodNameResult: ... }`.

После мутаций контроллер вызывает `RealtimeNotifier` для рассылки WebSocket-payload участникам.

## Realtime

### MessengerHub (`/hubs/messenger`)

- `OnConnectedAsync` / `OnDisconnectedAsync` — группа `user:{userId}`, presence, `LastSeenAt`
- `ReportActivity()` — сброс idle → online для контактов с правом видеть статус

### RealtimeNotifier

```csharp
SendToUserAsync(userId, payload)
// envelope: { Header: { BodyTypeName: "SupraMessenger" }, Body: payload }
```

### Типы payload (Body)

| Класс | Назначение |
|-------|------------|
| `SupraWsNewMessagePayload` | Новое сообщение |
| `SupraWsStatusPayload` | Статус прочтения |
| `SupraWsNewChatPayload` | Новый чат в списке |
| `SupraWsUserActivityPayload` | Печатает / запись голоса и т.д. |
| `SupraWsChatHistoryClearedPayload` | Очистка истории |
| `SupraWsPresencePayload` | online / idle / offline |
| `SupraWsGroupUpdatedPayload` | Изменение группы |

Клиент (`MessengerTransport`) подписывается на `message` и маршрутизирует по полям payload в `Messenger.#onTransportMessage`.

## Присутствие (UserPresenceService)

- In-memory статусы пользователей.
- Подключение SignalR → online; таймаут без активности → idle; отключение → offline.
- `CanSeeOnlineStatusAsync` фильтрует, кому слать обновления.

## Аутентификация

- Cookie Authentication (`AddAuthentication().AddCookie`).
- Claims: `NameIdentifier` = `User.Id`.
- `CurrentUserAccessor` — получение `UserRecord` из HTTP context.
- API-запросы без cookie → 401 JSON (не redirect), кроме явных `[AllowAnonymous]`.

## Маршрутизация SPA

`Program.cs`:

- `MapGet("/@{login}")` → `index.html`
- `MapFallback` — `index.html` для не-API путей; `/@...` обрабатывается отдельно

## Клиентская архитектура

### Инициализация (`class Messenger`)

1. Создание singleton-инстансов: cache, i18n, icons, utils, theme, api, avatar, presence, renderer, panels, modals, sidebar, transport.
2. `MODE_APP` → `#initApp()`: render, getCurrentUser, getChats, folders, deep link `/@...`.
3. `MODE_CHAT` → `#initChat()`: один чат по `chatId`.

### Поток открытия чата

```
MessengerSidebar (click) → MessengerAppView.#openChat
  → MessengerChatPanel.createPanel
  → getMessages + subscribe transport
  → markRead
```

### Кеш сообщений

`MessengerMessageService` + `MessengerCache` (IndexedDB):

- Сохранение при получении/отправке.
- `reconcileOnStartup` — догрузка с сервера по `afterMessageId`.
- Дедупликация по `id` / `localId`.

### Адаптивность

- `MessengerUtils.isMobile()` → `window.innerWidth <= 680`
- `isMobileSheetMenu()` → `<= 1199` (bottom sheet меню)
- CSS media queries синхронизированы с этими порогами

## Интеграция OtbMessenger (legacy)

Каталог `OtbMessenger/Schemas/` — схемы Creatio (JS/C#): `OtbMessengerService`, `OtbWsMessenger`, `FileUploader`. Standalone SuperMessenger воспроизводит контракт Supra без платформы Terrasoft, но сохраняет совместимость имён методов и формата WS.

## Деплой

- **Docker:** `docker compose up`
- **Windows remote:** `deploy/deploy.ps1` (PuTTY `pscp`/`plink`, Docker на сервере)

## Конфигурация

`appsettings.json`:

- `Data:Root`, `Data:FilesPath`
- Учётные данные начального админа (`DataInitializer`)

## Расширение

1. Новый метод API → `SupraMessengerService` + case в `SupraMessengerController` + метод `MessengerApiClient` + UI.
2. Новое поле пользователя → `UserRecord` + миграция JSON + Profile API + форма профиля.
3. Новый тип WS-события → DTO в Core + отправка в controller/hub + обработчик в `Messenger.#onTransportMessage`.
