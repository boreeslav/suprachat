# Справочник API

## Формат ответа мессенджера

`POST /api/messenger/{MethodName}`

**Заголовки:** `Content-Type: application/json`, cookie сессии, опционально `BPMCSRF`.

**Ответ:**

```json
{
  "GetChatsResult": "{ \"success\": true, \"chats\": [...] }"
}
```

Поле `{MethodName}Result` может быть строкой JSON — клиент парсит автоматически (`MessengerApiClient.call`).

---

## Auth — `/api/auth`

| Метод | URL | Auth | Описание |
|-------|-----|------|----------|
| POST | `/api/auth/login` | — | Form: `login`, `password` |
| POST | `/api/auth/logout` | ✓ | Выход |
| GET | `/api/auth/me` | ✓ | Текущий пользователь (id, login, name, avatar, userType) |

---

## Profile — `/api/profile`

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/profile` | Свой профиль |
| GET | `/api/profile/by-login/{login}` | Публичный профиль по логину |
| GET | `/api/profile/{userId}` | Профиль по ID |
| PUT | `/api/profile` | Form: displayName, email, phone, statusText (≤20), aboutText (≤140), photo |
| PUT | `/api/profile/privacy` | JSON: SearchableByLogin, SearchableByName, AllowInvite, ShowOnlineStatus, AllowWrite |
| POST | `/api/profile/change-password` | currentPassword, newPassword |
| POST | `/api/profile/change-login` | newLogin |
| GET/PUT | `/api/profile/chat-preferences` | Per-chat UI настройки |
| GET/PUT | `/api/profile/assistant-preferences` | Настройки ассистента |
| GET | `/api/profile/invitations` | Список своих приглашений |
| POST | `/api/profile/invitations` | Создать приглашение |
| POST | `/api/profile/master-password-link` | Ссылка восстановления мастер-пароля |

**Ответ публичного профиля:** id, login, displayName, avatar, statusText, aboutText, lastSeenAt, onlineStatus, canWrite.

---

## Public (anonymous) — `/api/public`

| Метод | URL | Условие видимости |
|-------|-----|-------------------|
| GET | `/api/public/profile/{login}` | `IsActive` && `SearchableByLogin` |
| GET | `/api/public/group/{chatId}` | Группа && `AllowJoinByLink` |
| GET | `/api/public/channel/{slug}` | Канал не удалён |
| GET | `/api/public/channel/{slug}/messages` | Сообщения канала (публичный просмотр) |
| GET | `/api/public/channel/{slug}/messages/around` | Сообщения вокруг указанного id |

Ответ: `{ found, type, ... }` или `{ found: false }`.

---

## Messenger RPC — `/api/messenger/{methodName}`

Все методы требуют авторизации.

### Пользователь и чаты

| MethodName | Параметры (body) | Ответ (ключевые поля) |
|------------|------------------|------------------------|
| `GetCurrentUser` | — | `user`: id, login, name, avatar, colorSeed, userType, statusText |
| `GetChats` | — | `chats[]`: id, name, type, avatar, contactUserId, contactStatusText, lastMessage, lastMessageTime, unreadCount |
| **`RequestSync`** | `chatCursors`, `includeProfiles?`, `includeEncryptionKeys?`, `messageLimit?` | `chats[]`, `messagesByChat`, `profiles`, `encryptionKeys` — **основной бандл синхронизации** (см. [06-network-sync.md](06-network-sync.md)) |
| `GetOrCreateChatById` | chatId, chatName | chatId, chatName |
| `CreateDirectChat` | contactId | chatId, chatName |
| `CreateGroup` | name, participantContactIds (JSON string) | chatId, chatName |
| `LeaveChat` | chatId | success |
| `BlockUser` | userId | success |
| `BlockGroup` | chatId | success |

### Сообщения

| MethodName | Параметры | Ответ |
|------------|-----------|-------|
| `GetMessages` | chatId, offset, count **или** afterMessageId, count | messages[] |
| `GetMessageSyncIndex` | chatId, afterMessageId? | sync index |
| `SyncChatPanel` | chatId, afterMessageId?, messageLimit? | messages, profiles, keys |
| `GetMessagesAround` | chatId, messageId, before?, after? | messages[] |
| `GetMessageInfo` | chatId, messageId | message info (read by) |
| `SendMessage` | chatId, text, localId | messageId, status |
| `EditMessage` | chatId, messageId, text | success |
| `DeleteMessage` | chatId, messageId | success |
| `ForwardMessage` | chatId, messageId, targetChatIds (JSON) | success |
| `PressMessageButton` | chatId, messageId, buttonId | success |
| `BatchRequest` | requests (JSON array) | results[] |
| `MarkMessagesRead` | chatId | success |
| `ClearChatHistory` | chatId, alsoDeleteForOther | success |
| `SendUserActivity` | chatId, activityType, active | success |
| `SendMetadata` | — | success (заглушка) |

### Контакты

| MethodName | Параметры | Ответ |
|------------|-----------|-------|
| `GetContacts` | page, rowCount, searchQuery | contacts[], totalCount |
| `GetAllContacts` | page, rowCount, searchQuery, chatContactsOnly? | contacts[] |

### Папки

| MethodName | Параметры | Ответ |
|------------|-----------|-------|
| `GetFolders` | — | folders[], members[] |
| `SaveFolder` | folderId?, name, icon | folderId |
| `DeleteFolder` | folderId | success |
| `SetChatFolder` | chatId, folderId | success |
| `RemoveChatFromFolder` | chatId, folderId? | success |
| `ReorderFolders` | folderIds (JSON string) | success |

### Группы

| MethodName | Параметры | Ответ |
|------------|-----------|-------|
| `GetGroupInfo` | chatId | name, avatar, members[], canEdit, allowJoinByLink, … |
| `UpdateGroup` | chatId, name?, allowJoinByLink? | success |
| `GetGroupLinkPreview` | chatId | chatId, name, avatar, isMember, canJoin |
| `JoinGroupByLink` | chatId | chatId, chatName |
| `AddGroupMembers` | chatId, memberIds (JSON) | success |
| `RemoveGroupMember` | chatId, memberUserId | success |
| `SetGroupMemberAdmin` | chatId, memberUserId, isAdmin | success |

### Ветки групп

| MethodName | Параметры | Ответ |
|------------|-----------|-------|
| `CreateGroupBranch` | parentChatId, name, slug? | chatId |
| `UpdateGroupBranch` | chatId, name?, slug? | success |
| `DeleteGroupBranch` | chatId | success |
| `GetGroupBranchLinkPreview` | parentChatId, slug | preview |
| `ReorderGroupBranches` | parentChatId, branchIds (JSON) | success |

### Каналы

| MethodName | Параметры | Ответ |
|------------|-----------|-------|
| `CreateChannel` | name, slug | chatId |
| `GetMyChannels` | — | channels[] |
| `GetChannelInfo` | chatId | info, members, roles |
| `UpdateChannel` | chatId, name?, slug? | success |
| `GetChannelLinkPreview` | slug | preview |
| `SubscribeChannel` | chatId | success |
| `UnsubscribeChannel` | chatId | success |
| `SetChannelMemberRole` | chatId, memberUserId, role | success |
| `TransferChannelOwnership` | chatId, newOwnerUserId | success |
| `DeleteChannel` | chatId | success |
| `RestoreChannel` | chatId | success |
| `GetChannelSubscribers` | chatId, page?, pageSize?, query? | subscribers[] |
| `AddChannelMember` | chatId, memberUserId, role? | success |
| `RemoveChannelMember` | chatId, memberUserId | success |

### Боты (UI)

| MethodName | Параметры | Ответ |
|------------|-----------|-------|
| `CreateBot` | name | botUserId |
| `GetMyBots` | — | bots[] |
| `GetBotInfo` | botUserId, chatId? | info |
| `UpdateBot` | botUserId, name?, description? | success |
| `GetBotLinkPreview` | slug | preview |
| `StartBot` | botUserId | chatId |
| `GenerateBotToken` | botUserId | token (один раз) |
| `DeleteBot` | botUserId | success |
| `RestoreBot` | botUserId | success |
| `TransferBotOwnership` | botUserId, newOwnerUserId | success |
| `GetBotUsers` | botUserId, page?, pageSize?, query? | users[] |
| `AddBotAssistant` | botUserId | success |
| `RemoveBotAssistant` | botUserId | success |
| `GetBotAssistants` | — | assistants[] |
| `InvokeBotAssistant` | botUserId, action, context | sessionId |
| `ConfirmAssistantReply` | sessionId, insertedMessageId | success |
| `DismissAssistantReply` | sessionId | success |
| `GetPendingAssistantReplies` | — | replies[] |

---

## Group / Channel / Bot avatars

| Метод | URL | Body |
|-------|-----|------|
| POST | `/api/group/{chatId}/avatar` | Form: `photo` |
| POST | `/api/channel/{chatId}/avatar` | Form: `photo` |
| POST | `/api/bot/{botUserId}/avatar` | Form: `photo` |

---

## Files — `/api/files`

| Метод | URL | Auth |
|-------|-----|------|
| GET | `/api/files/avatar/{userId}` | Anonymous |
| GET | `/api/files/group-avatar/{chatId}` | Участник |
| GET | `/api/files/group-avatar-public/{chatId}` | Anonymous (join by link) |
| GET | `/api/files/channel-public/{fileId}[/preview\|/medium]` | Anonymous |
| GET | `/api/files/{fileId}[/preview\|/medium]` | Участник чата |
| POST | `/api/files/upload` | Участник, multipart |

---

## Register — `/api/register`

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/register/{token}` | Проверка токена |
| POST | `/api/register/{token}` | Регистрация (login, password, displayName, …) |

