# Справочник клиента (supra-messenger.js)

Файл: `src/SuperMessenger.Web/wwwroot/messenger/supra-messenger.js` (~29000 строк).  
Точка входа standalone: `supra-integration.js`.

Документ — справочник по основным классам; не перечисляет все UI-модули (боты, каналы, push и т.д.).

## Дополнительные модули

| Файл | Назначение |
|------|------------|
| `supra-integration.js` | Boot SPA, deep links, auth check |
| `supra-crypto.js` | E2EE: мастер-пароль, AES-GCM, ключи групп |
| `supra-push.js` | Push-подписка, VAPID, per-chat mute |
| `supra-env.js` | Secure vs legacy режим (генерируется при деплое) |
| `supra-secure-store.js` | Persistent unlock (IndexedDB, HTTPS) |
| `supra-auth-crypto.js` | Мастер-пароль на экранах auth |
| `supra-master-unlock.js` | Экран разблокировки после входа |
| `app-mobile-viewport.js` | Масштаб UI на мобильных |
| `app-branding.js` | Загрузка брендинга из `/api/app/appearance` |
| `app-boot-timing.js` | Метрики времени загрузки |
| `wwwroot/docs/supra-bot-api.js` | JS-клиент Bot API |

---

## Глобальные функции

| Функция | Назначение |
|---------|------------|
| `lockAppScroll()` / `unlockAppScroll()` | Блокировка прокрутки `body` при модалках |
| `attachMenuDismiss(menuEl, onDismiss)` | Закрытие меню по клику вне |
| `isMobileSheetMenu()` | `innerWidth <= 1199` |
| `isMobileFullscreenModal()` | `innerWidth <= 680` |
| `applyMobileFullscreenOverlay(overlayEl)` | Класс fullscreen на overlay |
| `compressImageFile(file, maxSize, quality)` | Сжатие JPEG для аватаров |
| `openAvatarSourcePicker({ i18n, themeManager, icons, onPick })` | Bottom sheet / карточка: файл или камера |
| `mkPrivacyRow(label, i18n, value)` | Строка select приватности |
| `bindProfileStatusEditor(el, i18n, initial)` | Редактор статуса в профиле |
| `buildFolderSettingsPanel(...)` | UI настроек папок |
| `buildMessengerAppSettingsMenuItems(...)` | Пункты меню настроек приложения |
| `messengerOrigin()` | `window.location.origin` |
| `buildUserProfileUrl(login)` | `/@{login}` |
| `buildGroupProfileUrl(chatId)` | `/@{guid}` |
| `isGroupChatId(id)` | Regex UUID |
| `createProfileQrButton(...)` | Кнопка QR |

---

## MessengerI18n

Локализация `ru` / `en`.

| Метод | Описание |
|-------|----------|
| `constructor(locale)` | |
| `t(key, ...args)` | Строка с подстановкой `{name}` |
| `tActivity(type, userName)` | «печатает…» |
| `tActivityMany(count)` | Множественная активность |

---

## MessengerIcons

SVG-иконки как HTML-строки: `pencil`, `back`, `dots`, `send`, `check*`, `paperclip`, `camera`, `theme`, `folder`, `search`, `user`, `logout`, `admin`, и др.

---

## MessengerAppContext

| Статический метод | Описание |
|-------------------|----------|
| `getOrigin()` | Origin приложения |
| `getBpmCsrf()` | CSRF (пусто в standalone) |
| `toAbsoluteUrl(path)` | Абсолютный URL |

---

## MessengerFileService

| Метод | Описание |
|-------|----------|
| `getFileUrl(fileId)` | URL файла |

---

## MessengerTokenWatcher

Отслеживание смены BPMCSRF / токена (интервал по умолчанию 5 с).

| Метод | Описание |
|-------|----------|
| `constructor(onChange, intervalMs)` | |
| `start()` / `stop()` | |
| `getCurrent()` | |

---

## MessengerDialog

Модальные confirm/alert.

| Статический метод | Описание |
|-------------------|----------|
| `confirm(options)` | Promise boolean |
| `confirmWithCheckbox(options)` | Promise `{ confirmed, checked }` |
| `alert(options)` | Promise void |

Типы: `TYPE_INFO`, `TYPE_WARNING`, `TYPE_DANGER`, `TYPE_SUCCESS`.

---

## MessengerMenuBuilder

