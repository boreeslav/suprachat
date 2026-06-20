using System.Security.Cryptography;
using System.Text;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class BotApiService
{
    public static readonly TimeSpan InboxRetention = TimeSpan.FromDays(1);
    const int MaxMessageBatch = 100;

    private readonly IDataStore _store;
    private readonly SupraMessengerService _messenger;
    private readonly ChatFileService _files;
    private readonly SupraEncryptionService _encryption;

    public BotApiService(
        IDataStore store,
        SupraMessengerService messenger,
        ChatFileService files,
        SupraEncryptionService encryption)
    {
        _store = store;
        _messenger = messenger;
        _files = files;
        _encryption = encryption;
    }

    public async Task<(UserRecord botUser, BotRecord bot)?> AuthenticateAsync(
        string login, string token, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(token))
            return null;

        var loginNorm = login.Trim();
        var bot = await _store.GetBotBySlugAsync(loginNorm, ct);
        if (bot == null)
        {
            var userByLogin = await _store.GetUserByLoginAsync(loginNorm, ct);
            if (userByLogin != null && SupraMessengerService.IsBotUser(userByLogin))
                bot = await _store.GetBotByUserIdAsync(userByLogin.Id, ct);
        }

        if (bot == null || bot.DeletedOn != null || string.IsNullOrEmpty(bot.TokenHash))
            return null;

        var tokenHash = SupraMessengerService.HashBotToken(token);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(tokenHash),
                Encoding.UTF8.GetBytes(bot.TokenHash)))
            return null;

        var botUser = await _store.GetUserByIdAsync(bot.BotUserId, ct);
        if (botUser == null || !SupraMessengerService.IsBotUser(botUser) || !botUser.IsActive)
            return null;

        return (botUser, bot);
    }

    public async Task<BotApiMeResponse> GetMeAsync(UserRecord botUser, BotRecord bot, CancellationToken ct = default)
    {
        return new BotApiMeResponse
        {
            success = true,
            botUserId = botUser.Id.ToString(),
            login = bot.Slug,
            name = botUser.DisplayName,
            description = bot.Description,
            menu = BotMenuHelper.ParseMenu(bot.MenuJson),
        };
    }

    public async Task<BotApiGetMenuResponse> GetMenuAsync(BotRecord bot, string? chatId, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return new BotApiGetMenuResponse
        {
            success = true,
            menu = await ResolveMenuAsync(bot, chatId, ct),
            chatId = string.IsNullOrWhiteSpace(chatId) ? null : chatId.Trim(),
        };
    }

    public async Task<(BotApiSetMenuResponse response, SupraWsBotUpdatedPayload? updated)> SetMenuAsync(
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
                return (new BotApiSetMenuResponse { success = false, error = error }, null);

            var menuJson = BotMenuHelper.SerializeMenu(normalized!);
            string? scopeChatId = null;

            if (!string.IsNullOrWhiteSpace(chatId))
            {
                if (!Guid.TryParse(chatId.Trim(), out var chatGuid))
                    return (new BotApiSetMenuResponse { success = false, error = "Некорректный chatId" }, null);

                if (!await _store.IsParticipantAsync(chatGuid, botUser.Id, ct))
                    return (new BotApiSetMenuResponse { success = false, error = "Бот не участник чата" }, null);

                await _store.SaveBotChatMenuAsync(new BotChatMenuRecord
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
                bot.MenuJson = menuJson;
                await _store.SaveBotAsync(bot, ct);
            }

            var payload = await BuildBotUpdatedPayloadAsync(botUser, bot, scopeChatId, ct);
            return (new BotApiSetMenuResponse
            {
                success = true,
                menu = normalized,
                chatId = scopeChatId,
            }, payload);
        }
        catch (Exception ex)
        {
            return (new BotApiSetMenuResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<BotApiMenuDto> ResolveMenuAsync(
        BotRecord bot, string? chatId, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(chatId) &&
            Guid.TryParse(chatId.Trim(), out var chatGuid))
        {
            var chatMenu = await _store.GetBotChatMenuAsync(bot.BotUserId, chatGuid, ct);
            if (chatMenu != null)
                return BotMenuHelper.ParseMenu(chatMenu.MenuJson);
        }
        return BotMenuHelper.ParseMenu(bot.MenuJson);
    }

    public async Task<SupraWsBotUpdatedPayload?> BuildBotUpdatedPayloadAsync(
        UserRecord botUser,
        BotRecord bot,
        string? chatId,
        CancellationToken ct = default)
    {
        return new SupraWsBotUpdatedPayload
        {
            botUserId = botUser.Id.ToString(),
            botName = botUser.DisplayName,
            botAvatar = AvatarUrlHelper.ForUser(botUser),
            slug = bot.Slug,
            description = bot.Description,
            menu = await ResolveMenuAsync(bot, chatId, ct),
            chatId = string.IsNullOrWhiteSpace(chatId) ? null : chatId.Trim(),
        };
    }

    public async Task<(BotApiSendMessageResponse response, SupraWsNewMessagePayload? broadcast)> SendMessageAsync(
        UserRecord botUser,
        string text,
        string? userLogin,
        string? chatId,
        IReadOnlyList<BotMessageButtonDto>? buttons = null,
        string? caption = null,
        string? photoFileId = null,
        IReadOnlyList<string>? photoFileIds = null,
        string? documentFileId = null,
        IReadOnlyList<string>? attachmentFileIds = null,
        bool invisible = false,
        string? targetUserLogin = null,
        CancellationToken ct = default)
    {
        try
        {
            var hasButtons = buttons != null && buttons.Count > 0;
            var hasMediaParams = !string.IsNullOrWhiteSpace(photoFileId)
                || photoFileIds is { Count: > 0 }
                || !string.IsNullOrWhiteSpace(documentFileId)
                || attachmentFileIds is { Count: > 0 };

            var (target, targetError) = await ResolveTargetChatAsync(botUser, userLogin, chatId, requireChannelPostRights: true, ct);
            if (target == null)
                return (new BotApiSendMessageResponse { success = false, error = targetError }, null);

            var (targetUserId, targetUserError) = await ResolveTargetUserAsync(target.ChatId, targetUserLogin, ct);
            if (targetUserError != null)
                return (new BotApiSendMessageResponse { success = false, error = targetUserError }, null);

            var (messageText, fileIds, mediaError) = await BuildOutgoingMediaTextAsync(
                botUser,
                target.ChatId,
                text,
                caption,
                photoFileId,
                photoFileIds,
                documentFileId,
                attachmentFileIds,
                ct);
            if (mediaError != null)
                return (new BotApiSendMessageResponse { success = false, error = mediaError }, null);

            var trimmedText = messageText?.Trim() ?? "";
            if (string.IsNullOrEmpty(trimmedText) && !hasButtons)
                return (new BotApiSendMessageResponse { success = false, error = "Текст сообщения пуст" }, null);

            if (!string.IsNullOrEmpty(trimmedText) && SupraMessengerService.IsEncryptedPayload(trimmedText))
            {
                // Шифрованный текст бот может отправлять только в личных чатах (Этап 2).
                // Зашифрованные группы — отдельный этап.
                var targetChat = await _store.GetChatByIdAsync(target.ChatId, ct);
                if (targetChat == null || !string.Equals(targetChat.Type, "direct", StringComparison.OrdinalIgnoreCase))
                    return (new BotApiSendMessageResponse { success = false, error = "Бот отправляет шифрованные сообщения только в личных чатах" }, null);
            }

            List<BotMessageButtonDto>? normalizedButtons = null;
            if (buttons != null)
            {
                var (validated, buttonsError) = BotMessageButtonHelper.ValidateButtons(buttons.ToList());
                if (buttonsError != null)
                    return (new BotApiSendMessageResponse { success = false, error = buttonsError }, null);
                normalizedButtons = validated;
            }

            var (sendResp, broadcast) = await _messenger.SendMessageAsync(
                botUser,
                target.ChatIdString,
                trimmedText,
                encryptionTier: "basic",
                attachmentFileIds: fileIds.Count > 0 ? fileIds : null,
                buttons: normalizedButtons,
                invisible: invisible,
                targetUserId: targetUserId,
                ct: ct);

            return (new BotApiSendMessageResponse
            {
                success = sendResp.success,
                messageId = sendResp.messageId,
                chatId = target.ChatIdString,
                error = sendResp.error,
            }, broadcast);
        }
        catch (Exception ex)
        {
            return (new BotApiSendMessageResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<(BotApiSendActivityResponse response, SupraWsUserActivityPayload? broadcast)> SendActivityAsync(
        UserRecord botUser,
        string? userLogin,
        string? chatId,
        string activityType,
        bool active,
        string? activityMessage = null,
        CancellationToken ct = default)
    {
        try
        {
            var (target, targetError) = await ResolveTargetChatAsync(botUser, userLogin, chatId, requireChannelPostRights: false, ct);
            if (target == null)
                return (new BotApiSendActivityResponse { success = false, error = targetError }, null);

            var (response, payload) = _messenger.SendUserActivity(
                target.ChatIdString, activityType, active, botUser, activityMessage);
            if (!response.success)
                return (new BotApiSendActivityResponse { success = false, error = response.error }, null);

            return (new BotApiSendActivityResponse
            {
                success = true,
                chatId = target.ChatIdString,
            }, payload);
        }
        catch (Exception ex)
        {
            return (new BotApiSendActivityResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<BotApiGetActivityResponse> GetActivityAsync(
        UserRecord botUser,
        string? userLogin,
        string? chatId,
        CancellationToken ct = default)
    {
        try
        {
            var (target, targetError) = await ResolveTargetChatAsync(botUser, userLogin, chatId, requireChannelPostRights: false, ct);
            if (target == null)
                return new BotApiGetActivityResponse { success = false, error = targetError };

            if (!Guid.TryParse(target.ChatIdString, out var chatGuid))
                return new BotApiGetActivityResponse { success = false, error = "Некорректный chatId" };

            var activities = _messenger.GetUserActivitiesInChat(chatGuid, botUser.Id)
                .Select(a => new BotApiActivityDto
                {
                    activityType = a.activityType,
                    activityMessage = a.activityMessage,
                    active = true,
                    expiresAt = a.expiresAt?.ToString("O"),
                })
                .ToList();

            return new BotApiGetActivityResponse
            {
                success = true,
                chatId = target.ChatIdString,
                activities = activities,
            };
        }
        catch (Exception ex)
        {
            return new BotApiGetActivityResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(BotApiEditMessageResponse response, SupraWsMessageUpdatedPayload? broadcast)> EditMessageAsync(
        UserRecord botUser,
        string chatId,
        string messageId,
        string? text,
        IReadOnlyList<BotMessageButtonDto>? buttons = null,
        string? caption = null,
        string? photoFileId = null,
        IReadOnlyList<string>? photoFileIds = null,
        string? documentFileId = null,
        IReadOnlyList<string>? attachmentFileIds = null,
        CancellationToken ct = default)
    {
        try
        {
            var hasMediaParams = !string.IsNullOrWhiteSpace(photoFileId)
                || photoFileIds is { Count: > 0 }
                || !string.IsNullOrWhiteSpace(documentFileId)
                || attachmentFileIds is { Count: > 0 };

            if (string.IsNullOrWhiteSpace(text) && buttons == null && !hasMediaParams)
                return (new BotApiEditMessageResponse { success = false, error = "Укажите text и/или buttons" }, null);

            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new BotApiEditMessageResponse { success = false, error = "Некорректный chatId" }, null);

            if (!await _store.IsParticipantAsync(chatGuid, botUser.Id, ct))
                return (new BotApiEditMessageResponse { success = false, error = "Бот не является участником чата" }, null);

            string? trimmedText = null;
            IReadOnlyList<Guid>? fileIds = null;
            if (hasMediaParams || !string.IsNullOrWhiteSpace(text) || !string.IsNullOrWhiteSpace(caption))
            {
                var (messageText, builtFileIds, mediaError) = await BuildOutgoingMediaTextAsync(
                    botUser,
                    chatGuid,
                    text,
                    caption,
                    photoFileId,
                    photoFileIds,
                    documentFileId,
                    attachmentFileIds,
                    ct);
                if (mediaError != null)
                    return (new BotApiEditMessageResponse { success = false, error = mediaError }, null);
                trimmedText = string.IsNullOrWhiteSpace(messageText) ? null : messageText.Trim();
                fileIds = builtFileIds.Count > 0 ? builtFileIds : null;
            }

            if (trimmedText != null && SupraMessengerService.IsEncryptedPayload(trimmedText))
            {
                var targetChat = await _store.GetChatByIdAsync(chatGuid, ct);
                if (targetChat == null || !string.Equals(targetChat.Type, "direct", StringComparison.OrdinalIgnoreCase))
                    return (new BotApiEditMessageResponse { success = false, error = "Бот редактирует шифрованные сообщения только в личных чатах" }, null);
            }

            List<BotMessageButtonDto>? normalizedButtons = null;
            if (buttons != null)
            {
                var (validated, buttonsError) = BotMessageButtonHelper.ValidateButtons(buttons.ToList());
                if (buttonsError != null)
                    return (new BotApiEditMessageResponse { success = false, error = buttonsError }, null);
                normalizedButtons = validated;
            }

            var (response, broadcast) = await _messenger.EditMessageAsync(
                botUser,
                chatGuid.ToString(),
                messageId,
                trimmedText,
                attachmentFileIds: fileIds,
                buttons: normalizedButtons,
                ct);

            return (new BotApiEditMessageResponse
            {
                success = response.success,
                chatId = chatGuid.ToString(),
                messageId = response.success ? messageId : null,
                error = response.error,
            }, broadcast);
        }
        catch (Exception ex)
        {
            return (new BotApiEditMessageResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<(BotApiDeleteMessageResponse response, SupraWsDeleteMessagePayload? broadcast)> DeleteMessageAsync(
        UserRecord botUser,
        string chatId,
        string messageId,
        bool deleteForEveryone,
        CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new BotApiDeleteMessageResponse { success = false, error = "Некорректный chatId" }, null);

            if (!await _store.IsParticipantAsync(chatGuid, botUser.Id, ct))
                return (new BotApiDeleteMessageResponse { success = false, error = "Бот не является участником чата" }, null);

            var (response, broadcast, hideLocally) = await _messenger.DeleteMessageAsync(
                botUser,
                chatGuid.ToString(),
                messageId,
                deleteForEveryone,
                ct);

            string? deleteScope = null;
            if (response.success)
                deleteScope = deleteForEveryone && !hideLocally && broadcast != null ? "everyone" : "self";

            return (new BotApiDeleteMessageResponse
            {
                success = response.success,
                chatId = chatGuid.ToString(),
                messageId = response.success ? messageId : null,
                deleteScope = deleteScope,
                error = response.error,
            }, broadcast);
        }
        catch (Exception ex)
        {
            return (new BotApiDeleteMessageResponse { success = false, error = ex.Message }, null);
        }
    }

    async Task<(BotApiTargetChat? target, string? error)> ResolveTargetChatAsync(
        UserRecord botUser,
        string? userLogin,
        string? chatId,
        bool requireChannelPostRights,
        CancellationToken ct)
    {
        var hasUser = !string.IsNullOrWhiteSpace(userLogin);
        var hasChat = !string.IsNullOrWhiteSpace(chatId);
        if (hasUser == hasChat)
            return (null, "Укажите userLogin или chatId");

        if (hasUser)
        {
            var target = await _store.GetUserByLoginAsync(userLogin!.Trim(), ct);
            if (target == null || !target.IsActive || SupraMessengerService.IsBotUser(target))
                return (null, "Пользователь не найден");

            var directChatId = await FindDirectChatAsync(botUser.Id, target.Id, ct);
            if (!directChatId.HasValue)
            {
                return (null, "Чат с пользователем не найден. Пользователь должен сначала начать диалог с ботом");
            }

            return (new BotApiTargetChat(directChatId.Value), null);
        }

        if (!Guid.TryParse(chatId, out var chatGuid))
            return (null, "Некорректный chatId");

        if (!await _store.IsParticipantAsync(chatGuid, botUser.Id, ct))
            return (null, "Бот не является участником чата");

        var chat = await _store.GetChatByIdAsync(chatGuid, ct);
        if (chat == null)
            return (null, "Чат не найден");

        if (requireChannelPostRights &&
            SupraMessengerService.IsChannelChat(chat) &&
            !await _messenger.CanUserPostToChannelAsync(botUser.Id, chatGuid, ct))
        {
            return (null, "Нет права публиковать в этом канале (нужна роль admin или author)");
        }

        return (new BotApiTargetChat(chatGuid), null);
    }

    /// <summary>
    /// Преобразует логин адресата личного сообщения в id и проверяет, что он участник чата.
    /// Пустой логин — сообщение для всех (возвращает null без ошибки).
    /// </summary>
    async Task<(Guid? userId, string? error)> ResolveTargetUserAsync(
        Guid chatGuid, string? targetUserLogin, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(targetUserLogin))
            return (null, null);

        var targetUser = await _store.GetUserByLoginAsync(targetUserLogin.Trim(), ct);
        if (targetUser == null || !targetUser.IsActive)
            return (null, "Целевой пользователь не найден");
        if (!await _store.IsParticipantAsync(chatGuid, targetUser.Id, ct))
            return (null, "Целевой пользователь не является участником чата");

        return (targetUser.Id, null);
    }

    sealed record BotApiTargetChat(Guid ChatId)
    {
        public string ChatIdString => ChatId.ToString();
    }

    public async Task<BotApiGetMessagesResponse> GetMessagesAsync(
        Guid botUserId,
        int count,
        int offset,
        string? afterMessageId,
        CancellationToken ct = default)
    {
        try
        {
            var take = Math.Clamp(count <= 0 ? 50 : count, 1, MaxMessageBatch);
            var skip = Math.Max(0, offset);
            var cutoff = DateTime.UtcNow - InboxRetention;

            var ordered = (await _store.GetBotInboxMessagesAsync(botUserId, ct))
                .Where(m => m.CreatedOn >= cutoff)
                .OrderBy(m => m.CreatedOn)
                .ThenBy(m => m.Id)
                .ToList();

            List<BotInboxMessageRecord> slice;
            if (!string.IsNullOrWhiteSpace(afterMessageId) && Guid.TryParse(afterMessageId, out var afterGuid))
            {
                var idx = ordered.FindIndex(m => m.Id == afterGuid);
                slice = idx < 0
                    ? []
                    : ordered.Skip(idx + 1).Take(take).ToList();
            }
            else
            {
                slice = ordered.Skip(skip).Take(take).ToList();
            }

            return new BotApiGetMessagesResponse
            {
                success = true,
                messages = slice.Select(MapInboxDto).ToList(),
            };
        }
        catch (Exception ex)
        {
            return new BotApiGetMessagesResponse { success = false, error = ex.Message };
        }
    }

    public async Task<IReadOnlyList<BotInboxMessageRecord>> RecordIncomingMessageAsync(
        SupraChatMessageRecord message,
        SupraChatRecord chat,
        CancellationToken ct = default)
    {
        if (message.DeletedForEveryone)
            return [];

        var sender = await _store.GetUserByIdAsync(message.SenderUserId, ct);
        if (SupraMessengerService.IsBotUser(sender))
            return [];

        // Шифрованный текст доставляется боту только в личном чате и только если бот
        // поддерживает шифрование (опубликован публичный ключ) — он сам его расшифрует.
        // Зашифрованные групповые сообщения — отдельный этап.
        var isEncrypted = SupraMessengerService.IsEncryptedPayload(message.Text);
        var isDirect = string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase);

        var participants = await _store.GetParticipantsByChatAsync(chat.Id, ct);
        var created = new List<BotInboxMessageRecord>();
        foreach (var p in participants)
        {
            if (p.UserId == message.SenderUserId) continue;
            var u = await _store.GetUserByIdAsync(p.UserId, ct);
            if (!SupraMessengerService.IsBotUser(u)) continue;
            if (isEncrypted && !(isDirect && !string.IsNullOrEmpty(u?.EncryptionPublicKey)))
                continue;

            var inbox = new BotInboxMessageRecord
            {
                Id = Guid.NewGuid(),
                BotUserId = p.UserId,
                ChatId = chat.Id,
                ChatType = chat.Type,
                ChatName = chat.Name,
                MessageId = message.Id,
                SenderUserId = message.SenderUserId,
                SenderLogin = sender?.Login ?? "",
                SenderName = message.SenderName,
                Text = message.Text,
                EncryptionEnabled = chat.EncryptionEnabled,
                ReplyToMessageId = message.ReplyToMessageId,
                ReplyToSenderName = message.ReplyToSenderName,
                ReplyToTextPreview = message.ReplyToTextPreview,
                ButtonPressJson = message.ButtonPressJson,
                CreatedOn = message.CreatedOn,
            };
            await _store.SaveBotInboxMessageAsync(inbox, ct);
            created.Add(inbox);
        }

        return created;
    }

    async Task<Guid?> FindDirectChatAsync(Guid userA, Guid userB, CancellationToken ct)
    {
        var parts = await _store.GetParticipantsByUserAsync(userA, ct);
        foreach (var p in parts)
        {
            var chat = await _store.GetChatByIdAsync(p.ChatId, ct);
            if (chat == null || !string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
                continue;
            if (await _store.IsParticipantAsync(p.ChatId, userB, ct))
                return p.ChatId;
        }
        return null;
    }

}
