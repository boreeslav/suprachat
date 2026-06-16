# Bot API — документация

HTTP и WebSocket API для интеграции ботов SuperMessenger. Боты работают только с **незашифрованными** сообщениями.

## Аутентификация

**Cookie-авторизация мессенджера не требуется.** Доступ только по паре `login` + `token` бота **в query string URL**.

Каждый запрос (GET или POST) должен содержать в URL:

| Параметр | Описание |
|----------|----------|
| `login` | Логин (slug) бота, например `mybot_bot` |
| `token` | API-токен, сгенерированный владельцем бота в мессенджере |

Токен генерируется методом `GenerateBotToken` в UI («Мои боты» → настройки бота). На сервере хранится только SHA-256 хеш.

Параметры `login` и `token` передаются **только в URL** (query string), в том числе для POST. Остальные параметры — в query (GET) или JSON-теле (POST).

**Пример POST:**

```
POST /api/bot-api/sendMessage?login=mybot_bot&token=abc...
Content-Type: application/json

{"userLogin":"ivan","text":"Привет!"}
```

## Базовый URL

```
https://<ваш-сервер>/api/bot-api/
```

WebSocket:

```
wss://<ваш-сервер>/ws/bot?login=<login>&token=<token>
```

## Ограничения

- Бот отправляет только plaintext (без префикса `E1:` и без `encryptionTier=protected`).
- Входящие зашифрованные сообщения в inbox **не попадают**.
- История входящих сообщений бота на сервере хранится **1 сутки**, затем удаляется.
- Отправка пользователю в личку возможна, если пользователь уже начал диалог с ботом (`/start`).
- Управление группами и каналами доступно, если бот **добавлен участником** с нужными правами (см. раздел «Группы и каналы»).

## Права бота в группах и каналах

Бот должен быть **участником** чата. Права определяются ролью, как у обычного пользователя:

| Действие | Группа (админ) | Канал (author) | Канал (admin/owner) |
|----------|----------------|----------------|---------------------|
| Отправка сообщений | да | да | да |
| Удаление чужих сообщений | да | нет | да |
| Удаление участника | да (не админов и не создателя) | нет | да (не владельца) |
| Блокировка участника | да (не админов и не создателя) | нет | — |
| Название, описание, аватар | да | нет | да |
| Ветки (создать/изменить/удалить) | да | — | — |
| Управление ролями канала | — | нет | да |

**Защита владельца:** ни один администратор не может удалить или изменить роль владельца канала / создателя группы.

## REST-методы

### GET/POST `/me`

Информация о боте.

**Ответ:**

```json
{
  "success": true,
  "botUserId": "...",
  "login": "mybot_bot",
  "name": "My Bot",
  "description": "..."
}
```

### GET/POST `/sendMessage`

Отправка сообщения от имени бота.

| Параметр | Обязательный | Описание |
|----------|--------------|----------|
| `text` | * | Текст сообщения или подпись к фото/коллажу |
| `caption` | нет | Подпись к фото/коллажу (альтернатива `text`) |
| `photoFileId` | * | ID загруженного изображения (одно фото) |
| `photoFileIds` | * | Массив ID изображений для коллажа (2–6 фото) |
| `documentFileId` | * | ID загруженного файла (документ) |
| `buttons` | нет | Массив inline-кнопок под сообщением (см. ниже) |
| `userLogin` | * | Логин пользователя — личный чат |
| `chatId` | * | ID группы или канала |

\* Укажите **либо** `userLogin`, **либо** `chatId`. Нужен **либо** непустой `text`/`caption`, **либо** `photoFileId`/`photoFileIds`/`documentFileId`, **либо** массив `buttons`.

**Медиа:** сначала загрузите файл через `POST /uploadFile` (multipart, поле `file`, query `chatId`), затем отправьте сообщение с `photoFileId`, `photoFileIds` или `documentFileId`. Скачивание — `GET /getFile`, `/getFilePreview`, `/getFileMedium` с `fileId` в query.

**Кнопка сообщения:**

