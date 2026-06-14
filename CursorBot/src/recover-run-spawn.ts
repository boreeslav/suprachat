import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  RecoverRunWorkerInput,
  RecoverRunWorkerOutput,
} from "./recover-run-types.js";

const WORKER_PATH = join(dirname(fileURLToPath(import.meta.url)), "recover-run-worker.js");

const DEFAULT_TIMEOUT_MS = 120_000;

export async function spawnRecoverRun(
  input: RecoverRunWorkerInput,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<RecoverRunWorkerOutput> {
  return new Promise((resolve) => {
    const payload = JSON.stringify(input);
    const child = spawn(process.execPath, [WORKER_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (output: RecoverRunWorkerOutput) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(output);
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ ok: false, reason: "timeout", message: `worker timeout ${timeoutMs}ms` });
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      finish({
        ok: false,
        reason: "crashed",
        message: err.message,
      });
    });

    child.on("close", (code, signal) => {
      if (settled) return;

      if (code !== 0) {
        finish({
          ok: false,
          reason: "crashed",
          message:
            (stderr || stdout).trim().slice(0, 500) ||
            `exit code ${code ?? "?"}${signal ? ` signal ${signal}` : ""}`,
        });
        return;
      }

      const line = stdout
        .trim()
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .at(-1);

      if (!line) {
        finish({ ok: false, reason: "worker_error", message: "empty worker output" });
        return;
      }

      try {
        finish(JSON.parse(line) as RecoverRunWorkerOutput);
      } catch {
        finish({
          ok: false,
          reason: "worker_error",
          message: `invalid worker JSON: ${line.slice(0, 200)}`,
        });
      }
    });

    child.stdin.on("error", () => {
      /* ignore EPIPE if worker already exited */
    });

    try {
      child.stdin.write(payload, "utf8");
      child.stdin.end();
    } catch (err) {
      finish({
        ok: false,
        reason: "crashed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
