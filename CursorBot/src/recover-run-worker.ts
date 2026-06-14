import { Agent, AgentNotFoundError } from "@cursor/sdk";
import { stdin } from "node:process";
import type { RecoverRunWorkerInput, RecoverRunWorkerOutput } from "./recover-run-types.js";

const DEFAULT_STREAM_TIMEOUT_MS = 85_000;

function isNotFound(err: unknown): boolean {
  if (err instanceof AgentNotFoundError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("agent_not_found") ||
      msg.includes("agent not found") ||
      (msg.includes("run ") && msg.includes("not found"))
    );
  }
  return false;
}

function emit(output: RecoverRunWorkerOutput): void {
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}: timeout ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const raw = await readStdin();
  if (!raw) {
    emit({ ok: false, reason: "worker_error", message: "empty worker input" });
    return;
  }

  let input: RecoverRunWorkerInput;
  try {
    input = JSON.parse(raw) as RecoverRunWorkerInput;
  } catch {
    emit({ ok: false, reason: "worker_error", message: "invalid worker input JSON" });
    return;
  }

  try {
    const getRunOptions =
      input.runtime === "cloud"
        ? {
            runtime: "cloud" as const,
            agentId: input.agentId,
            apiKey: process.env.CURSOR_API_KEY ?? "",
          }
        : {
            runtime: "local" as const,
            cwd: input.cwd,
          };

    const run = await Agent.getRun(input.runId, getRunOptions);

    if (run.status === "cancelled" || run.status === "error") {
      emit({ ok: false, reason: run.status });
      return;
    }

    if (run.status === "finished") {
      const text = (run.result ?? "").trim() || "(пустой ответ)";
      emit({
        ok: true,
        reply: {
          text,
          agentId: input.agentId,
          runId: input.runId,
          status: "finished",
        },
      });
      return;
    }

    const streamTimeoutMs = Math.max(30_000, input.timeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS);

    const chunks: string[] = [];
    let streamError: string | undefined;

    if (run.supports("stream")) {
      const streamTask = (async () => {
        for await (const event of run.stream()) {
          if (event.type === "status" && event.status === "ERROR" && event.message?.trim()) {
            streamError = event.message.trim();
          }
          if (event.type === "assistant") {
            for (const block of event.message.content) {
              if (block.type === "text" && block.text) chunks.push(block.text);
            }
          }
        }
      })();
      await withTimeout(streamTask, streamTimeoutMs, "run.stream");
    }

    const result = await withTimeout(run.wait(), streamTimeoutMs, "run.wait");
    const streamed = chunks.join("").trim();
    const text = (result.result ?? streamed).trim() || "(пустой ответ)";
    const errorDetail =
      result.status === "error"
        ? streamError ?? (text !== "(пустой ответ)" ? text : undefined)
        : undefined;

    emit({
      ok: true,
      reply: {
        text,
        agentId: input.agentId,
        runId: result.id,
        status: result.status,
        errorDetail,
      },
    });
  } catch (err) {
    if (isNotFound(err)) {
      emit({
        ok: false,
        reason: "not_found",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    emit({
      ok: false,
      reason: "worker_error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

main().catch((err) => {
  emit({
    ok: false,
    reason: "worker_error",
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