| Поле | Описание |
|------|----------|
| `text` | Заголовок кнопки (обязательный) |
| `action` | Текст ответа при нажатии (обязательный) |
| `id` | Опциональный идентификатор (по умолчанию индекс) |
| `color` | `default`, `primary`, `secondary`, `danger`, `success` |

При нажатии пользователь отправляет **ответ с цитированием** исходного сообщения; в inbox бота приходит поле `buttonPress` с `sourceMessageId`, `buttonId`, `action`.

**Пример подтверждения:**

```json
{
  "userLogin": "ivan",
  "text": "Сбросить сессию шифрования?",
  "buttons": [
    { "id": "yes", "text": "Да, сбросить", "action": "reset_confirm", "color": "danger" },
    { "id": "no", "text": "Отмена", "action": "reset_cancel", "color": "secondary" }
  ]
}
```

**Пример фото с подписью:**

```json
{
  "chatId": "...",
  "photoFileId": "uploaded-file-guid",
  "caption": "Смотри скрин"
}
```

**Пример коллажа:**

```json
{
  "userLogin": "ivan",
  "photoFileIds": ["id1", "id2", "id3"],
  "caption": "Варианты"
}
```

**Ответ:**

```json
{
  "success": true,
  "messageId": "...",
  "chatId": "..."
}
```

### GET/POST `/sendActivity`

Индикатор активности бота (например «печатает»). Участники чата получают событие `SupraUserActivity` по WebSocket.

| Параметр | Обязательный | Описание |
|----------|--------------|----------|
| `activityType` | да | `typing`, `sendingFile`, `sendingImage` |
| `active` | нет | `true` (по умолчанию) — начать; `false` — завершить и снять статус |
| `activityMessage` | нет | Кастомный текст статуса (до 25 символов, длиннее обрезается с `...`) |
| `userLogin` | * | Личный чат |
| `chatId` | * | Группа или канал |

Таймаут статуса на сервере — **1 минута**. При открытии чата активные статусы приходят в ответе `SyncChatPanel` (поле `activities`), отдельный запрос не нужен.

\* Укажите **либо** `userLogin`, **либо** `chatId`.

**Пример:**

```json
{
  "chatId": "...",
  "activityType": "typing",
  "active": true,
  "activityMessage": "Ищу в коде…"
}
```

**Снятие статуса:**

```json
{
  "chatId": "...",
  "activityType": "typing",
  "active": false
}
```

**Ответ:** `{ "success": true, "chatId": "..." }`

### GET/POST `/editMessage`

Редактирование **своего** сообщения бота.

| Параметр | Обязательный | Описание |
|----------|--------------|----------|
| `chatId` | да | ID чата |
| `messageId` | да | ID сообщения (из ответа `sendMessage`) |
| `text` | * | Новый текст или подпись |
| `caption` | нет | Новая подпись к фото/коллажу |
| `photoFileId` | нет | Заменить вложение на одно фото |
| `photoFileIds` | нет | Заменить вложение на коллаж |
| `documentFileId` | нет | Заменить вложение на файл |
| `buttons` | нет | Новый массив кнопок (пустой массив — убрать кнопки) |

\* Нужен **либо** `text`/`caption`, **либо** медиа-параметры, **либо** `buttons`.

**Ответ:** `{ "success": true, "chatId": "...", "messageId": "..." }`

### GET/POST `/deleteMessage`

Удаление сообщения бота.

| Параметр | Обязательный | Описание |
|----------|--------------|----------|
| `chatId` | да | ID чата |
| `messageId` | да | ID сообщения |
| `deleteForEveryone` | нет | `true` (по умолчанию) — для всех; `false` — только у бота |

**Ответ:** `{ "success": true, "chatId": "...", "messageId": "..." }`

### GET/POST `/getMenu`

Текущее меню бота для UI (кнопка слева от скрепки в личном чате).

**Ответ:**

