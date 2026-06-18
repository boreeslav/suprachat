using System.Text.Json;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class BotApiService
{
    public async Task<(BotApiSendMiniAppResponse response, SupraWsNewMessagePayload? broadcast)> SendMiniAppAsync(
        UserRecord botUser,
        BotMiniAppManifestDto? manifest,
        string? userLogin,
        string? chatId,
        bool invisible = false,
        string? targetUserLogin = null,
        CancellationToken ct = default)
    {
        try
        {
            var (normalized, manifestError) = MiniAppManifestHelper.ValidateOutgoing(manifest);
            if (manifestError != null)
                return (new BotApiSendMiniAppResponse { success = false, error = manifestError }, null);

            var (target, targetError) = await ResolveTargetChatAsync(botUser, userLogin, chatId, requireChannelPostRights: true, ct);
            if (target == null)
                return (new BotApiSendMiniAppResponse { success = false, error = targetError }, null);

            var (targetUserId, targetUserError) = await ResolveTargetUserAsync(target.ChatId, targetUserLogin, ct);
            if (targetUserError != null)
                return (new BotApiSendMiniAppResponse { success = false, error = targetUserError }, null);

            long totalBytes = 0;
            foreach (var f in normalized!.files)
            {
                var (file, error) = await LoadOutgoingFileAsync(botUser, target.ChatId, f.fileId, ct);
                if (error != null)
                    return (new BotApiSendMiniAppResponse { success = false, error = $"{f.path}: {error}" }, null);
                totalBytes += file!.Size;
                if (totalBytes > MiniAppManifestHelper.MaxTotalBytes)
                    return (new BotApiSendMiniAppResponse { success = false, error = "Суммарный размер bundle превышает лимит" }, null);
            }

            var messageText = MiniAppManifestHelper.PackMessageText(normalized);
            var fileIds = normalized.files
                .Select(f => Guid.Parse(f.fileId))
                .Distinct()
                .ToList();

            var (sendResp, broadcast) = await _messenger.SendMessageAsync(
                botUser,
                target.ChatIdString,
                messageText,
                encryptionTier: "basic",
                attachmentFileIds: fileIds,
                invisible: invisible,
                targetUserId: targetUserId,
                ct: ct);

            return (new BotApiSendMiniAppResponse
            {
                success = sendResp.success,
                messageId = sendResp.messageId,
                chatId = target.ChatIdString,
                error = sendResp.error,
            }, broadcast);
        }
        catch (Exception ex)
        {
            return (new BotApiSendMiniAppResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<(bool success, string? error)> RecordWebAppDataAsync(
        Guid botUserId,
        Guid viewerUserId,
        Guid chatId,
        Guid miniAppMessageId,
        string payloadJson,
        string? sessionToken = null,
        CancellationToken ct = default)
    {
        var viewer = await _store.GetUserByIdAsync(viewerUserId, ct);
        if (viewer == null) return (false, "Пользователь не найден");

        var inbox = new BotInboxMessageRecord
        {
            Id = Guid.NewGuid(),
            BotUserId = botUserId,
            ChatId = chatId,
            ChatType = "mini_app",
            ChatName = null,
            MessageId = miniAppMessageId,
            SenderUserId = viewerUserId,
            SenderLogin = viewer.Login ?? "",
            SenderName = viewer.DisplayName ?? viewer.Login ?? "",
            Text = "",
            WebAppDataJson = JsonSerializer.Serialize(new BotWebAppDataDto
            {
                sourceMessageId = miniAppMessageId.ToString(),
                miniAppMessageId = miniAppMessageId.ToString(),
                sessionToken = sessionToken,
                payloadJson = payloadJson,
            }),
            CreatedOn = DateTime.UtcNow,
        };

        await _store.SaveBotInboxMessageAsync(inbox, ct);
        return (true, null);
    }
}
