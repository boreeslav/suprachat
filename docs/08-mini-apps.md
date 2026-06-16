# Mini Apps — спецификация и план реализации

Модальное окно внутри SuperMessenger с HTML/JS-контентом от бота и ограниченным API (аналог Bot API для iframe).

## Ключевые решения

| Тема | Решение |
|------|---------|
| **Жизненный цикл / TTL** | Нет отдельного серверного TTL экземпляра. Контент живёт в **локальном сообщении** пользователя (личный чат с ботом или персональная доставка). Клиент открывает mini app из **локальной БД сообщений**; скрипты, стили и изображения кешируются из вложений этого сообщения. Удаление истории или очистка кеша — контент недоступен. |
| **Домен** | По умолчанию — **основной домен** мессенджера (`window.location.origin`). В манифесте опционально `baseOrigin` для будущего выноса на отдельный origin. |
| **Безопасность** | Sandbox iframe (`allow-scripts allow-forms`, без `allow-same-origin`) + postMessage bridge. Bot token и cookie мессенджера в iframe **не передаются**. |
| **Канал к боту** | `sendData` → inbox бота (`webAppData`), **не** в ленту чата (как `buttonPress`). |
| **Якорь** | Сообщение с `mc-content type="mini_app"` + вложения-bundle; кнопка «Открыть» и опциональный `autoOpen`. |

## Архитектура

```
Бот uploadFile → sendMiniApp → сообщение (mini_app + files)
                                      ↓
Клиент: IndexedDB сообщений + MiniAppCache (blob вложений)
                                      ↓
MiniAppHost: overlay → sandbox iframe → /api/mini-app/frame?token=
                                      ↕ postMessage
                              mini-app-sdk.js (внутри iframe)
```

## Формат сообщения (`mc-content`)

```json
{
  "title": "Заголовок",
  "entry": "index.html",
  "files": [
    { "path": "index.html", "fileId": "guid" },
    { "path": "app.js", "fileId": "guid" },
    { "path": "style.css", "fileId": "guid" }
  ],
  "bundleHash": "sha256…",
  "initData": {},
  "autoOpen": true,
  "reusable": true,
  "baseOrigin": null
}
```

- `baseOrigin`: `null` / пусто — основной домен; иначе абсолютный origin (`https://apps.example.com`).
- `reusable`: клиент сохраняет bundle в IndexedDB по `messageId` + `bundleHash`.
- `autoOpen`: открыть overlay при получении (если пользователь в чате и нет другого overlay).

## Bot API

### `POST /api/bot-api/sendMiniApp`

| Поле | Обяз. | Описание |
|------|-------|----------|
| `userLogin` / `chatId` | * | Цель (одно из двух) |
| `title` | да | Заголовок окна и превью в чате |
| `entry` | да | Точка входа в bundle (`index.html`) |
| `files` | да | `{ path, fileId }[]` — файлы после `uploadFile` |
| `initData` | нет | Opaque JSON для страницы |
| `autoOpen` | нет | Автооткрытие (default `false`) |
| `reusable` | нет | Кешировать bundle (default `true`) |
| `baseOrigin` | нет | Кастомный origin (default — основной) |

**Ответ:** `{ success, messageId, chatId }`

### Inbox: `webAppData`

```json
{
  "sourceMessageId": "...",
  "miniAppMessageId": "...",
  "payload": { }
}
```

## Bridge API (iframe ↔ host)

| Метод | Направление | Описание |
|-------|-------------|----------|
| `ready` | iframe → host | Снять loader |
| `close` | iframe → host | Закрыть overlay |
| `sendData` | iframe → host | Данные боту |
| `getUser` | iframe → host | `userId`, `displayName`, `avatarUrl` |
| `getContext` | iframe → host | `chatId`, `chatType`, `messageId`, `theme`, `initData` |
| `themeChanged` | host → iframe | Смена темы |

Протокол: `{ v: 1, type, requestId?, payload? }`.

## REST клиента (авторизованный пользователь)

| Метод | Описание |
|-------|----------|
| `POST /api/mini-app/session` | `{ messageId }` → `{ token, expiresAt, title, baseOrigin }` |
| `GET /api/mini-app/frame?token=` | HTML entry (CSP, sandbox) |
| `GET /api/mini-app/asset?token=&path=` | Файл из bundle |
| `POST /api/mini-app/data` | `{ token, payload }` → inbox боту |

## Кеширование (клиент)

- БД: `MiniAppCacheDB` / store `bundles`
- Ключ: `messageId` (+ `bundleHash` при обновлении)
- Значение: blobs файлов, manifest, `cachedAt`
- Инвалидация: удаление сообщения, очистка истории чата, смена `bundleHash`

---

## Чеклист реализации

Статусы: `[ ]` — не начато, `[~]` — в работе, `[x]` — готово.

### Фаза 1 — MVP (личный чат с ботом)

- [x] Документация (`08-mini-apps.md`)
- [x] `MessageAttachmentParser`: тип `mini_app`, preview, fileIds
- [x] DTO + `BotApiService.SendMiniAppAsync` + `POST sendMiniApp`
- [x] `MiniAppSessionService` + `MiniAppController` (session, frame, asset, data)
- [x] Inbox: `WebAppDataJson` + `webAppData` в Bot API
- [x] Клиент: `mini-app-cache.js`, `mini-app-sdk.js`, `mini-app-host.js`
- [x] Рендер сообщения mini_app + кнопка «Открыть» + `autoOpen`
- [ ] Пример HTML-страницы для тестового бота
- [x] Обновить `07-bot-api.md` (краткая ссылка на mini apps)

### Фаза 2 — Группы и персональность

- [ ] `BotGroupChatUserMenuRecord`: store + `setGroupUserMenu` API
- [ ] Пункт меню `{ miniApp: { messageId? / appId? } }`
- [ ] `openMiniAppForUser` (бот-админ → конкретный участник)
- [ ] WS `SupraOpenMiniApp` для push без сообщения в группе
- [ ] Контекст ветки (`chatId` ветки в `getContext`)

### Фаза 3 — Кеш и производительность

- [ ] Предзагрузка bundle при получении сообщения
- [ ] `getCachedAsset(path)` через bridge (blob URL)
- [ ] Immutable cache на сервере для шаблонов (`appId` + version)

### Фаза 4 — Polish

- [ ] Отдельный origin (`baseOrigin`) в продакшене
- [ ] Allowlist внешних URL (опционально)
- [ ] Настройка «боты могут auto-open» (opt-out)
- [ ] Аудит `openMiniAppForUser`
- [ ] Документация для авторов ботов + пример в `/docs/`

---

## Угрозы (кратко)

| Угроза | Митигация |
|--------|-----------|
| XSS в mini app | Sandbox iframe, нет доступа к DOM родителя |
| Утечка сессии | Нет cookie в iframe, короткий session token |
| Спам боту | Rate limit на `sendData`, лимит размера payload |
| Фишинг | Header «от бота X», нет доступа к формам входа |

## Связанные файлы

| Область | Файлы |
|---------|--------|
| Сервер | `BotApiService.MiniApp.cs`, `MiniAppController.cs`, `MiniAppSessionService.cs`, `BotMiniAppDtos.cs` |
| Клиент | `mini-app-host.js`, `mini-app-sdk.js`, `mini-app-cache.js`, `supra-messenger.js` |
| Сущности | `BotInboxMessageRecord.WebAppDataJson` |