```json
{
  "success": true,
  "menu": {
    "items": [
      { "id": "help", "text": "Справка", "message": "/help" },
      {
        "id": "mode",
        "text": "Режим",
        "submenu": [
          { "id": "agent", "text": "Agent", "message": "/mode agent" }
        ]
      }
    ]
  }
}
```

### GET/POST `/setMenu`

Задать меню бота. Листовой пункт должен содержать `message` (текст, который отправится в чат при нажатии). Пункт с `submenu` — вложенное меню.

| Поле пункта | Описание |
|-------------|----------|
| `text` | Заголовок в UI (обязательный) |
| `message` | Текст для отправки (лист) |
| `submenu` | Вложенные пункты |
| `id` | Опциональный идентификатор |

**Тело POST:**

```json
{
  "menu": {
    "items": [
      { "text": "Справка", "message": "/help" }
    ]
  }
}
```

**Ответ:** `{ "success": true, "menu": { "items": [...] } }`

После успешного `setMenu` участники чатов с ботом получают WebSocket-событие `SupraBotUpdated` с полем `menu`.

### GET/POST `/getMessages`

Получение входящих сообщений бота (inbox).

| Параметр | По умолчанию | Описание |
|----------|--------------|----------|
| `count` | 50 | Количество (макс. 100) |
| `offset` | 0 | Смещение от начала истории |
| `afterMessageId` | — | Вернуть сообщения **после** указанного inbox-id |

Если указан `afterMessageId`, параметр `offset` игнорируется.

**Ответ:**

```json
{
  "success": true,
  "messages": [
    {
      "id": "inbox-guid",
      "messageId": "original-message-guid",
      "chatId": "...",
      "chatType": "direct",
      "chatName": null,
      "senderId": "...",
      "senderLogin": "ivan",
      "senderName": "Иван",
      "text": "reset_confirm",
      "contentType": "text",
      "caption": null,
      "attachments": [],
      "timestamp": "2026-06-11T12:00:00Z",
      "replyToMessageId": "...",
      "replyToSenderName": "My Bot",
      "replyToTextPreview": "Сбросить сессию шифрования?",
      "buttonPress": {
        "sourceMessageId": "...",
        "buttonId": "yes",
        "action": "reset_confirm"
      }
    }
  ]
}
```

**Входящее фото:**

```json
{
  "contentType": "image",
  "text": "",
  "caption": null,
  "attachments": [
    { "fileId": "...", "fileName": "photo.jpg", "fileSize": 12345, "mimeType": "image/jpeg" }
  ]
}
```

**Входящий коллаж:**

```json
{
  "contentType": "photo_album",
  "text": "Подпись",
  "caption": "Подпись",
  "attachments": [
    { "fileId": "...", "fileName": "a.jpg", "fileSize": 100, "mimeType": "image/jpeg" },
    { "fileId": "...", "fileName": "b.jpg", "fileSize": 200, "mimeType": "image/jpeg" }
  ]
}
```

### POST `/uploadFile`

Загрузка файла для последующей отправки в сообщении. Multipart, поле `file`. Query: `login`, `token`, `chatId`. Лимит — 100 МБ.

**Ответ:** `{ "success": true, "fileId": "...", "fileName": "...", "mimeType": "...", "size": 12345, "chatId": "..." }`

### GET `/getFile`, `/getFilePreview`, `/getFileMedium`

Скачивание вложения по `fileId` (query: `login`, `token`, `fileId`). Бот должен быть участником чата, к которому относится файл.

## Группы и каналы

Все методы ниже требуют `login` + `token` в query string. Параметр `chatId` обязателен, если не указано иное.

### GET/POST `/getChatInfo`

Информация о группе или канале, включая права бота (`canEdit`, `canPost`, `canManageMembers`, `myRole`).

| Параметр | Обязательный | Описание |
|----------|--------------|----------|
| `chatId` | да | ID группы, ветки или канала |

### GET/POST `/updateGroup`

Изменение группы (только **администратор**).

| Параметр | Описание |
|----------|----------|
| `chatId` | ID группы |
| `name` | Новое название |
| `description` | Новое описание |
| `allowJoinByLink` | `true` / `false` — вступление по ссылке |

