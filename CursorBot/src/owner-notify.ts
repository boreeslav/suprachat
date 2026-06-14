import type { SupraBotApi } from "./supra-bot-api.js";

export const OWNER_RESTART_MESSAGE = "⏳ Выполняется перезагрузка CursorBot…";
export const OWNER_STARTED_MESSAGE = "✅ CursorBot запущен и готов к работе.";

export async function notifyOwner(
  api: SupraBotApi,
  allowedUser: string | null | undefined,
  text: string,
): Promise<void> {
  const login = allowedUser?.trim();
  if (!login) return;

  try {
    const resp = await api.sendMessage({ text, userLogin: login });
    if (!resp.success) {
      console.warn("[notify] sendMessage failed:", resp.error);
    }
  } catch (err) {
    console.warn("[notify] sendMessage error:", err instanceof Error ? err.message : err);
  }
}