| Метод | Описание |
|-------|----------|
| `buildWindow(title, content, onClose, options)` | Панель `mc-panel-window` |
| `openInOverlay(el, class, { mobileFullscreen })` | Overlay + scroll lock |
| `#buildItem(def)` | Пункт меню (desktop / mobile sheet) |

---

## MobileBottomSheetMenu

| Статический метод | Описание |
|-------------------|----------|
| `open({ title, items, themeManager, i18n })` | Bottom sheet, стек подменю, swipe down |
| `close()` | Закрыть активный sheet |

---

## MessengerQrDialog

| Статический метод | Описание |
|-------------------|----------|
| `show({ link, title, i18n, themeManager })` | QR-код ссылки |

---

## MessengerCameraCapture

| Статический метод | Описание |
|-------------------|----------|
| `isSupported()` | `getUserMedia` доступен |
| `open({ i18n, themeManager, onCapture })` | Полноэкранная камера, JPEG File |
| `close()` | |

---

## MessengerNavigation

Единый стек навигации (history ≤1199px). Alias: `MessengerNavHistory`.

| Метод | Описание |
|-------|----------|
| `init({ onShowChatList })` | Инициализация |
| `isActive()` / `isHistoryActive()` | `innerWidth ≤ 1199` |
| `pushChat(chatId)` | Слой чата (mobile fullscreen) |
| `pushOverlay(onPop, meta)` | Модалки, подэкраны |
| `pushEphemeral(onPop, meta)` | Sheet, viewer, selection |
| `dismissTop({ reason })` | Закрыть верхний слой |
| `getStackSnapshot()` | Снимок стека (отладка) |
| `logNav(event, extra)` | Запись в `MessengerNavDebugLog` (sessionStorage, без UI) |

---

## MessengerUserProfileModal

Профиль: данные, пароль, приватность, приглашения.

| Метод | Описание |
|-------|----------|
| `open(targetRootEl, user, callbacks)` | callbacks: onUserUpdated, … |
| `close()` | |

---

## MessengerGroupProfileModal

Профиль группы: имя, аватар, участники, join link.

| Метод | Описание |
|-------|----------|
| `open(targetRootEl, chat, callbacks)` | |
| `close()` | |

---

## MessengerAttachMenu

Меню вложений в чате.

| Метод | Описание |
|-------|----------|
| `build()` | DOM меню / mobile sheet |

---

## MessengerNewChatModal

Новый чат: личный / группа.

| Метод | Описание |
|-------|----------|
| `open(onChatCreated)` | |

---

## MessengerStickyDateSeparator

Липкий разделитель даты при скролле.

| Метод | Описание |
|-------|----------|
| `observe(sepEl)` / `unobserveAll()` / `refresh()` / `destroy()` | |

---

## MessengerFileUploadBubble

Пузырь загрузки файла.

| Метод | Описание |
|-------|----------|
| `create(file)` | DOM bubble + progress |
| `static formatSize(bytes)` | |

---

## MessengerFileHandler

| Метод | Описание |
|-------|----------|
| `upload(type, chatId, msgArea, appendCallback)` | Выбор файла + upload |

---

## MessengerThemeManager

| Метод | Описание |
|-------|----------|
| `constructor(storageKey)` | |
| `apply(theme)` | |
| `applyTheme(theme)` | |
| `refreshDom(...roots)` | |
| `applyChatVars(root)` / `applyAppVars(root)` | CSS variables |
| `buildDropdown(utils, icons, i18n, onApply, root)` | Меню тем |
| `syncThemeSubmenu(menuEl)` | |

Статически: `MessengerThemeManager.THEMES`.

---

## MessengerAvatarBuilder

| Метод | Описание |
|-------|----------|
| `build(id, name, avatarUrl, size)` | Аватар или инициалы |
| `buildWithPresence(id, name, url, size, presence)` | + индикатор online |

---

## MessengerCustomMessage

Парсинг `mc-content` JSON в сообщениях.

| Статический метод | Описание |
|-------------------|----------|
| `pack(type, payload)` / `parse(text)` | |
| `isCustom(text)` / `toPreview(text)` | |
| `CONTENT_TYPES` | file, image, … |

---

## MessengerImageViewer

| Статический метод | Описание |
|-------------------|----------|
| `open(url, icons)` | Полноэкранный просмотр, pinch-zoom |

---

## MessengerUtils

