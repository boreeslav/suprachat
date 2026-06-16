import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";

const RESTART_DELAY_MS = 1500;

/** Отложенный безопасный перезапуск через scripts/safe-restart.ps1 (watchdog поднимет бота снова). */
export async function scheduleSafeRestart(
  stateFile: string,
  flush?: () => Promise<void>,
  reason = "action",
): Promise<void> {
  try {
    if (flush) await flush();
  } catch (err) {
    console.warn("[restart] flush before restart failed:", err instanceof Error ? err.message : err);
  }

  const root = resolve(dirname(stateFile), "..");
  const script = join(root, "scripts", "safe-restart.ps1");

  setTimeout(() => {
    console.log(`[restart] scheduling safe restart (${reason})…`);
    try {
      const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
        {
          cwd: root,
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        },
      );
      child.unref();
    } catch (err) {
      console.error("[restart] failed to spawn safe-restart:", err instanceof Error ? err.message : err);
    }
  }, RESTART_DELAY_MS);
}
