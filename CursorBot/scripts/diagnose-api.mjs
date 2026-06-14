import { loadConfig } from "../dist/config.js";
import { SupraBotApi } from "../dist/supra-bot-api.js";

const config = loadConfig();
const api = new SupraBotApi({
  baseUrl: config.supra.baseUrl,
  login: config.supra.login,
  token: config.supra.token,
});

const me = await api.getMe();
console.log("Bot:", me);

const msgs = await api.getMessages({ count: 20 });
console.log("\n=== Last 20 inbox messages ===");
for (const m of msgs.messages ?? []) {
  const text = (m.text ?? "").slice(0, 80).replace(/\n/g, " ");
  const btn = m.buttonPress ? ` [btn:${m.buttonPress.action}]` : "";
  console.log(`${m.timestamp} id=${m.id.slice(0, 8)} chat=${m.chatId.slice(0, 8)} text="${text}"${btn}`);
}

console.log("\n=== Test sendMessage with buttons ===");
const test = await api.sendMessage({
  userLogin: config.bot.allowedUser,
  text: "[diag] Тест кнопок — можно игнорировать",
  buttons: [
    { id: "diag-1", text: "Test Agent", action: "/mode agent", color: "primary" },
    { id: "diag-2", text: "Test New", action: "/sess:new", color: "success" },
  ],
});
console.log("sendMessage:", test);