| Метод | Описание |
|-------|----------|
| `mk(tag, cls)` | createElement |
| `guid()` | UUID v4 |
| `initials(name)` | |
| `formatListTime(date)` / `formatMsgTime(date)` | |
| `formatDateSeparator(date, i18n)` | |
| `static isMobile()` | `<= 680px` |
| `static initViewport(rootEl)` | safe-area / visualViewport |
| `static hideBottomNavigationBar()` / `show...` | SupraHost mobile shell (`UI.hideBottomNavigationBar`) |

---

## MessengerCache

IndexedDB кеш сообщений и файлов.

| Метод | Описание |
|-------|----------|
| `open()` | |
| `saveMessages(chatId, messages)` | |
| `getMessages(chatId, limit, offset)` | |
| `clearChat(chatId)` / `clearAll()` | |
| `putFileBlob(...)` / `getFileBlob(...)` | |

---

## MessengerMessageService

| Метод | Описание |
|-------|----------|
| `reconcileOnStartup(api, callback, ageMs)` | Синхронизация при старте |
| `mergeIncoming(chatId, messages)` | |

---

## MessengerSidebar

Сайдбар: пользователь, поиск, папки, список чатов, свайп папок.

| Метод | Описание |
|-------|----------|
| `render(onNewChat, onChatSelect)` | Построение DOM |
| `renderChatList(chats, activeChat, i18n)` | Список (с каруселью папок) |
| `updateUser(user)` | Имя, аватар, **статус** |
| `setUserStatus(text)` | Обновить статус в шапке |
| `setOnFilter(fn)` | |
| `loadFolders` / `renderFoldersBar` | Папки |
| `openArchiveFolder()` | |
| `setThemeManager(mgr)` | |
| `setConnectionStateManager(mgr)` | Индикатор сети на аватаре |

Приватные: `#bindFolderSwipe`, `#beginFolderSlide`, `#commitFolderSlide`, `#renderUserAvatar`, `#renderUserStatus`, …

---

## MessengerAppView

Главный layout приложения.

| Метод | Описание |
|-------|----------|
| `render(container)` | root, sidebar, chat area |
| `setChats(chats)` | |
| `setCurrentUser(user)` | |
| `getCurrentUser()` | |
| `loadFolders()` | |
| `openArchiveFolder()` | |
| `promptCreateFolder(chat)` | |
| `openProfileByLogin(login)` | |
| `openGroupByChatId(chatId)` | |
| `receiveMessage(chatId, msg)` | WS → UI |
| `handleHistoryCleared(chatId)` | |
| `reloadAllChats()` | |
| `isActiveChatId(chatId)` | |
| **`requestSyncBundle(msgService, api, options?)`** | Boot / reconnect / SupraSyncHint |
| `syncAfterReconnect(msgService, api)` | Обёртка над `requestSyncBundle` |
| `markReadIfEngaged(chatId)` | `MarkMessagesRead` только при непрочитанных |

Приватные: `#openChat`, `#applySyncBundle`, `#buildSyncCursors`, `#openProfileModal`, …

---

## MessengerApiClient

HTTP-обёртка над `/api/messenger/*` и REST profile/group.

Полное описание сетевой логики: **[06-network-sync.md](06-network-sync.md)**.

| Метод | Описание |
|-------|----------|
| `call(methodName, data)` | Базовый POST |
| `getCurrentUser()` | |
| `getChats()` | Fallback; основной путь — `requestSync` |
| **`requestSync({ chatCursors, includeProfiles, includeEncryptionKeys, messageLimit })`** | Бандл синхронизации |
| `importSyncEncryptionKeys(encryptionKeys)` | Ключи из бандла → `#syncWrappedKeys` |
| `cacheContactProfile(userId, profile)` / `getCachedContactProfile(userId)` | Кеш публичных профилей |
| `getContacts(page, rowCount, search)` | |
| `getAllContacts(...)` | |
| `getMessages(chatId, offset, count)` | |
| `getNewMessages(chatId, afterId, count)` | |
| `sendMessage(chatId, text, localId)` | |
| `markRead(chatId)` | |
| `createDirectChat(contactId)` | |
| `createGroup(name, participantIds)` | |
| `getOrCreateChatById(chatId, chatName)` | |
| `sendActivity(chatId, type, active)` | |
| `clearChatHistory(chatId, alsoDeleteForOther)` | |
| `leaveChat(chatId)` | |
| `getFolders()` / `saveFolder` / `deleteFolder` | |
| `setChatFolder` / `removeChatFromFolder` / `reorderFolders` | |
| `getContactProfile(userId)` / `getContactByLogin(login)` | fetch profile API |
| `getGroupInfo` / `updateGroup` | |
| `getGroupLinkPreview` / `joinGroupByLink` | |
| `uploadGroupAvatar(chatId, file)` | |
| `addGroupMembers` / `removeGroupMember` / `setGroupMemberAdmin` | |