Также HTML: `/register/{token}`, `/+{token}`.

---

## Admin — `/api/admin`

Требуется роль Admin.

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/admin/users` | Список пользователей |
| POST | `/api/admin/users` | Создать пользователя |
| PUT | `/api/admin/users/{id}` | Обновить |
| DELETE | `/api/admin/users/{id}` | Удалить |
| GET | `/api/admin/invitations` | Приглашения |
| POST | `/api/admin/invitations` | Создать |
| DELETE | `/api/admin/invitations/{id}` | Удалить |
| GET | `/api/admin/push-diagnostics` | Диагностика push |
| GET/PUT | `/api/admin/appearance` | Брендинг (название, тема, HTML-контент) |
| POST | `/api/admin/appearance/logo` | Загрузка логотипа |
| POST/DELETE | `/api/admin/appearance/pwa-icon-logo` | Иконка PWA |
| POST/DELETE | `/api/admin/appearance/pwa-icon-bg-image` | Фон иконки PWA |
| POST/DELETE | `/api/admin/appearance/theme-chat-bg-image` | Фон чата |
| POST | `/api/admin/appearance/icons` | Иконки приложения |
| POST | `/api/admin/appearance/sound/incoming\|outgoing` | Звуки |
| POST | `/api/admin/appearance/reset` | Сброс брендинга |

---

## Encryption — `/api/encryption`

Подробнее: [05-encryption.md](05-encryption.md).

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/encryption/status` | Статус E2EE пользователя |
| POST | `/api/encryption/setup` | Настройка ключей |
| GET | `/api/encryption/private-key-backup` | Backup приватного ключа |
| POST | `/api/encryption/public-keys` | Batch получение публичных ключей |
| POST | `/api/encryption/group-keys` | Сохранение ключей группы |
| GET | `/api/encryption/group-keys/{chatId}` | Ключи группы |
| GET | `/api/encryption/group-keys/{chatId}/missing` | Недостающие ключи |
| POST | `/api/encryption/reset` | Сброс E2EE |

