import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { AppConfig } from "./config.js";
import type { BotApiFileAttachmentDto, BotApiMessage, SupraBotApi } from "./supra-bot-api.js";

export interface IngestedFile {
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  localPath: string;
  kind: "image" | "document";
}

export interface InboundMediaInfo {
  attachments: BotApiFileAttachmentDto[];
  contentType: string;
  caption: string;
  isPhotoBatch: boolean;
  isDocumentBatch: boolean;
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".heic"]);
const MC_CONTENT_RE =
  /<mc-content[^>]*type="([^"]+)"[^>]*>([\s\S]*?)<\/mc-content>/i;

export function isMcContentText(text: string | null | undefined): boolean {
  return Boolean(text?.trim() && MC_CONTENT_RE.test(text));
}

interface ParsedMcContent {
  contentType: string;
  caption: string;
  attachments: BotApiFileAttachmentDto[];
}

function stripAssistantInvisibleTag(text: string): string {
  return text.replace(/\u2060?\u200Bassistant:[0-9a-f]{32}\u200B\u2060?/gi, "").trimStart();
}

function parseMcContentFromText(text: string): ParsedMcContent | null {
  const cleaned = stripAssistantInvisibleTag(String(text || "").trim());
  if (!cleaned) return null;
  const match = MC_CONTENT_RE.exec(cleaned);
  if (!match) return null;

  const contentType = match[1].trim().toLowerCase();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(match[2]) as Record<string, unknown>;
  } catch {
    return null;
  }

  const attachments: BotApiFileAttachmentDto[] = [];
  let caption = "";

  if (contentType === "image" || contentType === "file") {
    const fileId = String(payload.fileId ?? "").trim();
    if (!fileId) return null;
    attachments.push({
      fileId,
      fileName: String(payload.fileName ?? ""),
      fileSize: Number(payload.fileSize ?? 0),
      mimeType: String(payload.mimeType ?? ""),
    });
  } else if (contentType === "photo_album") {
    caption = String(payload.caption ?? "").trim();
    const fileIds = Array.isArray(payload.fileIds) ? payload.fileIds.map(String) : [];
    const fileNames = Array.isArray(payload.fileNames) ? payload.fileNames.map(String) : [];
    const fileSizes = Array.isArray(payload.fileSizes) ? payload.fileSizes.map(Number) : [];
    const mimeTypes = Array.isArray(payload.mimeTypes) ? payload.mimeTypes.map(String) : [];
    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i]?.trim();
      if (!fileId) continue;
      attachments.push({
        fileId,
        fileName: fileNames[i] ?? "",
        fileSize: fileSizes[i] ?? 0,
        mimeType: mimeTypes[i] ?? "",
      });
    }
  } else {
    return null;
  }

  if (!attachments.length) return null;
  return { contentType, caption, attachments };
}

export function resolveInboundMedia(update: BotApiMessage): InboundMediaInfo | null {
  let attachments = update.attachments?.filter((a) => a?.fileId?.trim()) ?? [];
  let contentType = (update.contentType ?? "").trim().toLowerCase();
  let caption = (update.caption ?? "").trim();

  if (!attachments.length) {
    const sources = [update.text, update.caption].filter(Boolean) as string[];
    for (const source of sources) {
      const parsed = parseMcContentFromText(source);
      if (!parsed) continue;
      attachments = parsed.attachments;
      contentType = parsed.contentType;
      if (!caption) caption = parsed.caption;
      break;
    }
  }

  if (!attachments.length && update.assistantSession?.forwardedMessages?.length) {
    for (const msg of update.assistantSession.forwardedMessages) {
      const parsed = parseMcContentFromText(msg.text || "");
      if (parsed?.attachments.length) {
        attachments = parsed.attachments;
        contentType = parsed.contentType;
        if (!caption) caption = parsed.caption;
        break;
      }
      const fileIds = (msg.attachmentFileIds ?? []).map((id) => String(id || "").trim()).filter(Boolean);
      if (fileIds.length) {
        attachments = fileIds.map((fileId) => ({
          fileId,
          fileName: "",
          fileSize: 0,
          mimeType: "",
        }));
        contentType = fileIds.length > 1 ? "photo_album" : "image";
        break;
      }
    }
  }

  if (!attachments.length) return null;

  if (!contentType) contentType = "file";
  if (!caption && update.text && !isMcContentText(update.text)) {
    caption = update.text.trim();
  }

  const isPhotoBatch =
    contentType === "image" ||
    contentType === "photo_album" ||
    (attachments.length > 0 &&
      attachments.every((a) => isImageAttachment(a) || (!a.mimeType && !a.fileName)));

  return {
    attachments,
    contentType,
    caption,
    isPhotoBatch,
    isDocumentBatch: !isPhotoBatch,
  };
}

