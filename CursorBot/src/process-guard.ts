/** Ловит необработанные ошибки — процесс бота не завершается из-за единичного сбоя. */
export function installProcessGuard(): void {
  process.on("uncaughtException", (err) => {
    console.error("[guard] uncaughtException:", err);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[guard] unhandledRejection:", reason);
  });
}
