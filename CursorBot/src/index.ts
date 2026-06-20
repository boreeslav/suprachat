import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { BOT_RESTART_EXIT_CODE } from "./bot-restart.js";
import { loadConfig } from "./config.js";
import { CursorBridge } from "./cursor-bridge.js";
import { installFileLogger } from "./file-logger.js";
import { acquireInstanceLock } from "./instance-lock.js";
import { AssistantMenuManager } from "./assistant-menu-manager.js";
import { BotMenuManager } from "./bot-menu-manager.js";
import { MessageHandler } from "./message-handler.js";
import { ModelCatalog } from "./model-catalog.js";
import { ProjectCatalog } from "./project-catalog.js";
import { installProcessGuard } from "./process-guard.js";
import { deliverRestartNotice } from "./restart-notice.js";
import { SessionRegistry } from "./session-registry.js";
import { StateStore } from "./state-store.js";
import { SupraBotApi } from "./supra-bot-api.js";
import { initBotEncryption } from "./crypto/bot-encryption.js";

installFileLogger(resolve(process.env.STATE_FILE?.trim() ? dirname(process.env.STATE_FILE.trim()) : "data", "bot.log"));
installProcessGuard();

function log(...args: unknown[]): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...args);
}

process.on("beforeExit", (code) => {
  console.error(`[lifecycle] beforeExit code=${code}`);
});

process.on("exit", (code) => {
  console.error(`[lifecycle] exit code=${code}`);
});

async function main(): Promise<void> {
  const config = loadConfig();
  await acquireInstanceLock(join(dirname(config.stateFile), "bot.pid"));
  const state = new StateStore(config.stateFile);
  await state.load();

  const api = new SupraBotApi({
    baseUrl: config.supra.baseUrl,
    login: config.supra.login,
    token: config.supra.token,
  });

  const me = await api.getMe();
  if (!me.success) {
    throw new Error(me.error ?? "Не удалось авторизоваться в Bot API");
  }

  log(`Бот: ${me.name} (${me.login}), id=${me.botUserId}`);

  const encryption = await initBotEncryption(
    api,
    config.supra.masterPassword,
    me.botUserId ?? "",
    log,
  );
  if (encryption) {
    api.attachEncryption(encryption.crypto);
  }
  log(`Шифрование бота: ${encryption ? "включено" : "выключено (открытый режим)"}`);

  const projectCatalog = new ProjectCatalog(
    config.bot.projects,
    config.bot.defaultProjectId,
  );
  log(
    `Проекты: ${projectCatalog.listMenuProjects().map((p) => p.name).join(", ")} (default=${projectCatalog.defaultKey})`,
  );
  if (config.bot.allowedUser) {
    log(`Доступ: только @${config.bot.allowedUser}`);
  }

  const modelCatalog = new ModelCatalog(config.cursor.apiKey, config.cursor.proModel);
  await modelCatalog.load();
  log(
    `Cursor: runtime=${config.cursor.runtime}, defaultModel=${config.cursor.defaultModel}, proModel=${config.cursor.proModel}`,
  );

  const cursor = new CursorBridge(config.cursor, state, modelCatalog, projectCatalog);
  const sessions = new SessionRegistry(state, projectCatalog.defaultKey);
  const menuManager = new BotMenuManager(api, cursor, sessions, modelCatalog, projectCatalog);
  await menuManager.publishGlobal(true);
  const knownChatIds = state.listChatRoomIds();
  for (const pending of state.listPendingRuns()) {
    if (pending.chatId && pending.chatType) {
      menuManager.rememberChatType(pending.chatId, pending.chatType);
    }
  }
  if (knownChatIds.length) {
    await menuManager.publishAllKnownChats(knownChatIds, true);
    log(`Меню обновлено для ${knownChatIds.length} чат(ов)`);
  }
  const assistantMenuManager = new AssistantMenuManager(api, config.bot.assistant);
  await assistantMenuManager.publishGlobal(true);

  const handler = new MessageHandler(api, cursor, config, menuManager, modelCatalog, projectCatalog, sessions);

  let shuttingDown = false;

  const persistState = () => {
    const lastId = api.getLastInboxId();
    if (lastId) state.setLastInboxId(lastId);
  };

  api.connectWebSocket(
    {
      onConnected: (msg) => {
        log("WebSocket подключён, botUserId=", msg.botUserId);
        void handler.refreshPublishedActivities();
        void menuManager.publishAllKnownChats(state.listChatRoomIds(), true);
        void deliverRestartNotice(api, config.stateFile);
      },
      onMessage: (update) => {
        persistState();
        void handler.handle(update).catch((err) => {
          log("Ошибка обработки сообщения:", err);
        }).finally(persistState);
      },
      onReconnect: (attempt, delayMs) => {
        log(`WebSocket переподключение #${attempt} через ${delayMs} мс`);
      },
      onSyncStart: () => log("Синхронизация пропущенных сообщений…"),
      onSyncComplete: (n) => {
        if (n > 0) log(`Догружено пропущенных сообщений: ${n}`);
        persistState();
      },
      onSyncError: (e) => log("Ошибка синхронизации:", e),
      onError: (e) => log("WebSocket ошибка:", e),
      onClose: (e) => log(`WebSocket закрыт (code=${e.code})`),
    },
    {
      reconnect: true,
      syncMissed: true,
      lastInboxId: state.getLastInboxId(),
    },
  );

  const pingTimer = setInterval(() => api.pingWebSocket(), 60_000);

  // Явный («штатный») стоп помечается файлом data/watchdog.stop (его создаёт stop-bot.ps1
  // и проверяет watchdog.ps1). Если файла нет, сигнал считаем нештатным (закрытие окна
  // консоли, logoff, случайный Ctrl+C) и выходим кодом 42 — watchdog поднимет бот заново,
  // чтобы он не «лежал насовсем» после любого прерывания.
  const stopFile = join(dirname(config.stateFile), "watchdog.stop");

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const intentional = existsSync(stopFile);
    const exitCode = intentional ? 0 : BOT_RESTART_EXIT_CODE;
    log(
      `Остановка (${signal})… ${intentional ? "штатный стоп (код 0)" : `перезапуск через watchdog (код ${exitCode})`}`,
    );
    clearInterval(pingTimer);
    persistState();
    api.disconnectWebSocket();
    await cursor.dispose({ cancelActiveRuns: false });
    await state.flush();
    process.exit(exitCode);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  // На Windows SIGHUP приходит при закрытии окна консоли, SIGBREAK — Ctrl+Break.
  process.on("SIGHUP", () => void shutdown("SIGHUP"));
  process.on("SIGBREAK", () => void shutdown("SIGBREAK"));

  log("CursorBot запущен. Ожидание сообщений…");

  // После WebSocket: восстановление не должно блокировать старт (SDK getRun/stream может завершить процесс).
  void handler.recoverPendingRuns().catch((err) => {
    log("Ошибка восстановления pending runs:", err);
  });
}

main().catch((err) => {
  console.error("Фатальная ошибка при старте:", err);
  process.exit(1);
});
