import { Agent, type AgentMessage, type ConversationTurn, type Run } from "@cursor/sdk";
import type { CursorRuntime } from "./config.js";

/** Максимум символов контекста в промпте — чтобы не переполнить лимит. */
export const MAX_AGENT_CONTEXT_CHARS = 16_000;

/** Таймаут на один SDK-запрос при сборе контекста. */
export const CAPTURE_CONTEXT_TIMEOUT_MS = 15_000;

async function withCaptureTimeout<T>(promise: Promise<T>, label: string): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`[agent-context] ${label}: timeout ${CAPTURE_CONTEXT_TIMEOUT_MS}ms`);
          resolve(undefined);
        }, CAPTURE_CONTEXT_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const CONTEXT_HEADER =
  "[Контекст предыдущей сессии агента — продолжай с учётом этого, не повторяй уже сделанное]\n\n";

export function mergeAgentContext(
  existing: string | undefined,
  captured: string | undefined,
): string | undefined {
  const parts = [existing?.trim(), captured?.trim()].filter(Boolean) as string[];
  if (!parts.length) return undefined;
  const merged = parts.join("\n\n---\n\n");
  return truncateAgentContext(merged);
}

export function truncateAgentContext(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_AGENT_CONTEXT_CHARS) return trimmed;
  return `…${trimmed.slice(trimmed.length - MAX_AGENT_CONTEXT_CHARS + 1)}`;
}

export function buildPromptWithAgentContext(fullPrompt: string, context?: string): string {
  const ctx = context?.trim();
  if (!ctx) return fullPrompt;
  return `${CONTEXT_HEADER}${ctx}\n\n---\n\n${fullPrompt}`;
}

function extractMessageText(message: unknown): string | undefined {
  if (typeof message === "string" && message.trim()) return message.trim();
  if (!message || typeof message !== "object") return undefined;
  const record = message as Record<string, unknown>;
  if (typeof record.text === "string" && record.text.trim()) return record.text.trim();
  if (Array.isArray(record.content)) {
    const parts: string[] = [];
    for (const block of record.content) {
      if (block && typeof block === "object" && typeof (block as { text?: string }).text === "string") {
        const t = (block as { text: string }).text.trim();
        if (t) parts.push(t);
      }
    }
    if (parts.length) return parts.join("\n");
  }
  return undefined;
}

export function formatAgentMessages(messages: AgentMessage[]): string | undefined {
  const lines: string[] = [];
  for (const msg of messages) {
    const text = extractMessageText(msg.message);
    if (!text) continue;
    const label = msg.type === "user" ? "Пользователь" : "Ассистент";
    lines.push(`${label}: ${text}`);
  }
  const body = lines.join("\n\n").trim();
  return body ? truncateAgentContext(body) : undefined;
}

export function formatConversationTurns(turns: ConversationTurn[]): string | undefined {
  const lines: string[] = [];

  for (const item of turns) {
    if (item.type === "agentConversationTurn") {
      const turn = item.turn;
      const userText = turn.userMessage?.text?.trim();
      if (userText) lines.push(`Пользователь: ${userText}`);

      for (const step of turn.steps ?? []) {
        if (step.type === "assistantMessage") {
          const text = step.message.text?.trim();
          if (text) lines.push(`Ассистент: ${text}`);
        } else if (step.type === "toolCall") {
          const tool = step.message;
          if (tool.type === "shell") {
            const cmd = tool.args.command?.trim();
            if (cmd) lines.push(`[shell] ${cmd}`);
          } else if ("args" in tool && tool.args && typeof tool.args === "object") {
            const args = tool.args as Record<string, unknown>;
            const path = typeof args.path === "string" ? args.path : undefined;
            lines.push(path ? `[${tool.type}] ${path}` : `[${tool.type}]`);
          }
        }
      }
      continue;
    }

    if (item.type === "shellConversationTurn") {
      const turn = item.turn;
      const cmd = turn.shellCommand?.command?.trim();
      if (cmd) lines.push(`[shell] ${cmd}`);
      const stdout = turn.shellOutput?.stdout?.trim();
      if (stdout) lines.push(`[stdout] ${stdout.slice(0, 500)}`);
    }
  }

  const body = lines.join("\n\n").trim();
  return body ? truncateAgentContext(body) : undefined;
}

export interface CaptureAgentContextOptions {
  chatId: string;
  agentId: string;
  runtime: CursorRuntime;
  cwd: string;
  apiKey: string;
  runId?: string;
  run?: Run | null;
}

/** Извлекает текстовый контекст из run/agent перед созданием новой сессии. */
export async function captureAgentContext(
  options: CaptureAgentContextOptions,
): Promise<string | undefined> {
  const { chatId, agentId, runtime, cwd, apiKey, runId, run } = options;

  const tryRunConversation = async (target: Run): Promise<string | undefined> => {
    if (!target.supports("conversation")) return undefined;
    const turns = await withCaptureTimeout(target.conversation(), "run.conversation");
    return turns ? formatConversationTurns(turns) : undefined;
  };

  if (run) {
    const fromRun = await tryRunConversation(run);
    if (fromRun) return fromRun;
  }

  if (runId) {
    const getRunOpts =
      runtime === "cloud"
        ? { runtime: "cloud" as const, agentId, apiKey }
        : { runtime: "local" as const, cwd };
    const detached = await withCaptureTimeout(Agent.getRun(runId, getRunOpts), "Agent.getRun");
    if (detached) {
      const fromDetached = await tryRunConversation(detached);
      if (fromDetached) return fromDetached;
    }
  }

  if (runtime === "local") {
    const messages = await withCaptureTimeout(
      Agent.messages.list(agentId, { cwd }),
      "Agent.messages.list",
    );
    if (messages) return formatAgentMessages(messages);
  }

  void chatId;
  return undefined;
}
