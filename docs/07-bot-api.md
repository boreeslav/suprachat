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
| `text` | да | Текст сообщения |
| `userLogin` | * | Логин пользователя — личный чат |
| `chatId` | * | ID группы или канала |

\* Укажите **либо** `userLogin`, **либо** `chatId`.

- **Личный чат** — по логину пользователя; чат должен уже существовать (пользователь начал диалог с ботом, например через `/start`). Иначе API вернёт ошибку.
- **Группа** — бот должен быть участником группы.
- **Канал** — у бота роль `owner`, `admin` или `author`.

**Пример (POST JSON):**

```json
{
  "login": "mybot_bot",
  "token": "abc...",
  "userLogin": "ivan",
  "text": "Привет!"
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
      "text": "Привет, бот!",
      "timestamp": "2026-06-11T12:00:00Z"
    }
  ]
}
```

## WebSocket

Подключение:

```
wss://host/ws/bot?login=mybot_bot&token=...
```

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

## JavaScript-клиент

Файл [`/docs/supra-bot-api.js`](../src/SuperMessenger.Web/wwwroot/docs/supra-bot-api.js) — обёртка для браузера и Node (fetch + WebSocket).

```javascript
const api = new SupraBotApi({
  baseUrl: 'https://example.com',
  login: 'mybot_bot',
  token: '...',
});

await api.sendMessage({ userLogin: 'ivan', text: 'Hello' });
const { messages } = await api.getMessages({ count: 20 });

api.connectWebSocket({
  onMessage: (update) => console.log('New:', update),
  onConnected: () => console.log('WS ready'),
});
```

Интерактивный пример: [`/docs/bot-example.html`](/docs/bot-example.html).

## Связанные материалы

- [01-functionality.md](01-functionality.md) — создание ботов в UI
- [03-api-reference.md](03-api-reference.md) — основной API мессенджера
