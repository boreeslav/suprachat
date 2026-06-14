import { loadConfig } from "../dist/config.js";
import { SupraBotApi } from "../dist/supra-bot-api.js";
import { readFileSync } from "node:fs";

const config = loadConfig();
const state = JSON.parse(readFileSync(config.stateFile, "utf8"));
const api = new SupraBotApi({
  baseUrl: config.supra.baseUrl,
  login: config.supra.login,
  token: config.supra.token,
});

console.log("lastInboxId:", state.lastInboxId);

let afterId = state.lastInboxId;
let total = 0;
while (true) {
  const r = await api.getMessages({ count: 100, afterMessageId: afterId });
  const messages = r.messages ?? [];
  if (!messages.length) break;
  for (const m of messages) {
    total++;
    const text = (m.text ?? "").slice(0, 100).replace(/\n/g, " ");
    const btn = m.buttonPress ? ` [btn:${m.buttonPress.action}]` : "";
    console.log(`${m.timestamp} id=${m.id.slice(0, 8)} text="${text}"${btn}`);
    afterId = m.id;
  }
  if (messages.length < 100) break;
}
console.log(`\nTotal after lastInboxId: ${total}`);