### POST `/setGroupAvatar`

Загрузка аватара группы (multipart, только **администратор**). Query: `login`, `token`, `chatId`. Поле формы: `photo` (JPEG/PNG, до 512 КБ).

### GET/POST `/removeGroupMember`

Исключение участника из группы (админ). Нельзя удалить создателя или другого администратора.

| Параметр | Описание |
|----------|----------|
| `chatId` | ID группы |
| `memberUserId` | ID пользователя (или `userId`) |

### GET/POST `/blockGroupMember`

Блокировка участника в группе (админ). Участник удаляется и не может вернуться самостоятельно. Нельзя заблокировать создателя или администратора.

### GET/POST `/createGroupBranch`

Создание ветки (админ). Параметры: `parentChatId` (или `chatId`), `name`, опционально `slug`.

### GET/POST `/updateGroupBranch`

Изменение ветки (админ). Параметры: `branchChatId` (или `chatId`), `name`, `description`.

### GET/POST `/deleteGroupBranch`

Удаление ветки (админ). Параметр: `branchChatId` (или `chatId`).

### GET/POST `/reorderGroupBranches`

Изменение порядка веток (админ). Параметры: `parentChatId`, `branchIds` — массив ID веток в JSON-теле.

### GET/POST `/updateChannel`

Изменение канала (только **admin** или **owner**, не author). Параметры: `chatId`, `name`, `description`.

### POST `/setChannelAvatar`

Загрузка аватара канала (multipart, admin/owner). Query: `login`, `token`, `chatId`. Поле: `photo`.

### GET/POST `/removeChannelMember`

Снятие admin/author с роли (демоция в subscriber). **Нельзя удалить владельца.**

### GET/POST `/setChannelMemberRole`

Назначение роли: `admin`, `author`, `subscriber`. Нельзя изменить роль владельца.

### GET/POST `/getChannelSubscribers`

Список подписчиков канала (admin/owner). Параметры: `chatId`, `page`, `pageSize`, `query`.

### Сообщения в группах и каналах

Существующие методы работают с `chatId`:

- `sendMessage` — в канале нужна роль author, admin или owner
- `deleteMessage` с `deleteForEveryone: true` — админ группы/канала может удалять чужие сообщения
- `editMessage` — только свои сообщения бота

## WebSocket

Подключение:

```
wss://host/ws/bot?login=mybot_bot&token=...
```

На сервере действует политика **одной активной сессии на бота**: при новом подключении предыдущее WebSocket-соединение закрывается. Это предотвращает дублирование входящих сообщений при реконнекте или перезапуске процесса бота.

### События от сервера

| `type` | Описание |
|--------|----------|
| `connected` | Подключение установлено, поле `botUserId` |
| `message` | Новое входящее сообщение, поле `update` (формат как в `getMessages`) |
| `pong` | Ответ на ping |

**Пример:**

```json
{
  "type": "message",
  "update": {
    "id": "...",
    "text": "Привет!",
    "senderLogin": "ivan",
    ...
  }
}
```

### Команды клиента

```json
{ "action": "ping" }
```

### Переподключение и пропущенные сообщения

Клиент [`supra-bot-api.js`](../src/SuperMessenger.Web/wwwroot/docs/supra-bot-api.js) по умолчанию:

- **автоматически переподключается** при разрыве WebSocket (экспоненциальная задержка 1–30 с);
- после реконнекта вызывает **`getMessages` с `afterMessageId`** и передаёт пропущенные сообщения в тот же `onMessage`.

Опции `connectWebSocket(handlers, options)`:

| Опция | По умолчанию | Описание |
|-------|--------------|----------|
| `reconnect` | `true` | Автопереподключение |
| `reconnectMinDelay` | `1000` | Начальная задержка (мс) |
| `reconnectMaxDelay` | `30000` | Максимальная задержка (мс) |
| `syncMissed` | `true` | Догрузка inbox после реконнекта |
| `lastInboxId` | — | Последний обработанный inbox-id (для перезапуска процесса) |

