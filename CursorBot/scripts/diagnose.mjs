import { loadConfig } from "../dist/config.js";
import { StateStore } from "../dist/state-store.js";
import { SessionRegistry } from "../dist/session-registry.js";
import { Agent } from "@cursor/sdk";

const config = loadConfig();
const state = new StateStore(config.stateFile);
await state.load();
const sessions = new SessionRegistry(state);
const chatId = "353b5456-5dd4-4441-be8b-e32f7fba19b7";

console.log("=== Session state ===");
console.log("Active session:", sessions.getActiveSessionId(chatId));
console.log("Active list:", sessions.listSessionIds(chatId));
const created = sessions.createSession(chatId);
console.log("createSession (dry, not saved):", created);

console.log("\n=== Agent.create test (15s timeout) ===");
const cwd = config.bot.projects?.[0]?.path ?? "C:/tsroot/SuperMessenger";
console.log("cwd:", cwd);

const timeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("Agent.create timeout 15s")), 15_000),
);

try {
  const agent = await Promise.race([
    Agent.create({
      apiKey: config.cursor.apiKey,
      model: { id: "default" },
      mode: "agent",
      local: { cwd },
    }),
    timeout,
  ]);
  console.log("Agent.create OK:", agent.agentId);
  await agent[Symbol.asyncDispose]();
} catch (e) {
  console.error("Agent.create FAIL:", e instanceof Error ? e.message : e);
}

console.log("\n=== Resume saved agents ===");
for (const [key, sess] of Object.entries(state.getChatSession ? {} : {})) {
  /* noop */
}
// read from state file directly
import { readFileSync } from "node:fs";
const raw = JSON.parse(readFileSync(config.stateFile, "utf8"));
for (const [sk, sess] of Object.entries(raw.chats ?? {})) {
  if (!sess.agentId) continue;
  console.log(`Resume ${sk} agent ${sess.agentId}...`);
  try {
    const agent = await Promise.race([
      Agent.resume(sess.agentId, {
        apiKey: config.cursor.apiKey,
        model: { id: "default" },
        mode: "agent",
        local: { cwd },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout 10s")), 10_000)),
    ]);
    console.log("  OK:", agent.agentId);
    await agent[Symbol.asyncDispose]();
  } catch (e) {
    console.error("  FAIL:", e instanceof Error ? e.message : e);
  }
}