export function isImageAttachment(attachment: BotApiFileAttachmentDto): boolean {
  const mime = (attachment.mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const ext = extname(attachment.fileName ?? "").toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function sanitizeFileName(name: string): string {
  const base = (name || "file").replace(/[^\w.\-()+@ ]+/g, "_").trim() || "file";
  return base.slice(0, 120);
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export class MediaInboxService {
  constructor(
    private readonly api: SupraBotApi,
    private readonly config: AppConfig,
  ) {}

  async ingestAttachments(
    update: BotApiMessage,
    projectPath: string,
  ): Promise<IngestedFile[]> {
    const media = resolveInboundMedia(update);
    if (!media) return [];

    const dir = join(projectPath, "tmp", "bot-inbox", update.chatId);
    await mkdir(dir, { recursive: true });

    const ingested: IngestedFile[] = [];
    for (const attachment of media.attachments) {
      const file = await this.downloadOne(update.chatId, dir, attachment, media.isPhotoBatch);
      ingested.push(file);
    }
    return ingested;
  }

  buildPhotoAgentPrompt(files: IngestedFile[], caption: string): string {
    const fileLines = files.map(
      (f) =>
        `- ${f.localPath} (${f.fileName}, ${f.mimeType || "image"}, ${formatBytes(f.fileSize)})`,
    );

    if (caption) {
      return [
        "Пользователь отправил изображение(я) с инструкцией.",
        "",
        "Файлы:",
        ...fileLines,
        "",
        `Инструкция: ${caption}`,
        "",
        "Выполни инструкцию. Для анализа изображения открой файл(ы) по локальным путям (Read).",
      ].join("\n");
    }

    return [
      "Пользователь отправил изображение(я) без подписи.",
      "",
      "Файлы:",
      ...fileLines,
      "",
      "Опиши подробно, что изображено на фото. Если это скриншот кода, UI или документа — извлеки текст и структурируй содержимое.",
      "Открой файл(ы) по локальным путям (Read).",
    ].join("\n");
  }

  private async downloadOne(
    chatId: string,
    dir: string,
    attachment: BotApiFileAttachmentDto,
    isPhoto: boolean,
  ): Promise<IngestedFile> {
    const fileId = attachment.fileId.trim();
    const fileName = sanitizeFileName(attachment.fileName || "file");
    const ext = extname(fileName) || (isPhoto ? ".jpg" : "");
    const localPath = join(dir, `${fileId}${ext || (isPhoto ? ".jpg" : "")}`);

    const maxBytes = this.config.supra.maxFileBytes;
    if (attachment.fileSize > maxBytes) {
      throw new Error(
        `Файл «${fileName}» слишком большой (${formatBytes(attachment.fileSize)}). Лимит: ${formatBytes(maxBytes)}.`,
      );
    }

    const buffer = await this.api.downloadFile(fileId, isPhoto ? "original" : "original");
    if (buffer.byteLength > maxBytes) {
      throw new Error(
        `Файл «${fileName}» превышает лимит ${formatBytes(maxBytes)} после загрузки.`,
      );
    }

    await writeFile(localPath, Buffer.from(buffer));

    return {
      fileId,
      fileName,
      mimeType: attachment.mimeType || (isPhoto ? "image/jpeg" : "application/octet-stream"),
      fileSize: attachment.fileSize || buffer.byteLength,
      localPath,
      kind: isPhoto ? "image" : "document",
    };
  }
}