Колбэки: `onReconnect(attempt, delayMs)`, `onSyncStart()`, `onSyncComplete(count)`, `onSyncError(err)`.

Для сохранения позиции между перезапусками бота используйте `api.getLastInboxId()` после обработки сообщений и передайте значение в `lastInboxId` при следующем `connectWebSocket`.

## JavaScript-клиент

Файл [`/docs/supra-bot-api.js`](../src/SuperMessenger.Web/wwwroot/docs/supra-bot-api.js) — обёртка для браузера и Node (fetch + WebSocket).

```javascript
const api = new SupraBotApi({
  baseUrl: 'https://example.com',
  login: 'mybot_bot',
  token: '...',
});

await api.sendMessage({ userLogin: 'ivan', text: 'Hello' });
await api.sendActivity({ chatId: '...', activityType: 'typing', active: true });
await api.editMessage({ chatId: '...', messageId: '...', text: 'Updated' });
await api.deleteMessage({ chatId: '...', messageId: '...' });
const { messages } = await api.getMessages({ count: 20 });

// Группы и каналы (бот должен быть участником с нужными правами)
const info = await api.getChatInfo({ chatId: '...' });
await api.updateGroup({ chatId: '...', name: 'Новое имя', description: 'Описание' });
await api.removeGroupMember({ chatId: '...', memberUserId: '...' });
await api.blockGroupMember({ chatId: '...', memberUserId: '...' });
await api.createGroupBranch({ parentChatId: '...', name: 'Ветка', slug: 'dev' });
await api.updateChannel({ chatId: '...', description: 'О канале' });

function handleMessage(update) {
  console.log('Message:', update);
}

api.connectWebSocket({
  onMessage: handleMessage,
  onConnected: () => console.log('WS ready'),
  onSyncComplete: (n) => console.log('Missed while offline:', n),
}, {
  reconnect: true,      // автопереподключение (по умолчанию true)
  syncMissed: true,     // getMessages(afterMessageId) после реконнекта
  lastInboxId: null,    // последний обработанный inbox-id (для перезапуска процесса)
});
```

Интерактивный пример: [`/docs/bot-example.html`](/docs/bot-example.html).

## Режим помощника (assistant)

Пользователь добавляет бота как помощника из меню бота. После этого в меню сообщений (личные и групповые чаты) появляется раздел **«Боты»**: выбранные сообщения отправляются боту в открытом виде вместе с командой из меню помощника.

### API

| Метод | Описание |
|-------|----------|
| `getAssistantMenu` / `setAssistantMenu` | Меню помощника (как `getMenu`/`setMenu`, параметр `assistantMenu` в JSON) |
| `assistantReply` | Ответ в исходный чат пользователя через `sessionId` (строго один ответ на сессию) |

### Inbox

В `getMessages` / WebSocket у сообщений с вызовом помощника есть поле `assistantSession`:

```json
{
  "assistantSession": {
    "sessionId": "...",
    "command": "assistant:describe:ask",
    "forwardedMessages": [{ "text": "...", "senderName": "..." }]
  }
}
```

Бот **не получает** `sourceChatId` — только `sessionId`. Ответ возможен только через `assistantReply({ sessionId, text, ... })`.

## Mini Apps

Интерактивные HTML-окна внутри мессенджера (sandbox iframe + bridge API). Бот публикует bundle через `sendMiniApp`; контент хранится в **сообщении** пользователя (локальная БД + кеш вложений).

| Метод | Описание |
|-------|----------|
| `sendMiniApp` | Сообщение с `mc-content type="mini_app"` и вложениями (HTML/JS/CSS) |

Inbox: поле `webAppData` при `sendData` из окна (не попадает в ленту чата).

Подробно: [08-mini-apps.md](08-mini-apps.md).

## Связанные материалы

- [01-functionality.md](01-functionality.md) — создание ботов в UI
- [03-api-reference.md](03-api-reference.md) — основной API мессенджера
