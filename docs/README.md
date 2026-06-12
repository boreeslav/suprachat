# Документация SuperMessenger

Набор документов по продукту, архитектуре, API и клиентскому коду.

| Документ | Содержание |
|----------|------------|
| [01-functionality.md](01-functionality.md) | Основной функционал для пользователей и сценарии |
| [02-architecture.md](02-architecture.md) | Архитектура, слои, хранение данных, realtime |
| [03-api-reference.md](03-api-reference.md) | REST API, методы мессенджера, SignalR, DTO |
| [04-frontend-reference.md](04-frontend-reference.md) | Классы и функции `supra-messenger.js` |
| [05-encryption.md](05-encryption.md) | E2EE: мастер-пароль, группы, API ключей |
| [06-network-sync.md](06-network-sync.md) | Сетевая логика: RequestSync, кеш, SignalR, hot path |
| [07-bot-api.md](07-bot-api.md) | Bot API: REST, WebSocket, примеры интеграции |
| [../CHANGELOG.md](../CHANGELOG.md) | История изменений по версиям |

## Быстрый старт

```bash
cd src/SuperMessenger.Web
dotnet run
```

- Веб-приложение: `http://localhost:5000` (порт из консоли)
- Первый админ: логин/пароль из `appsettings.json` (по умолчанию `admin` / `ChangeMe123!`)
- Данные: каталог `data/` (JSON-файлы)

## Структура репозитория

```
SuperMessenger/
├── src/
│   ├── SuperMessenger.Core/          # Сущности, DTO, IDataStore
│   ├── SuperMessenger.Infrastructure/ # FileDataStore, SupraMessengerService
│   └── SuperMessenger.Web/           # ASP.NET Core, контроллеры, wwwroot
├── OtbMessenger/                     # Исходная интеграция Creatio (legacy)
├── deploy/                           # deploy.ps1 для удалённого сервера
└── docs/                             # эта документация
```

## Связанные файлы клиента

| Файл | Назначение |
|------|------------|
| `wwwroot/messenger/supra-messenger.js` | Основной UI и логика |
| `wwwroot/messenger/supra-integration.js` | Точка входа SPA, auth, deep links |
| `wwwroot/messenger/supra-crypto.js` | E2EE: мастер-пароль, AES-GCM, ключи групп |
| `wwwroot/login.html` | Вход (логин и пароль учётной записи) |
| `wwwroot/messenger/supra-master-unlock.js` | Экран мастер-пароля после входа |
| `wwwroot/messenger/supra-auth-crypto.js` | Общая логика мастер-пароля для auth |
| `wwwroot/messenger/supra-messenger.css` | Стили |
| `wwwroot/messenger/file-uploader.js` | Загрузка файлов (Supra-совместимый) |
