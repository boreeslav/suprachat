# SupraMessenger

Standalone-мессенджер (REST API, SignalR realtime, JSON-хранилище с возможностью замены на БД).

## Возможности

- Чаты: личные, группы, публичные группы, **каналы**, **ветки групп**
- Сообщения: отправка, **редактирование**, **удаление**, **пересылка**, **закрепление**, inline-кнопки, markdown и copy-тег `[copy]`, статусы прочтения
- Файлы и изображения (коллажи через `mc-content`)
- Папки чатов, архив, присутствие online/idle/offline
- Регистрация по **одноразовому** приглашению (`/register/{token}`)
- Профиль: имя, email, телефон, статус (20 символов), «О себе», фото, смена пароля и логина
- Приватность: поиск, приглашения, видимость онлайна, кто может писать
- **E2EE:** мастер-пароль, шифрование на сервере (`E1:`), ключи групп
- **Боты:** создание ботов, Bot API (REST + WebSocket), режим ассистента
- **PWA:** установка на устройство, push-уведомления (VAPID)
- Админка: пользователи, приглашения, **брендинг** (логотип, тема, звуки, HTML-контент)

## Запуск локально

```bash
cd src/SuperMessenger.Web
dotnet run
```

Откройте `http://localhost:5253` (HTTP) или `https://localhost:7110` (HTTPS) — точный порт выводится в консоль.  
Первый админ: `admin` / `ChangeMe123!` (см. `appsettings.json`).  
Данные: каталог `data/` рядом с проектом.

## Docker

```bash
docker compose up -d --build
```

Порт приложения в Docker по умолчанию: **8080** на `127.0.0.1` (снаружи — nginx на 80/443). Переменная `APP_PORT` в `docker-compose.yml`.

На продакшене с Let's Encrypt: `deploy/setup-https-remote.sh <ваш-домен>` и `deploy/nginx/supermessenger.conf.example` (скопируйте в `supermessenger.conf`, замените `YOUR_DOMAIN`).

## Деплой на удалённый сервер (Windows)

1. Установите [PuTTY](https://www.putty.org/) (`plink`, `pscp` в PATH).
2. На сервере: Docker и Docker Compose.
3. Запустите `.\deploy.cmd` — при первом запуске создаётся `tmp/deploy/deploy.env` (шаблон можно скопировать из `deploy/deploy.env.example`). Папка `tmp/` в git не коммитится.
4. Перед упаковкой автоматически собираются vendor-бандлы (`supra-webcrypto`, `SupraMarkdown`, SignalR, QR).

### Скрипты деплоя

| Скрипт | Назначение |
|--------|------------|
| `deploy/deploy.ps1` | Сборка архива, загрузка на сервер, Docker deploy, HTTP-проверки |
| `deploy/deploy-all.ps1` | Один build → деплой на **основной** и **новый** сервер (`-SkipBuild` на втором) |
| `deploy/setup-new-server.ps1` | Полная настройка нового сервера: backup со старого, deploy, nginx, restore data |
| `deploy/restore-data.ps1` | Восстановление `data/` из tar.gz в Docker volume на удалённом сервере |
| `deploy/backup-data.ps1` | Резервная копия `data/` с сервера |

Параметры `deploy.ps1`: `-SkipBuild` (переиспользовать готовый архив), `-ServerHost` / `-ServerUser` / `-ServerPassword` для альтернативного сервера.  
SSH host key: `SM_DEPLOY_HOSTKEY` / `SM_DEPLOY_HOSTKEY_NEW` в `deploy.env`. После деплоя — повторные HTTP-проверки с задержкой (контейнер может подниматься 10–30 с).

## Архитектура данных

- `SuperMessenger.Core.Abstractions.IDataStore` — абстракция хранилища
- `SuperMessenger.Infrastructure.Storage.FileDataStore` — реализация на JSON-файлах (`data/`)

## API мессенджера

`POST /api/messenger/{MethodName}` — совместимый контракт с клиентом (обёртка `{MethodName}Result`).

Realtime: SignalR `/hubs/messenger`, тип сообщений `SupraMessenger`.

Дополнительно: `/api/bot-api/*` (Bot API), `/api/encryption/*` (E2EE), `/api/push/*` (уведомления), `/api/app/*` (PWA, брендинг).

## Документация

Полное описание функционала, архитектуры, API и клиентского кода:

**[docs/README.md](docs/README.md)**

- [Основной функционал](docs/01-functionality.md)
- [Архитектура и реализация](docs/02-architecture.md)
- [Справочник API](docs/03-api-reference.md)
- [Справочник клиента (JS)](docs/04-frontend-reference.md)
- [E2EE](docs/05-encryption.md)
- [Сетевая синхронизация](docs/06-network-sync.md)
- [Bot API](docs/07-bot-api.md)
- [PWA и push](docs/PWA-УСТАНОВКА.md)
- [История изменений](CHANGELOG.md)