---

## App / PWA — `/api/app`

| Метод | URL | Auth | Описание |
|-------|-----|------|----------|
| GET | `/api/app/appearance` | — | Публичные настройки брендинга |
| GET | `/api/app/build` | — | Версия сборки |
| GET | `/manifest.webmanifest` | — | PWA manifest |
| GET | `/api/app/logo`, `/api/app/icons/{fileName}` | — | Логотип и иконки |
| GET | `/api/app/pwa-icon-logo`, `/api/app/pwa-icon-bg-image` | — | PWA assets |
| GET | `/api/app/theme-chat-bg-image` | — | Фон чата |
| GET | `/api/app/sound/incoming\|outgoing` | — | Звуки |
| POST | `/api/app/boot-profile` | ✓ | Boot-профиль клиента |

---

## Push — `/api/push`

Подробнее: [PWA-УСТАНОВКА.md](PWA-УСТАНОВКА.md).

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/push/vapid-public-key` | VAPID public key |
| POST | `/api/push/subscribe` | Подписка |
| POST | `/api/push/unsubscribe` | Отписка |
| GET | `/api/push/preferences` | Текущие настройки |
| POST | `/api/push/preferences/global` | Глобальные настройки |
| POST | `/api/push/preferences/chat` | Per-chat настройки |

---

## Bot API — `/api/bot-api`

Аутентификация: query `login` + `token` (SHA-256). Подробнее: [07-bot-api.md](07-bot-api.md).

REST: `me`, `sendMessage`, `getMessages`, `editMessage`, `deleteMessage`, `sendActivity`, `getActivity`, `uploadFile`, `getFile`, menu-методы, `assistantReply`, управление группами/каналами/ветками.

WebSocket: `/ws/bot?login=&token=`

---

## SignalR — `/hubs/messenger`

**Подключение:** cookie auth, `@microsoft/signalr`.

**Сервер → клиент:** `message` с envelope:

```json
{
  "Header": { "BodyTypeName": "SupraMessenger", "Sender": "SupraMessenger" },
  "Body": { /* payload */ }
}
```

**Клиент → сервер:**

| Метод Hub | Описание |
|-----------|----------|
| `ReportActivity` | Сброс idle-таймера |
| `Heartbeat` | Keep-alive |

**При подключении сервер → клиент:** `SupraSyncHint` (`type: "SupraSyncHint"`, `reason: "connected"`) — клиент вызывает `RequestSync`.

### Поля payload (Body)

Определяются по наличию полей (клиентская эвристика):

| Поле | Тип события |
|------|-------------|
| `messageId`, `chatId`, `text` | Новое сообщение |
| `messageId`, `chatId`, `text` (edited) | Редактирование |
| `messageId`, `chatId` (deleted) | Удаление |
| `messageIds`, `status` | Статус прочтения |
| `chatId`, `chatName` (new chat) | Новый чат |
| `activityType`, `active` | Активность |
| `chatId` (history cleared) | Очистка |
| `userId`, `status` | Presence |
| `chatId`, `groupName`, … | Group updated |
| `type: "SupraAppearanceUpdated"` | Брендинг |
| `type: "SupraSyncHint"` | Подсказка синхронизации |

---

## DTO (SuperMessenger.Core.Dtos)

### Ответы

- `SupraGetCurrentUserResponse`, `SupraGetChatsResponse`, `SupraRequestSyncResponse`, `SupraGetContactsResponse`
- `SupraGetMessagesResponse`, `SupraSendMessageResponse`, `SupraMarkReadResponse`
- `SupraCreateChatResponse`, `SupraGetOrCreateChatByIdResponse`
- `SupraGetFoldersResponse`, `SupraSaveFolderResponse`, `SupraSimpleResponse`
- `SupraGetGroupInfoResponse`, `SupraGetGroupLinkPreviewResponse`, `SupraUpdateGroupResponse`
- Channel/Bot DTOs

### WebSocket

- `SupraWsNewMessagePayload`, `SupraWsMessageEditedPayload`, `SupraWsMessageDeletedPayload`
- `SupraWsStatusPayload`, `SupraWsNewChatPayload`
- `SupraWsUserActivityPayload`, `SupraWsChatHistoryClearedPayload`
- `SupraWsPresencePayload`, `SupraWsGroupUpdatedPayload`, `SupraWsChannelUpdatedPayload`
- `SupraWsBotUpdatedPayload`, `SupraWsAppearanceUpdatedPayload`
- `SupraWsSyncHintPayload`, `SupraWsProfileUpdatedPayload`
- `SupraPublicProfileDto`, `SupraSyncEncryptionKeyDto`

### Сущности в ответах

- `SupraChatDto`, `SupraContactDto`, `SupraCurrentUserDto`, `SupraChatMessageDto`
- `SupraFolderDto`, `SupraFolderMemberDto`, `SupraGroupMemberDto`

---

## IDataStore — методы хранилища

```csharp
// Users
GetUsersAsync, GetUserByIdAsync, GetUserByLoginAsync, SaveUserAsync, DeleteUserAsync

// Invitations
GetInvitationsAsync, GetInvitationByTokenAsync, SaveInvitationAsync, DeleteInvitationAsync

// Chats
GetChatsAsync, GetChatByIdAsync, SaveChatAsync, DeleteChatAsync

// Participants
GetParticipantsByChatAsync, GetParticipantsByUserAsync, SaveParticipantAsync,
IsParticipantAsync, DeleteParticipantAsync

// Messages
GetAllMessagesAsync, GetMessagesByChatAsync, SaveMessageAsync, UpdateMessagesStatusAsync, DeleteMessagesByChatAsync

// Participants / keys (batch reads for sync)
GetAllParticipantsAsync, GetAllChatMemberKeysAsync

// Folders
GetFoldersByUserAsync, SaveFolderAsync, DeleteFolderAsync
GetFolderMembersByUserAsync, SaveFolderMemberAsync, DeleteFolderMemberAsync,
DeleteFolderMembersByFolderAsync, DeleteFolderMembersByChatAsync

// Files
GetFileByIdAsync, SaveFileAsync
```

---

## Коды ошибок

- HTTP 401 — не авторизован
- HTTP 403 — нет прав (файл группы, Forbid)
- `{ success: false, error: "..." }` — бизнес-ошибка в теле Result
