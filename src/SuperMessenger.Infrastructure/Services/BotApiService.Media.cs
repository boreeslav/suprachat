using System.Text.Json;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class BotApiService
{
    public async Task<(SupraFileRecord? file, string? error)> GetAccessibleFileAsync(
        UserRecord botUser,
        Guid fileId,
        CancellationToken ct = default)
    {
        var file = await _store.GetFileByIdAsync(fileId, ct);
        if (file == null || !System.IO.File.Exists(file.StoragePath))
            return (null, "Файл не найден");
        if (!await _files.CanUserAccessFileAsync(botUser.Id, file, ct))
            return (null, "Нет доступа к файлу");
        return (file, null);
    }

    public async Task<(string messageText, IReadOnlyList<Guid> fileIds, string? error)> BuildOutgoingMediaTextAsync(
        UserRecord botUser,
        Guid chatId,
        string? plainText,
        string? caption,
        string? photoFileId,
        IReadOnlyList<string>? photoFileIds,
        string? documentFileId,
        IReadOnlyList<string>? attachmentFileIds,
        CancellationToken ct)
    {
        var mediaCaption = FirstNonEmpty(caption, plainText)?.Trim() ?? "";

        if (!string.IsNullOrWhiteSpace(photoFileId))
        {
            var (file, error) = await LoadOutgoingFileAsync(botUser, chatId, photoFileId, ct);
            if (error != null) return ("", [], error);

            if (!string.IsNullOrEmpty(mediaCaption))
            {
                var albumPayload = new
                {
                    fileIds = new[] { file!.Id.ToString() },
                    fileNames = new[] { file.FileName },
                    fileSizes = new[] { file.Size },
                    mimeTypes = new[] { file.MimeType },
                    caption = mediaCaption,
                    chatId = chatId.ToString(),
                };
                return (MessageAttachmentParser.Pack(MessageAttachmentParser.ContentTypePhotoAlbum, albumPayload),
                    [file.Id], null);
            }

            var payload = new
            {
                fileId = file!.Id.ToString(),
                fileName = file.FileName,
                fileSize = file.Size,
                mimeType = file.MimeType,
                chatId = chatId.ToString(),
            };
            return (MessageAttachmentParser.Pack(MessageAttachmentParser.ContentTypeImage, payload),
                [file.Id], null);
        }

        var albumIds = ParseGuidList(photoFileIds);
        if (albumIds.Count > 0)
        {
            if (albumIds.Count > MessageAttachmentParser.MaxPhotoAlbumSize)
                return ("", [], $"Коллаж поддерживает до {MessageAttachmentParser.MaxPhotoAlbumSize} фото");

            var files = new List<SupraFileRecord>();
            foreach (var id in albumIds)
            {
                var (file, error) = await LoadOutgoingFileAsync(botUser, chatId, id.ToString(), ct);
                if (error != null) return ("", [], error);
                if (!IsImageFile(file!))
                    return ("", [], "Коллаж поддерживает только изображения");
                files.Add(file!);
            }

            if (files.Count == 1)
            {
                var single = files[0];
                var payload = new
                {
                    fileId = single.Id.ToString(),
                    fileName = single.FileName,
                    fileSize = single.Size,
                    mimeType = single.MimeType,
                    chatId = chatId.ToString(),
                };
                return (MessageAttachmentParser.Pack(MessageAttachmentParser.ContentTypeImage, payload),
                    [single.Id], null);
            }

            var albumPayload = new
            {
                fileIds = files.Select(f => f.Id.ToString()).ToArray(),
                fileNames = files.Select(f => f.FileName).ToArray(),
                fileSizes = files.Select(f => f.Size).ToArray(),
                mimeTypes = files.Select(f => f.MimeType).ToArray(),
                caption = mediaCaption,
                chatId = chatId.ToString(),
            };
            return (MessageAttachmentParser.Pack(MessageAttachmentParser.ContentTypePhotoAlbum, albumPayload),
                files.Select(f => f.Id).ToList(), null);
        }

        if (!string.IsNullOrWhiteSpace(documentFileId))
        {
            var (file, error) = await LoadOutgoingFileAsync(botUser, chatId, documentFileId, ct);
            if (error != null) return ("", [], error);

            var payload = new
            {
                fileId = file!.Id.ToString(),
                fileName = file.FileName,
                fileSize = file.Size,
                mimeType = file.MimeType,
                chatId = chatId.ToString(),
            };
            return (MessageAttachmentParser.Pack(MessageAttachmentParser.ContentTypeFile, payload),
                [file.Id], null);
        }

        if (attachmentFileIds is { Count: > 0 })
        {
            var ids = ParseGuidList(attachmentFileIds);
            if (ids.Count == 0)
                return ("", [], "Некорректный attachmentFileIds");

            foreach (var id in ids)
            {
                var (_, error) = await LoadOutgoingFileAsync(botUser, chatId, id.ToString(), ct);
                if (error != null) return ("", [], error);
            }

            var trimmedText = plainText?.Trim() ?? "";
            if (string.IsNullOrEmpty(trimmedText))
                return ("", [], "Укажите text с mc-content или photoFileId/photoFileIds/documentFileId");

            var parsedIds = MessageAttachmentParser.ExtractFileIds(trimmedText);
            if (parsedIds.Count == 0)
                return ("", [], "text не содержит mc-content с fileId");

            return (trimmedText, ids, null);
        }

        return (plainText?.Trim() ?? "", [], null);
    }

    async Task<(SupraFileRecord? file, string? error)> LoadOutgoingFileAsync(
        UserRecord botUser,
        Guid chatId,
        string fileIdRaw,
        CancellationToken ct)
    {
        if (!Guid.TryParse(fileIdRaw.Trim(), out var fileId))
            return (null, "Некорректный fileId");

        var (file, error) = await GetAccessibleFileAsync(botUser, fileId, ct);
        if (error != null) return (null, error);
        if (file!.ChatId != chatId)
            return (null, "Файл принадлежит другому чату");
        return (file, null);
    }

    static bool IsImageFile(SupraFileRecord file) =>
        file.MimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)
        || file.FileName.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase)
        || file.FileName.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase)
        || file.FileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase)
        || file.FileName.EndsWith(".webp", StringComparison.OrdinalIgnoreCase)
        || file.FileName.EndsWith(".gif", StringComparison.OrdinalIgnoreCase);

    static List<Guid> ParseGuidList(IReadOnlyList<string>? values)
    {
        var result = new List<Guid>();
        if (values == null) return result;
        foreach (var raw in values)
        {
            if (Guid.TryParse(raw?.Trim(), out var id))
                result.Add(id);
        }
        return result;
    }

    static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var v in values)
        {
            if (!string.IsNullOrWhiteSpace(v))
                return v;
        }
        return null;
    }

    public static BotApiMessageDto MapInboxDto(BotInboxMessageRecord m)
    {
        var media = MessageAttachmentParser.ToMediaInfo(m.Text);
        var dto = new BotApiMessageDto
        {
            id = m.Id.ToString(),
            messageId = m.MessageId.ToString(),
            chatId = m.ChatId.ToString(),
            chatType = m.ChatType,
            chatName = m.ChatName,
            senderId = m.SenderUserId.ToString(),
            senderLogin = m.SenderLogin,
            senderName = m.SenderName,
            timestamp = m.CreatedOn,
            replyToMessageId = m.ReplyToMessageId?.ToString(),
            replyToSenderName = m.ReplyToSenderName,
            replyToTextPreview = NormalizeReplyPreview(m.ReplyToTextPreview),
            buttonPress = BotMessageButtonHelper.ParseButtonPress(m.ButtonPressJson),
        };

        if (media != null)
        {
            dto.contentType = media.contentType;
            dto.caption = media.caption;
            dto.attachments = media.attachments;
            dto.text = media.caption ?? "";
        }
        else
        {
            dto.contentType = "text";
            dto.text = m.Text;
        }

        if (!string.IsNullOrWhiteSpace(m.AssistantSessionJson))
        {
            try
            {
                dto.assistantSession = JsonSerializer.Deserialize<BotAssistantSessionDto>(m.AssistantSessionJson);
            }
            catch
            {
                // ignore malformed metadata
            }
        }

        if (!string.IsNullOrWhiteSpace(m.WebAppDataJson))
        {
            try
            {
                dto.webAppData = JsonSerializer.Deserialize<BotWebAppDataDto>(m.WebAppDataJson);
                dto.contentType = "web_app_data";
                dto.text = "";
            }
            catch
            {
                // ignore malformed metadata
            }
        }

        return dto;
    }

    static string? NormalizeReplyPreview(string? preview)
    {
        if (string.IsNullOrWhiteSpace(preview)) return preview;
        if (MessageAttachmentParser.TryParse(preview) != null)
            return MessageAttachmentParser.ToPreview(preview);
        return preview;
    }
}
