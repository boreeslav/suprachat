import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const RESTART_DELAY_MS = 1500;
/** Код выхода, по которому watchdog/run.cmd перезапускают бота (любой ненулевой подходит). */
export const BOT_RESTART_EXIT_CODE = 42;

function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM — процесс существует, но нет прав сигналить (для нас = жив).
    return (err as NodeJS.ErrnoException)?.code === "EPERM";
  }
}

/**
 * Жив ли watchdog, который перезапустит бота после его выхода.
 * Надёжный признак: PID из data/watchdog.pid жив, либо родитель бота — этот watchdog.
 */
function watchdogPid(stateFile: string): number | null {
  const pidFile = join(dirname(stateFile), "watchdog.pid");
  if (!existsSync(pidFile)) return null;
  let pid = 0;
  try {
    pid = Number.parseInt(readFileSync(pidFile, "utf8").trim(), 10);
  } catch {
    return null;
  }
  if (!isProcessAlive(pid)) return null;
  return pid;
}

/** Запускает отдельный safe-restart.ps1 (используется, если watchdog отсутствует). */
function spawnDetachedRestart(root: string, skipBuild: boolean): void {
  const script = join(root, "scripts", "safe-restart.ps1");
  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script];
  if (skipBuild) args.push("-SkipBuild");
  try {
    const child = spawn("powershell.exe", args, {
      cwd: root,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch (err) {
    console.error(
      "[restart] failed to spawn safe-restart:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Безопасный перезапуск бота.
 *
 * Если бота супервизирует watchdog (data/watchdog.pid жив) — бот просто завершается
 * с ненулевым кодом, и watchdog поднимает свежий процесс. Это надёжно: не зависит от
 * выживания «отвязанного» дочернего процесса после смерти бота (частая причина того,
 * что удалённый перезапуск «не срабатывал»).
 *
 * Если watchdog не найден — запускаем scripts/safe-restart.ps1 -SkipBuild как фолбэк.
 */
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
  const wd = watchdogPid(stateFile);

  if (wd) {
    setTimeout(() => {
      console.log(
        `[restart] exiting for watchdog restart (reason=${reason}, watchdog PID ${wd}, code ${BOT_RESTART_EXIT_CODE})…`,
      );
      process.exit(BOT_RESTART_EXIT_CODE);
    }, RESTART_DELAY_MS);
    return;
  }

  setTimeout(() => {
    console.log(`[restart] no watchdog — scheduling detached safe-restart (${reason})…`);
    spawnDetachedRestart(root, true);
  }, RESTART_DELAY_MS);
}
