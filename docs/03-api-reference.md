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
| GET | `/api/profile/invitations` | Список своих приглашений |
| POST | `/api/profile/invitations` | Создать приглашение |

**Ответ публичного профиля:** id, login, displayName, avatar, statusText, aboutText, lastSeenAt, onlineStatus, canWrite.

---

## Public (anonymous) — `/api/public`

| Метод | URL | Условие видимости |
|-------|-----|-------------------|
| GET | `/api/public/profile/{login}` | `IsActive` && `SearchableByLogin` |
| GET | `/api/public/group/{chatId}` | Группа && `AllowJoinByLink` |

Ответ: `{ found, type, ... }` или `{ found: false }`.

---

## Messenger RPC — `/api/messenger/{methodName}`

Все методы требуют авторизации.

### Пользователь и чаты

| MethodName | Параметры (body) | Ответ (ключевые поля) |
|------------|------------------|------------------------|
| `GetCurrentUser` | — | `user`: id, login, name, avatar, colorSeed, userType, statusText |
| `GetChats` | — | `chats[]`: id, name, type, avatar, contactUserId, contactStatusText, lastMessage, lastMessageTime, unreadCount |
| `GetOrCreateChatById` | chatId, chatName | chatId, chatName |
| `CreateDirectChat` | contactId | chatId, chatName |
| `CreateGroup` | name, participantContactIds (JSON string) | chatId, chatName |
| `LeaveChat` | chatId | success |

### Сообщения

| MethodName | Параметры | Ответ |
|------------|-----------|-------|
| `GetMessages` | chatId, offset, count **или** afterMessageId, count | messages[] |
| `SendMessage` | chatId, text, localId | messageId, status |
| `MarkMessagesRead` | chatId | success |
| `ClearChatHistory` | chatId, alsoDeleteForOther | success |
| `SendUserActivity` | chatId, activityType, active | success |
| `SendMetadata` | — | success (заглушка) |

### Контакты

| MethodName | Параметры | Ответ |
|------------|-----------|-------|
| `GetContacts` | page, rowCount, searchQuery | contacts[], totalCount |
| `GetAllContacts` | page, rowCount, searchQuery | contacts[] (все пользователи с фильтром) |

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

---

## Group — `/api/group`

| Метод | URL | Body |
|-------|-----|------|
| POST | `/api/group/{chatId}/avatar` | Form: `photo` |

---

## Files — `/api/files`

| Метод | URL | Auth |
|-------|-----|------|
| GET | `/api/files/avatar/{userId}` | Anonymous |
| GET | `/api/files/group-avatar/{chatId}` | Участник |
| GET | `/api/files/group-avatar-public/{chatId}` | Anonymous (join by link) |
| GET | `/api/files/{fileId}` | Участник чата |
| POST | `/api/files/upload` | Участник, multipart |

---

## Register — `/api/register`

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/register/{token}` | Проверка токена |
| POST | `/api/register/{token}` | Регистрация (login, password, displayName, …) |

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

### Поля payload (Body)

Определяются по наличию полей (клиентская эвристика):

| Поле | Тип события |
|------|-------------|
| `messageId`, `chatId`, `text` | Новое сообщение |
| `messageIds`, `status` | Статус прочтения |
| `chatId`, `chatName` (new chat) | Новый чат |
| `activityType`, `active` | Активность |
| `chatId` (history cleared) | Очистка |
| `userId`, `status` | Presence |
| `chatId`, `groupName`, … | Group updated |

---

## DTO (SuperMessenger.Core.Dtos)

### Ответы

- `SupraGetCurrentUserResponse`, `SupraGetChatsResponse`, `SupraGetContactsResponse`
- `SupraGetMessagesResponse`, `SupraSendMessageResponse`, `SupraMarkReadResponse`
- `SupraCreateChatResponse`, `SupraGetOrCreateChatByIdResponse`
- `SupraGetFoldersResponse`, `SupraSaveFolderResponse`, `SupraSimpleResponse`
- `SupraGetGroupInfoResponse`, `SupraGetGroupLinkPreviewResponse`, `SupraUpdateGroupResponse`

### WebSocket

- `SupraWsNewMessagePayload`, `SupraWsStatusPayload`, `SupraWsNewChatPayload`
- `SupraWsUserActivityPayload`, `SupraWsChatHistoryClearedPayload`
- `SupraWsPresencePayload`, `SupraWsGroupUpdatedPayload`

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
GetMessagesByChatAsync, SaveMessageAsync, UpdateMessagesStatusAsync, DeleteMessagesByChatAsync

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
