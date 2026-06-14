import { loadConfig } from "./config.js";
import {
  notifyOwner,
  OWNER_RESTART_MESSAGE,
  OWNER_STARTED_MESSAGE,
} from "./owner-notify.js";
import { SupraBotApi } from "./supra-bot-api.js";

const MESSAGES: Record<string, string> = {
  restart: OWNER_RESTART_MESSAGE,
  started: OWNER_STARTED_MESSAGE,
};

async function main(): Promise<void> {
  const kind = process.argv[2]?.trim();
  const text = kind ? MESSAGES[kind] : undefined;
  if (!text) {
    console.error("Usage: notify-owner-cli <restart|started>");
    process.exit(1);
  }

  const config = loadConfig();
  const api = new SupraBotApi({
    baseUrl: config.supra.baseUrl,
    login: config.supra.login,
    token: config.supra.token,
  });

  await notifyOwner(api, config.bot.allowedUser, text);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
