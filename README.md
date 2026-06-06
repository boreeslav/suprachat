# SupraMessenger

Standalone-мессенджер (API, realtime, сущности).

## Возможности

- Чаты: личные, группы, публичные группы
- Сообщения, статусы прочтения, активность пользователя
- Загрузка файлов и изображений
- Хранение данных через `IDataStore` (сейчас — JSON-файлы, можно заменить на БД)
- Регистрация по **одноразовому** приглашению (`/register/{token}`)
- Уникальный логин при регистрации
- Профиль: имя, email, телефон, фото, смена пароля
- Админка: пользователи, приглашения, смена типа (User/Admin)
- **E2EE:** мастер-пароль, шифрование сообщений на сервере, ключи групп (авто + опциональный пароль вне канала)

## Запуск локально

```bash
cd src/SuperMessenger.Web
dotnet run
```

Откройте http://localhost:5000 (или порт из консоли).  
Первый админ: `admin` / `ChangeMe123!` (см. `appsettings.json`).

## Docker

```bash
docker compose up -d --build
```

Порт приложения в Docker по умолчанию: **8080** на `127.0.0.1` (снаружи — nginx на 80/443). Переменная `APP_PORT` в `docker-compose.yml`.

На продакшене с Let's Encrypt: `deploy/setup-https-remote.sh` и `deploy/nginx/supermessenger.conf` (nginx + certbot).

## Деплой на удалённый сервер (Windows)

1. Установите [PuTTY](https://www.putty.org/) (`plink`, `pscp` в PATH).
2. На сервере: Docker и Docker Compose.
3. Скопируйте `deploy/deploy.env.example` в `deploy/deploy.env` и заполните параметры (или введите их при первом запуске `deploy.cmd`).
4. Запустите (перед упаковкой автоматически собирается `supra-webcrypto.bundle.js` для шифрования по HTTP/IP):

```powershell
.\deploy.cmd
```

## Архитектура данных

- `SuperMessenger.Core.Abstractions.IDataStore` — абстракция хранилища
- `SuperMessenger.Infrastructure.Storage.FileDataStore` — реализация на файлах (`data/`)

## API мессенджера

`POST /api/messenger/{MethodName}` — совместимый контракт с клиентом (обёртка `{MethodName}Result}`).

Realtime: SignalR `/hubs/messenger`, тип сообщений `SupraMessenger`.

## Документация

Полное описание функционала, архитектуры, API и клиентского кода:

**[docs/README.md](docs/README.md)**

- [Основной функционал](docs/01-functionality.md)
- [Архитектура и реализация](docs/02-architecture.md)
- [Справочник API](docs/03-api-reference.md)
- [Справочник клиента (JS)](docs/04-frontend-reference.md)
