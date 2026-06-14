using System.Text.Json;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class BotApiService
{
    public static readonly TimeSpan AssistantSessionTtl = TimeSpan.FromHours(1);
    public const string AssistantAddMenuItemId = "_assistant_add";
    public const string AssistantRemoveMenuItemId = "_assistant_remove";

    public async Task<BotApiGetAssistantMenuResponse> GetAssistantMenuAsync(
        BotRecord bot, string? chatId, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return new BotApiGetAssistantMenuResponse
        {
            success = true,
            menu = await ResolveAssistantMenuAsync(bot, chatId, ct),
            chatId = string.IsNullOrWhiteSpace(chatId) ? null : chatId.Trim(),
        };
    }

    public async Task<(BotApiSetAssistantMenuResponse response, SupraWsBotAssistantUpdatedPayload? updated)> SetAssistantMenuAsync(
        UserRecord botUser,
        BotRecord bot,
        BotApiMenuDto? menu,
        string? chatId,
        CancellationToken ct = default)
    {
        try
        {
            var (normalized, error) = BotMenuHelper.ValidateMenu(menu);
            if (error != null)
                return (new BotApiSetAssistantMenuResponse { success = false, error = error }, null);

            var menuJson = BotMenuHelper.SerializeMenu(normalized!);
            string? scopeChatId = null;

            if (!string.IsNullOrWhiteSpace(chatId))
            {
                if (!Guid.TryParse(chatId.Trim(), out var chatGuid))
                    return (new BotApiSetAssistantMenuResponse { success = false, error = "Некорректный chatId" }, null);

                if (!await _store.IsParticipantAsync(chatGuid, botUser.Id, ct))
                    return (new BotApiSetAssistantMenuResponse { success = false, error = "Бот не участник чата" }, null);

                await _store.SaveBotAssistantChatMenuAsync(new BotAssistantChatMenuRecord
                {
                    BotUserId = botUser.Id,
                    ChatId = chatGuid,
                    MenuJson = menuJson,
                    UpdatedOn = DateTime.UtcNow,
                }, ct);
                scopeChatId = chatGuid.ToString();
            }
            else
            {
                bot.AssistantMenuJson = menuJson;
                await _store.SaveBotAsync(bot, ct);
            }

            return (new BotApiSetAssistantMenuResponse
            {
                success = true,
                menu = normalized,
                chatId = scopeChatId,
            }, BuildAssistantUpdatedPayload(botUser.Id, normalized!, scopeChatId));
        }
        catch (Exception ex)
        {
            return (new BotApiSetAssistantMenuResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<BotApiMenuDto> ResolveAssistantMenuAsync(
        BotRecord bot, string? chatId, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(chatId) &&
            Guid.TryParse(chatId.Trim(), out var chatGuid))
        {
            var chatMenu = await _store.GetBotAssistantChatMenuAsync(bot.BotUserId, chatGuid, ct);
            if (chatMenu != null)
                return BotMenuHelper.ParseMenu(chatMenu.MenuJson);
        }
        return BotMenuHelper.ParseMenu(bot.AssistantMenuJson);
    }

    public static SupraWsBotAssistantUpdatedPayload BuildAssistantUpdatedPayload(
        Guid botUserId, BotApiMenuDto menu, string? chatId) => new()
    {
        botUserId = botUserId.ToString(),
        assistantMenu = menu,
        chatId = chatId,
    };

    public async Task<(BotApiAssistantReplyResponse response, SupraWsNewMessagePayload? botChatBroadcast, SupraWsAssistantReplyPendingPayload? pending)> AssistantReplyAsync(
        UserRecord botUser,
        BotRecord bot,
        string sessionId,
        string text,
        string? caption,
        string? photoFileId,
        IReadOnlyList<string>? photoFileIds,
        string? documentFileId,
        IReadOnlyList<string>? attachmentFileIds,
        CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(sessionId, out var sessionGuid))
                return (new BotApiAssistantReplyResponse { success = false, error = "Некорректный sessionId" }, null, null);

            var session = await _store.GetBotAssistantSessionByIdAsync(sessionGuid, ct);
            if (session == null || session.BotUserId != botUser.Id)
                return (new BotApiAssistantReplyResponse { success = false, error = "Сессия не найдена" }, null, null);

            if (!string.Equals(session.Status, BotAssistantSessionStatus.Active, StringComparison.OrdinalIgnoreCase))
                return (new BotApiAssistantReplyResponse { success = false, error = "Ответ уже отправлен или сессия закрыта" }, null, null);

            if (session.ExpiresOn <= DateTime.UtcNow)
            {
                session.Status = BotAssistantSessionStatus.Expired;
                await _store.SaveBotAssistantSessionAsync(session, ct);
                return (new BotApiAssistantReplyResponse { success = false, error = "Сессия истекла" }, null, null);
            }

            var user = await _store.GetUserByIdAsync(session.UserId, ct);
            if (user == null || !user.IsActive)
                return (new BotApiAssistantReplyResponse { success = false, error = "Пользователь недоступен" }, null, null);

            var directChatId = await FindDirectChatAsync(botUser.Id, session.UserId, ct);
            if (!directChatId.HasValue)
                return (new BotApiAssistantReplyResponse { success = false, error = "Чат с пользователем не найден" }, null, null);

            var sourceChat = await _store.GetChatByIdAsync(session.SourceChatId, ct);
            var replyMeta = new BotAssistantReplyMetaDto
            {
                sessionId = session.Id.ToString(),
                sourceChatId = session.SourceChatId.ToString(),
                sourceChatName = session.SourceChatName ?? sourceChat?.Name,
                botUserId = botUser.Id.ToString(),
                botName = botUser.DisplayName,
            };

            var (messageText, fileIds, mediaError) = await BuildOutgoingMediaTextAsync(
                botUser,
                directChatId.Value,
                text,
                caption,
                photoFileId,
                photoFileIds,
                documentFileId,
                attachmentFileIds,
                ct);
            if (mediaError != null)
                return (new BotApiAssistantReplyResponse { success = false, error = mediaError }, null, null);

            var trimmedText = messageText?.Trim() ?? "";
            if (string.IsNullOrEmpty(trimmedText))
                return (new BotApiAssistantReplyResponse { success = false, error = "Текст ответа пуст" }, null, null);

            if (SupraMessengerService.IsEncryptedPayload(trimmedText))
                return (new BotApiAssistantReplyResponse { success = false, error = "Ответ должен быть в открытом виде" }, null, null);

            var (sendResp, broadcast) = await _messenger.SendMessageAsync(
                botUser,
                directChatId.Value.ToString(),
                trimmedText,
                encryptionTier: "basic",
                attachmentFileIds: fileIds.Count > 0 ? fileIds : null,
                assistantReplyJson: JsonSerializer.Serialize(replyMeta),
                ct: ct);

            if (!sendResp.success || broadcast == null || !Guid.TryParse(sendResp.messageId, out var replyMsgGuid))
                return (new BotApiAssistantReplyResponse { success = false, error = sendResp.error ?? "Не удалось отправить ответ" }, null, null);

            session.Status = BotAssistantSessionStatus.Replied;
            session.BotReplyMessageId = replyMsgGuid;
            session.RepliedOn = DateTime.UtcNow;
            await _store.SaveBotAssistantSessionAsync(session, ct);

            var pending = new SupraWsAssistantReplyPendingPayload
            {
                sessionId = session.Id.ToString(),
                sourceChatId = session.SourceChatId.ToString(),
                sourceChatName = session.SourceChatName ?? sourceChat?.Name,
                botUserId = botUser.Id.ToString(),
                botName = botUser.DisplayName,
                botMessageId = replyMsgGuid.ToString(),
                text = trimmedText,
                attachmentFileIds = fileIds.Select(f => f.ToString()).ToList(),
                repliedOn = session.RepliedOn.Value,
            };

            return (new BotApiAssistantReplyResponse
            {
                success = true,
                messageId = sendResp.messageId,
                chatId = directChatId.Value.ToString(),
                sessionId = session.Id.ToString(),
            }, broadcast, pending);
        }
        catch (Exception ex)
        {
            return (new BotApiAssistantReplyResponse { success = false, error = ex.Message }, null, null);
        }
    }

    public async Task RecordAssistantInboxAsync(
        BotInboxMessageRecord inbox,
        BotAssistantSessionDto sessionDto,
        CancellationToken ct = default)
    {
        inbox.AssistantSessionJson = JsonSerializer.Serialize(sessionDto);
        await _store.SaveBotInboxMessageAsync(inbox, ct);
    }
}