---

## MessengerTransport

Realtime: SignalR → WebSocket → ServerChannel. Обрабатывает `SupraSyncHint` → синхронизация (см. [06-network-sync.md](06-network-sync.md)).

| Метод / свойство | Описание |
|------------------|----------|
| `constructor(onMessage, wsUrl, connectionStateMgr)` | |
| `reportActivity()` | → Hub ReportActivity |
| `#setConnectionState(state, error)` | connecting / connected / offline |

Статические: `MAX_CONNECT_ATTEMPTS`, `RETRY_DELAYS_MS`, `SIGNALR_RECONNECT_DELAYS_MS`.

---

## MessengerConnectionStateManager

| Метод | Описание |
|-------|----------|
| `setState(state, error)` | |
| `subscribe(fn)` | `(state, error) => void` |
| `state` / `error` getters | |

Состояния: `STATE_CONNECTING`, `STATE_CONNECTED`, `STATE_OFFLINE`.

---

## MessengerPresenceManager

| Метод | Описание |
|-------|----------|
| `set(userId, status)` | online / idle / offline |
| `get(userId)` | |
| `bindActivityReporting(reportFn, rootEl)` | scroll/key → activity |

---

## MessengerMessageRenderer

Рендер пузырей сообщений, activity bar, статусы.

| Метод | Описание |
|-------|----------|
| `renderMessage(msg, state)` | |
| `buildActivityBar()` | |
| `updateActivityBar(bar, activities, i18n)` | |
| `appendDateSeparator(...)` | |

---

## MessengerChatPanel

Панель одного чата (header + messages + input).

| Метод | Описание |
|-------|----------|
| `createPanel(chat, appEl, callbacks)` | |
| `appendMsg(state, msg)` | |
| `destroyPanel(state)` | |
| `setPresenceManager(mgr)` | |

Header: имя + `mc-header-sub` (статус контакта или тип чата).

---

## MessengerChatView

Режим `MODE_CHAT` — один встроенный чат.

| Метод | Описание |
|-------|----------|
| `renderPlaceholder(container, name)` | |
| `setCurrentUser(user)` | |
| `#buildHeader()` | |

---

## MessengerActivityTracker

Агрегация активностей собеседников в чате.

| Метод | Описание |
|-------|----------|
| `constructor(onUpdate)` | |
| `set(chatId, userId, type, active)` | |
| `clear()` | |

---

## class Messenger

Корневой класс приложения.

### Статические константы

- `MODE_APP` — полное приложение
- `MODE_CHAT` — один чат

### Конструктор

```javascript
new Messenger(selector, mode, options)
```

**options:** `locale`, `wsUrl`, `chatId`, `chatName`, `chatType`, `chatAvatar`, `fileTransferTypes`, `tokenWatchInterval`, `reconcileAgeMs`, `onBack` (MODE_CHAT).

### Публичные методы

| Метод | Описание |
|-------|----------|
| `clearChatCache(chatId)` | Очистить IndexedDB чата |
| `clearAllCache()` | Полная очистка кеша |

### Внутренний поток

- `#initApp()` / `#initChat()`
- `#onTransportMessage(body)` — маршрутизация WS
- `#onTokenChanged` — перезагрузка при смене токена
- `#onReconcileResult` — merge после reconcile

---

## supra-integration.js

| Функция | Описание |
|---------|------------|
| `boot()` | `new Messenger('#chat', MODE_APP)` |
| `handleUnauthenticated()` | Deep link preview или login |
| `showDeepLinkPreview(slug)` | Public API + карточка |
| `loginUrl()` / `gotoLogin()` | returnUrl |

Проверка: `fetch('/api/auth/me')` → boot или preview/login.

---

## Ссылки и разметка в сообщениях

Полное описание markdown и спецтегов: **[10-message-markup.md](10-message-markup.md)**.

Парсинг и обработка кликов — в `supra-messenger.js` (модуль рендера сообщений).

