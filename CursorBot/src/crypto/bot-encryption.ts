/**
 * Инициализация шифрования бота при старте.
 *
 * Если задан мастер-пароль, бот детерминированно выводит RSA-пару и публикует
 * публичный ключ на сервере (если ещё не опубликован). Без мастер-пароля бот
 * работает в открытом режиме — возвращается null.
 */
import type { SupraBotApi } from "../supra-bot-api.js";
import { SupraBotCrypto } from "./supra-bot-crypto.js";

export interface BotEncryptionInit {
  crypto: SupraBotCrypto;
  publicKeyB64: string;
  /** true — ключ был только что опубликован, false — уже был на сервере. */
  freshlyPublished: boolean;
}

type LogFn = (...args: unknown[]) => void;

export async function initBotEncryption(
  api: SupraBotApi,
  masterPassword: string | null,
  botUserId: string,
  log: LogFn,
): Promise<BotEncryptionInit | null> {
  if (!masterPassword) {
    log("Шифрование: SUPRA_BOT_MASTER_PASSWORD не задан — открытый режим.");
    return null;
  }
  if (!botUserId) {
    log("Шифрование: неизвестен botUserId — пропуск инициализации ключей.");
    return null;
  }

  const crypto = new SupraBotCrypto();

  let status;
  try {
    status = await api.getEncryptionStatus();
  } catch (err) {
    log("Шифрование: не удалось получить статус, открытый режим:", err);
    return null;
  }

  if (status.success && status.configured && status.salt) {
    await crypto.unlock(masterPassword, botUserId, status.salt);
    const derivedPub = crypto.publicKeyB64;
    if (status.publicKey && derivedPub && status.publicKey !== derivedPub) {
      log(
        "Шифрование: ВНИМАНИЕ — публичный ключ на сервере не совпадает с выведенным из текущего мастер-пароля. " +
          "Вероятно, изменился SUPRA_BOT_MASTER_PASSWORD. Чтение старых сообщений будет недоступно.",
      );
    }
    log("Шифрование: ключи активны (восстановлены из сохранённого salt).");
    return { crypto, publicKeyB64: derivedPub ?? "", freshlyPublished: false };
  }

  const payload = await crypto.setup(masterPassword, botUserId);
  let setup;
  try {
    setup = await api.setupEncryption(payload);
  } catch (err) {
    log("Шифрование: не удалось опубликовать ключи, открытый режим:", err);
    return null;
  }
  if (!setup.success) {
    log("Шифрование: публикация ключей отклонена сервером:", setup.error);
    return null;
  }
  log("Шифрование: ключи сгенерированы и опубликованы на сервере.");
  return { crypto, publicKeyB64: payload.publicKey, freshlyPublished: true };
}
