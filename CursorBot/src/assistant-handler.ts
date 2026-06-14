import type { AppConfig } from "./config.js";
import type { BotApiMessage, SupraBotApi } from "./supra-bot-api.js";
import type { CursorBridge } from "./cursor-bridge.js";
import {
  detectAssistantContentType,
  detectPrimaryContentTypes,
  parseAssistantCommand,
  type AssistantConfig,
  type AssistantContentType,
} from "./assistant-config.js";
import { MediaInboxService, resolveInboundMedia } from "./media-inbox.js";
function summarizeForwardedMessages(update: BotApiMessage): string {
  const session = update.assistantSession;
  if (!session?.forwardedMessages?.length) {
    return stripAssistantInvisibleTag(update.text?.trim() || "") || "(пусто)";
  }
  const parts: string[] = [];
  for (const [idx, msg] of session.forwardedMessages.entries()) {
    const sender = msg.senderName ? `${msg.senderName}: ` : "";
    const text = stripAssistantInvisibleTag((msg.text || "").trim());
    const kind = contentKindLabel(detectAssistantContentType(text), text);
    parts.push(`[${idx + 1}] ${sender}${kind}${text ? `\n${text.slice(0, 4000)}` : ""}`);
  }
  return parts.join("\n\n");
}

function stripAssistantInvisibleTag(text: string): string {
  return text.replace(/\u2060?\u200Bassistant:[0-9a-f]{32}\u200B\u2060?/gi, "").trimStart();
}

function contentKindLabel(type: AssistantContentType, text: string): string {
  const t = text.trim();
  if (!t && type === "text") return "(пустое сообщение)\n";
  switch (type) {
    case "photo":
      return "(изображение)\n";
    case "collage":
      return "(коллаж из нескольких изображений)\n";
    case "file":
      return "(файл)\n";
    default:
      return "(текст)\n";
  }
}

export class AssistantHandler {
  private readonly mediaInbox: MediaInboxService;

  constructor(
    private readonly api: SupraBotApi,
    private readonly cursor: CursorBridge,
    private readonly config: AssistantConfig,
    appConfig: AppConfig,
  ) {
    this.mediaInbox = new MediaInboxService(api, appConfig);
  }
  async handle(update: BotApiMessage): Promise<void> {
    const session = update.assistantSession;
    if (!session?.sessionId) return;

    const parsed = parseAssistantCommand(session.command || update.text || "", this.config);
    const sessionKey = `assistant:${session.sessionId}`;
    const contentTypes = detectPrimaryContentTypes(session.forwardedMessages ?? []);
    const summary = summarizeForwardedMessages(update);
    const media = resolveInboundMedia(update);
    const mediaNote = media
      ? `Тип: ${media.contentType}, вложений: ${media.attachments.length}${media.caption ? `, подпись: ${media.caption}` : ""}`
      : "";

    let mediaPrompt = "";
    let ingestedCount = 0;
    if (media?.attachments.length) {
      try {
        await this.api.sendActivity({
          chatId: update.chatId,
          activityType: media.isPhotoBatch ? "sendingImage" : "sendingFile",
          active: true,
          activityMessage: media.isPhotoBatch ? "Скачиваю фото…" : "Скачиваю файл…",
        });
        const projectPath = this.cursor.getProjectPath(sessionKey);
        const ingested = await this.mediaInbox.ingestAttachments(update, projectPath);
        ingestedCount = ingested.length;
        if (ingested.length) {
          mediaPrompt = this.mediaInbox.buildPhotoAgentPrompt(ingested, media.caption || "");
        } else {
          throw new Error("Не удалось скачать вложения (пустой результат)");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.api.sendMessage({
          chatId: update.chatId,
          text: `❌ Не удалось получить изображение для анализа: ${msg}`,
        });
        return;
      } finally {
        try {
          await this.api.sendActivity({ chatId: update.chatId, activityType: "typing", active: false });
        } catch {
          /* ignore */
        }
      }
    }

    const runMode = ingestedCount > 0 ? "agent" : parsed.mode;
    const typeHints = [...contentTypes]
      .map((t) => this.config.contentTypes[t]?.hint || this.config.contentTypes[t]?.label || t)
      .join(", ");

    const actionPrompt = mediaPrompt
      ? parsed.action === "describe"
        ? "Открой прикреплённые файлы и опиши, что на изображении (люди, объекты, текст, сцена)."
        : parsed.actionConfig.prompt
      : parsed.actionConfig.prompt;

    const prompt = [
      "Пользователь переслал сообщение(я) из другого чата через режим помощника.",
      `Действие: ${parsed.action}`,
      !mediaPrompt && typeHints ? `Тип контента: ${typeHints}` : "",
      "",
      mediaPrompt ? "" : "Содержимое:",
      mediaPrompt ? "" : summary,
      !mediaPrompt && mediaNote ? `\nМедиа: ${mediaNote}` : "",
      mediaPrompt,
      "",
      actionPrompt,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await this.api.sendActivity({ chatId: update.chatId, activityType: "typing", active: true });
      await this.cursor.setMode(sessionKey, runMode);
      const reply = await this.cursor.ask(sessionKey, prompt, {
        promptIsComplete: true,
        forceNewAgent: true,
        senderName: update.senderName,
        chatType: update.chatType,
        chatName: update.chatName,
      });
      if (reply.superseded) return;

      const answer = (reply.text || reply.errorDetail || "").trim();
      if (!answer) {
        await this.api.sendMessage({
          chatId: update.chatId,
          text: "❌ Пустой ответ агента",
        });
        return;
      }

      const prefix = parsed.actionConfig.replyPrefix ?? "";
      const replyText = `${prefix}${answer}`;
      const resp = await this.api.assistantReply({
        sessionId: session.sessionId,
        text: replyText.slice(0, 4000),
      });
      if (!resp.success) {
        await this.api.sendMessage({
          chatId: update.chatId,
          text: `❌ Не удалось отправить ответ в чат: ${resp.error ?? "ошибка"}`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.api.sendMessage({
        chatId: update.chatId,
        text: `❌ Ошибка помощника: ${msg}`,
      });
    } finally {
      await this.api.sendActivity({ chatId: update.chatId, activityType: "typing", active: false });
      await this.cursor.disposeSession(sessionKey).catch(() => undefined);
    }
  }
}