| Функция | Описание |
|---------|----------|
| `parseMessengerDeepLink(href)` | Навигация: `/@slug`, ветка, `?m=` |
| `parseMessengerSendLink(href)` | Ссылка-команда: `/send?text=` или `?t=` |
| `buildMessengerSendLink(text)` | Сборка URL команды для текущего origin |
| `isMessengerInternalLink(href)` | Deep link или send link |
| `canActivateMessengerSendLink(state, msg, memberIndex?)` | Активна ли send-ссылка в этом сообщении (от бота или админа группы) |
| `buildGroupMemberIndex(info)` | Индекс участников группы для проверки админов |
| `renderMessengerMessageHtml(text)` | Markdown → HTML + linkify |
| `normalizeMessageAnchorsInHtml(html)` | Классы `mc-msg-internal-link`, `mc-msg-send-link` |
| `interceptMessengerCopyTagClick(e, { i18n })` | Клик по `.mc-msg-copy` → clipboard |
| `copyMessageCopyTagToClipboard(el, { i18n })` | Копирование текста copy-тега |
| `copyMessageLinkToClipboard(href, …)` | Копирование URL из меню сообщения / диалога ссылки |

**Обработка клика:** `MessengerChatPanel.#bindMessageRowEvents` → send link / deep link / copy-тег / внешняя ссылка.

**CSS:** `mc-msg-internal-link` — навигация; `mc-msg-send-link` — пунктир для команд; `mc-msg-copy` — серый copy-тег.

---

## Закреплённые сообщения (UI)

См. [11-pinned-messages.md](11-pinned-messages.md).

| Элемент | Описание |
|---------|----------|
| `.mc-pinned` | Полоска закрепа над лентой |
| `.mc-pinned-preview`, `.mc-pinned-md` | Превью / развёрнутый markdown |
| `#renderPinnedBar` / `#bindPinnedBar` | Отрисовка и события панели |
| `normalizePinnedList(list)` | Нормализация ответа сервера |

API клиента: `pinMessage`, `unpinMessage`, `getPinnedMessages` (в `MessengerApiClient`).

---

## file-uploader.js

Supra-совместимый загрузчик (используется при интеграции; в standalone — через `MessengerFileHandler` + `/api/files/upload`).

---

## CSS-классы (основные)

| Класс | Назначение |
|-------|------------|
| `mapp-root`, `mapp-sidebar`, `mapp-chat-item--active` | Layout (active скрыт на mobile) |
| `mapp-modal-overlay--fullscreen` | Полноэкранные модалки |
| `mapp-bottom-sheet`, `mapp-sheet-*` | Mobile menus |
| `mapp-chat-list-track` | Карусель папок |
| `mapp-network-dot--*` | Индикатор сети |
| `mc-header-sub` | Подзаголовок чата (статус) |
| `mc-msg-internal-link` | Внутренняя навигационная ссылка в тексте сообщения |
| `mc-msg-send-link` | Ссылка-команда `/send?text=…` (пунктир) |
| `mc-msg-copy` | Copy-тег `[copy]…[/copy]` (серый фон, клик → буфер) |
| `mc-pinned`, `mc-pinned-preview` | Полоска закреплённого сообщения |
| `mapp-sidebar-user-status` | Статус под своим именем |

---

## Пороги адаптивности

| Порог | Использование |
|-------|---------------|
| 680px | mobile, fullscreen modals, chat navigation |
| 1199px | bottom sheet menus |

## Единый масштаб на мобильных

`app-mobile-viewport.js` подключается синхронно в `<head>` (`index.html`, `login.html`, `register.html`) **до** отрисовки страницы.

На устройствах с `min(screen.width, screen.height) ≤ 680` meta viewport переключается на фиксированную ширину с `initial-scale = screen.width / refWidth` (пересчёт при `orientationchange`). Базовая ширина в центральном положении ползунка — **320 CSS px** (`BASE_REF_WIDTH`).

**Масштаб в «Оформление»** — кнопка «Изменить» открывает компактный диалог с ползунком (5 ступеней); масштаб приложения меняется сразу при движении ползунка, сам диалог остаётся прежнего размера (компенсация `zoom` на оверлее). «Отмена» возвращает значение на момент открытия. localStorage `sm-ui-scale-step`, по умолчанию индекс `1` (−6%).

| Шаг | Отклонение |
|-----|------------|
| 0 | −12% |
| 1 | −6% (по умолчанию) |
| 2 | 0% |
| 3 | +6% |
| 4 | +12% |

API: `window.SmMobileViewport` (`setScaleStep`, `getScaleStep`, `getScalePercentOffset`, …).

На планшетах и десктопе остаётся `width=device-width`. Класс `html.sm-mobile-viewport` + `text-size-adjust: 100%` отключают авто-уменьшение шрифтов в WebKit.
