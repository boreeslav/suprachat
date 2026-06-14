import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

function isProcessRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleepMs(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin */
  }
}

function stopProcess(pid: number): void {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    /* ignore */
  }
}

async function waitForProcessExit(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessRunning(pid)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return !isProcessRunning(pid);
}

/** Не даёт запустить второй экземпляр бота (иначе ответы уходят дважды). */
export async function acquireInstanceLock(lockPath: string): Promise<void> {
  mkdirSync(dirname(lockPath), { recursive: true });

  if (existsSync(lockPath)) {
    const raw = readFileSync(lockPath, "utf8").trim();
    const oldPid = Number.parseInt(raw, 10);
    if (oldPid !== process.pid && isProcessRunning(oldPid)) {
      console.warn(`[lock] Останавливаем предыдущий CursorBot (PID ${oldPid})…`);
      stopProcess(oldPid);
      const stopped = await waitForProcessExit(oldPid, 8000);
      if (!stopped) {
        stopProcess(oldPid);
        sleepMs(500);
        if (isProcessRunning(oldPid)) {
          throw new Error(
            `Не удалось остановить предыдущий CursorBot (PID ${oldPid}). Завершите процесс вручную.`,
          );
        }
      }
    }
    try {
      unlinkSync(lockPath);
    } catch {
      /* ignore stale lock */
    }
  }

  writeFileSync(lockPath, String(process.pid), "utf8");

  const release = () => {
    try {
      if (existsSync(lockPath) && readFileSync(lockPath, "utf8").trim() === String(process.pid)) {
        unlinkSync(lockPath);
      }
    } catch {
      /* ignore */
    }
  };

  process.on("exit", release);
}
