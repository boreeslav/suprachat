using System.Text.Json;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class SupraMessengerService
{
    const int ReplyPreviewMaxLen = 120;
    const int ForwardMaxContacts = 10;

    static string TruncatePreview(string? text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        var t = text.Replace('\n', ' ').Trim();
        return t.Length <= ReplyPreviewMaxLen ? t : t[..ReplyPreviewMaxLen] + "…";
    }

    async Task<HashSet<Guid>> GetDeletedMessageIdsForUserAsync(Guid userId, CancellationToken ct)
    {
        var deletions = await _store.GetMessageUserDeletionsByUserAsync(userId, ct);
        return deletions.Select(d => d.MessageId).ToHashSet();
    }

    static string MessageStatusForClient(SupraChatRecord? chat, string status) =>
        chat != null && IsChannelChat(chat) ? "sent" : status;

    SupraChatMessageDto MapMessageDto(
        SupraChatMessageRecord m,
        Guid userId,
        IReadOnlyDictionary<Guid, string?> avatarByUser,
        SupraChatRecord? chat = null)
    {
        var text = m.DeletedForEveryone ? "" : m.Text;
        var buttons = m.DeletedForEveryone ? null : ParseButtonsOrNull(m.ButtonsJson);
        return new SupraChatMessageDto
        {
            id = m.Id.ToString(),
            senderId = m.SenderUserId.ToString(),
            senderName = m.SenderName,
            senderAvatar = avatarByUser.TryGetValue(m.SenderUserId, out var av) ? av : null,
            text = text,
            timestamp = m.CreatedOn,
            status = MessageStatusForClient(chat, m.Status),
            isOwn = m.SenderUserId == userId,
            replyToMessageId = m.ReplyToMessageId?.ToString(),
            replyToSenderName = m.ReplyToSenderName,
            replyToTextPreview = m.ReplyToTextPreview,
            forwardedFromSenderName = m.ForwardedFromSenderName,
            editedOn = m.EditedOn,
            deletedForEveryone = m.DeletedForEveryone,
            encryptionTier = NormalizeEncryptionTier(m.EncryptionTier),
            buttons = buttons,
            invisible = m.Invisible,
            targetUserId = m.TargetUserId?.ToString(),
        };
    }

    static List<BotMessageButtonDto>? ParseButtonsOrNull(string? json)
    {
        var buttons = BotMessageButtonHelper.ParseButtons(json);
        return buttons.Count > 0 ? buttons : null;
    }

    static string NormalizeEncryptionTier(string? tier) =>
        string.Equals(tier, "protected", StringComparison.OrdinalIgnoreCase) ? "protected" : "basic";

    SupraWsNewMessagePayload MapNewMessagePayload(SupraChatMessageRecord m, UserRecord? sender)
    {
        var text = m.DeletedForEveryone ? "" : m.Text;
        var buttons = m.DeletedForEveryone ? null : ParseButtonsOrNull(m.ButtonsJson);
        BotAssistantReplyMetaDto? assistantReply = null;
        if (!m.DeletedForEveryone && !string.IsNullOrWhiteSpace(m.AssistantReplyJson))
        {
            try
            {
                assistantReply = JsonSerializer.Deserialize<BotAssistantReplyMetaDto>(m.AssistantReplyJson);
            }
            catch
            {
                // ignore malformed metadata
            }
        }
        return new SupraWsNewMessagePayload
        {
            chatId = m.ChatId.ToString(),
            messageId = m.Id.ToString(),
            senderId = m.SenderUserId.ToString(),
            senderName = m.SenderName,
            senderAvatar = sender != null ? AvatarUrl(sender) : null,
            text = text,
            timestamp = m.CreatedOn,
            status = m.Status,
            isOwn = false,
            replyToMessageId = m.ReplyToMessageId?.ToString(),
            replyToSenderName = m.ReplyToSenderName,
            replyToTextPreview = m.ReplyToTextPreview,
            forwardedFromSenderName = m.ForwardedFromSenderName,
            editedOn = m.EditedOn,
            deletedForEveryone = m.DeletedForEveryone,
            encryptionTier = NormalizeEncryptionTier(m.EncryptionTier),
            buttons = buttons,
            assistantReply = assistantReply,
            invisible = m.Invisible,
            targetUserId = m.TargetUserId?.ToString(),
        };
    }

    public static bool IsEncryptedPayload(string? text) =>
        !string.IsNullOrEmpty(text) && text.StartsWith("E1:", StringComparison.Ordinal);

    async Task<(Guid? replyId, string? replySender, string? replyPreview)> ResolveReplyAsync(
        Guid chatId, string? replyToMessageId, string? clientReplyPreview, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(replyToMessageId) || !Guid.TryParse(replyToMessageId, out var replyGuid))
            return (null, null, null);

        var original = await _store.GetMessageByIdAsync(replyGuid, ct);
        if (original == null || original.ChatId != chatId || original.DeletedForEveryone)
            return (null, null, null);

        var preview = !string.IsNullOrWhiteSpace(clientReplyPreview)
            ? clientReplyPreview
            : IsEncryptedPayload(original.Text)
                ? null
                : TruncatePreview(original.Text);
        return (replyGuid, original.SenderName, preview);
    }

    public async Task<(SupraSendMessageResponse response, SupraWsNewMessagePayload? broadcast)> SendMessageAsync(
        UserRecord user,
        string chatId,
        string text,
        string? replyToMessageId = null,
        string? forwardedFromSenderName = null,
        string? replyToTextPreview = null,
        string? encryptionTier = null,
        string? clientLocalId = null,
        IReadOnlyList<Guid>? attachmentFileIds = null,
        IReadOnlyList<BotMessageButtonDto>? buttons = null,
        string? assistantReplyJson = null,
        bool invisible = false,
        Guid? targetUserId = null,
        CancellationToken ct = default)
    {
        try
        {
            var normalizedButtons = default(List<BotMessageButtonDto>);
            if (buttons != null)
            {
                var (validated, buttonsError) = BotMessageButtonHelper.ValidateButtons(buttons.ToList());
                if (buttonsError != null)
                    return (new SupraSendMessageResponse { success = false, error = buttonsError }, null);
                normalizedButtons = validated;
            }

            var trimmedText = text?.Trim() ?? "";
            var hasButtons = normalizedButtons != null && normalizedButtons.Count > 0;
            if (string.IsNullOrEmpty(trimmedText) && !hasButtons)
                return (new SupraSendMessageResponse { success = false, error = "Текст сообщения пуст" }, null);

            var chatGuid = Guid.Parse(chatId);
            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var normalizedLocalId = string.IsNullOrWhiteSpace(clientLocalId) ? null : clientLocalId.Trim();
            if (normalizedLocalId != null)
            {
                var existing = await _store.GetMessageByClientLocalIdAsync(chatGuid, user.Id, normalizedLocalId, ct);
                if (existing != null)
                {
                    return (new SupraSendMessageResponse
                    {
                        success = true,
                        messageId = existing.Id.ToString(),
                        status = existing.Status,
                    }, null);
                }
            }

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat != null && IsChannelChat(chat))
            {
                if (!await CanUserPostToChannelAsync(user.Id, chatGuid, ct))
                    return (new SupraSendMessageResponse { success = false, error = "Нет права публиковать в этом канале" }, null);
                if (IsEncryptedPayload(text) || string.Equals(encryptionTier, "protected", StringComparison.OrdinalIgnoreCase))
                    return (new SupraSendMessageResponse { success = false, error = "Каналы не поддерживают шифрование" }, null);
            }
            else if (chat != null && string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
            {
                var parts = await _store.GetParticipantsByChatAsync(chatGuid, ct);
                var otherId = parts.FirstOrDefault(p => p.UserId != user.Id)?.UserId;
                if (otherId.HasValue)
                {
                    var otherUser = await _store.GetUserByIdAsync(otherId.Value, ct);
                    var isBotChat = IsBotUser(otherUser);
                    var senderIsBot = IsBotUser(user);

                    if (isBotChat || senderIsBot)
                    {
                        // Личный чат с ботом: шифрование разрешено, только если бот поддерживает
                        // его (опубликован публичный ключ). Доп. пароль (tier protected) недоступен —
                        // бот не владеет пользовательским паролем, поэтому такой ключ не выведет.
                        var botParty = senderIsBot ? user : otherUser;
                        var botSupportsEncryption = !string.IsNullOrEmpty(botParty?.EncryptionPublicKey);
                        if (string.Equals(encryptionTier, "protected", StringComparison.OrdinalIgnoreCase))
                            return (new SupraSendMessageResponse { success = false, error = "Чат с ботом не поддерживает дополнительный пароль шифрования" }, null);
                        if (IsEncryptedPayload(text) && !botSupportsEncryption)
                            return (new SupraSendMessageResponse { success = false, error = "Этот бот не поддерживает шифрование" }, null);
                    }

                    if (senderIsBot && otherId.HasValue)
                    {
                        if (!await IsBotUserActiveForAsync(user.Id, otherId.Value, ct))
                        {
                            return (new SupraSendMessageResponse
                            {
                                success = true,
                                messageId = Guid.NewGuid().ToString(),
                                status = "sent",
                            }, null);
                        }
                    }

                    if (!await CanWriteAsync(user.Id, otherId.Value, ct))
                        return (new SupraSendMessageResponse { success = false, error = "Пользователь ограничил входящие сообщения" }, null);
                    if (await IsDirectPairBlockedAsync(user.Id, otherId.Value, ct))
                    {
                        return (new SupraSendMessageResponse
                        {
                            success = true,
                            messageId = Guid.NewGuid().ToString(),
                            status = "sent",
                        }, null);
                    }
                }
            }
            else if (chat != null && IsGroupChat(chat))
            {
                // В зашифрованной группе текстовые сообщения обязаны быть E1:.
                // Боты без поддержки шифрования — исключение (могут слать plaintext,
                // полноценное групповое шифрование бота — отдельный этап). Медиа без текста
                // (вложения) остаются открытыми по дизайну.
                if (chat.EncryptionEnabled && !IsBotUser(user) &&
                    !string.IsNullOrEmpty(text) && !IsEncryptedPayload(text))
                    return (new SupraSendMessageResponse { success = false, error = "В зашифрованной группе сообщения должны быть зашифрованы" }, null);

                var recipients = await GetMessageRecipientUserIdsAsync(chatGuid, user.Id, ct);
                if (recipients.Count == 0)
                {
                    return (new SupraSendMessageResponse
                    {
                        success = true,
                        messageId = Guid.NewGuid().ToString(),
                        status = "sent",
                    }, null);
                }
            }

            var (replyId, replySender, replyPreview) =
                await ResolveReplyAsync(chatGuid, replyToMessageId, replyToTextPreview, ct);

            var fwdName = string.IsNullOrWhiteSpace(forwardedFromSenderName)
                ? null
                : forwardedFromSenderName.Trim();

            var msgGuid = Guid.NewGuid();
            var now = DateTime.UtcNow;
            var displayName = chat != null && IsChannelChat(chat) ? chat.Name : user.DisplayName;
            var isPlaintextChat = chat != null && (
                IsChannelChat(chat) ||
                (string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase) &&
                 await IsDirectBotChatAsync(chatGuid, ct) &&
                 !await DirectBotChatSupportsEncryptionAsync(chatGuid, ct)));
            var record = new SupraChatMessageRecord
            {
                Id = msgGuid,
                ChatId = chatGuid,
                SenderUserId = user.Id,
                SenderName = displayName,
                Text = trimmedText,
                Status = "sent",
                CreatedOn = now,
                ReplyToMessageId = replyId,
                ReplyToSenderName = replySender,
                ReplyToTextPreview = replyPreview,
                ForwardedFromSenderName = fwdName,
                EncryptionTier = isPlaintextChat ? "basic" : NormalizeEncryptionTier(encryptionTier),
                ClientLocalId = normalizedLocalId,
                ButtonsJson = hasButtons ? BotMessageButtonHelper.SerializeButtons(normalizedButtons!) : null,
                AssistantReplyJson = string.IsNullOrWhiteSpace(assistantReplyJson) ? null : assistantReplyJson.Trim(),
                Invisible = invisible,
                TargetUserId = targetUserId,
            };
            await _store.SaveMessageAsync(record, ct);
            await _files.SyncMessageAttachmentsAsync(msgGuid, chatGuid, record.Text, attachmentFileIds, ct);

            var payload = MapNewMessagePayload(record, chat != null && IsChannelChat(chat) ? null : user);
            if (chat != null && IsChannelChat(chat))
            {
                payload.senderName = chat.Name;
                payload.senderAvatar = ChannelAvatarUrl(chat);
            }
            return (new SupraSendMessageResponse
            {
                success = true,
                messageId = msgGuid.ToString(),
                status = "sent",
            }, payload);
        }
        catch (Exception ex)
        {
            return (new SupraSendMessageResponse { success = false, error = ex.Message }, null);
        }
    }

    static string BuildButtonSourcePreview(SupraChatMessageRecord source)
    {
        if (!string.IsNullOrWhiteSpace(source.Text))
            return TruncatePreview(source.Text);

        var buttons = BotMessageButtonHelper.ParseButtons(source.ButtonsJson);
        if (buttons.Count > 0)
            return TruncatePreview(buttons[0].text);

        return "";
    }

    public async Task<(SupraPressMessageButtonResponse response, SupraWsNewMessagePayload? broadcast)> PressMessageButtonAsync(
        UserRecord user,
        string chatId,
        string sourceMessageId,
        string buttonId,
        string? clientLocalId = null,
        CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sourceMessageId) || string.IsNullOrWhiteSpace(buttonId))
                return (new SupraPressMessageButtonResponse { success = false, error = "Укажите sourceMessageId и buttonId" }, null);

            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new SupraPressMessageButtonResponse { success = false, error = "Некорректный chatId" }, null);

            if (!Guid.TryParse(sourceMessageId, out var sourceGuid))
                return (new SupraPressMessageButtonResponse { success = false, error = "Некорректный sourceMessageId" }, null);

            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var normalizedLocalId = string.IsNullOrWhiteSpace(clientLocalId) ? null : clientLocalId.Trim();
            if (normalizedLocalId != null)
            {
                var existing = await _store.GetMessageByClientLocalIdAsync(chatGuid, user.Id, normalizedLocalId, ct);
                if (existing != null)
                {
                    return (new SupraPressMessageButtonResponse
                    {
                        success = true,
                        messageId = existing.Id.ToString(),
                        text = existing.Text,
                        replyToMessageId = existing.ReplyToMessageId?.ToString(),
                        replyToSenderName = existing.ReplyToSenderName,
                        replyToTextPreview = existing.ReplyToTextPreview,
                        status = existing.Status,
                    }, null);
                }
            }

            var source = await _store.GetMessageByIdAsync(sourceGuid, ct);
            if (source == null || source.ChatId != chatGuid || source.DeletedForEveryone)
                return (new SupraPressMessageButtonResponse { success = false, error = "Сообщение с кнопками не найдено" }, null);

            var sourceButtons = BotMessageButtonHelper.ParseButtons(source.ButtonsJson);
            if (sourceButtons.Count == 0)
                return (new SupraPressMessageButtonResponse { success = false, error = "У сообщения нет кнопок" }, null);

            var button = BotMessageButtonHelper.FindButton(sourceButtons, buttonId);
            if (button == null)
                return (new SupraPressMessageButtonResponse { success = false, error = "Кнопка не найдена" }, null);

            var sourceSender = await _store.GetUserByIdAsync(source.SenderUserId, ct);
            if (!IsBotUser(sourceSender))
                return (new SupraPressMessageButtonResponse { success = false, error = "Кнопки доступны только у сообщений бота" }, null);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat != null && IsChannelChat(chat))
                return (new SupraPressMessageButtonResponse { success = false, error = "Кнопки недоступны в каналах" }, null);

            if (chat != null && string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
            {
                var parts = await _store.GetParticipantsByChatAsync(chatGuid, ct);
                var otherId = parts.FirstOrDefault(p => p.UserId != user.Id)?.UserId;
                if (otherId.HasValue)
                {
                    if (!await CanWriteAsync(user.Id, otherId.Value, ct))
                        return (new SupraPressMessageButtonResponse { success = false, error = "Пользователь ограничил входящие сообщения" }, null);
                    if (await IsDirectPairBlockedAsync(user.Id, otherId.Value, ct))
                    {
                        return (new SupraPressMessageButtonResponse
                        {
                            success = true,
                            messageId = Guid.NewGuid().ToString(),
                            text = button.action,
                            status = "sent",
                        }, null);
                    }
                }
            }

            var actionText = button.action.Trim();
            var preview = BuildButtonSourcePreview(source);
            var buttonPress = new BotMessageButtonPressDto
            {
                sourceMessageId = source.Id.ToString(),
                buttonId = button.id ?? buttonId.Trim(),
                action = actionText,
            };

            var msgGuid = Guid.NewGuid();
            var now = DateTime.UtcNow;
            var record = new SupraChatMessageRecord
            {
                Id = msgGuid,
                ChatId = chatGuid,
                SenderUserId = user.Id,
                SenderName = user.DisplayName,
                Text = actionText,
                Status = "sent",
                CreatedOn = now,
                ReplyToMessageId = source.Id,
                ReplyToSenderName = source.SenderName,
                ReplyToTextPreview = preview,
                EncryptionTier = "basic",
                ClientLocalId = normalizedLocalId,
                ButtonPressJson = BotMessageButtonHelper.SerializeButtonPress(buttonPress),
            };
            await _store.SaveMessageAsync(record, ct);

            var payload = MapNewMessagePayload(record, user);
            return (new SupraPressMessageButtonResponse
            {
                success = true,
                messageId = msgGuid.ToString(),
                text = actionText,
                replyToMessageId = source.Id.ToString(),
                replyToSenderName = source.SenderName,
                replyToTextPreview = preview,
                status = "sent",
            }, payload);
        }
        catch (Exception ex)
        {
            return (new SupraPressMessageButtonResponse { success = false, error = ex.Message }, null);
        }
    }

    static int CompareMessageOrder(SupraChatMessageRecord a, SupraChatMessageRecord b)
    {
        var byTime = a.CreatedOn.CompareTo(b.CreatedOn);
        return byTime != 0 ? byTime : a.Id.CompareTo(b.Id);
    }

    static List<SupraChatMessageRecord> SliceAfterMessageId(
        List<SupraChatMessageRecord> orderedAsc,
        Guid afterGuid,
        SupraChatMessageRecord? anchor,
        Guid chatGuid)
    {
        var idx = orderedAsc.FindIndex(m => m.Id == afterGuid);
        if (idx < 0)
        {
            if (anchor == null || anchor.ChatId != chatGuid)
                return [];
            idx = orderedAsc.FindLastIndex(m => CompareMessageOrder(m, anchor) <= 0);
            if (idx < 0)
                return orderedAsc;
        }

        return orderedAsc.Skip(idx + 1).ToList();
    }

    async Task<List<SupraChatMessageRecord>> GetVisibleMessagesOrderedAsync(
        Guid chatGuid, Guid userId, CancellationToken ct)
    {
        var hiddenIds = await GetDeletedMessageIdsForUserAsync(userId, ct);
        return (await _store.GetMessagesByChatAsync(chatGuid, ct))
            .Where(m => !hiddenIds.Contains(m.Id) && !m.DeletedForEveryone && IsMessageVisibleToUser(m, userId))
            .OrderBy(m => m.CreatedOn)
            .ThenBy(m => m.Id)
            .ToList();
    }

    /// <summary>
    /// Видимость сообщения для пользователя в истории/превью:
    /// невидимые сообщения исключаются полностью (живут только как realtime-триггер для mini app),
    /// личные сообщения видны только адресату (или отправителю-боту).
    /// </summary>
    internal static bool IsMessageVisibleToUser(SupraChatMessageRecord m, Guid userId) =>
        !m.Invisible
        && (m.TargetUserId == null || m.TargetUserId == userId || m.SenderUserId == userId);

    public async Task<SupraGetMessagesResponse> GetMessagesAsync(
        Guid userId,
        string chatId,
        int offset,
        int count,
        string? afterMessageId = null,
        CancellationToken ct = default)
    {
        try
        {
            var chatGuid = Guid.Parse(chatId);
            if (!await _store.IsParticipantAsync(chatGuid, userId, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var avatarByUser = (await _store.GetUsersAsync(ct))
                .ToDictionary(u => u.Id, AvatarUrl);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            var ordered = await GetVisibleMessagesOrderedAsync(chatGuid, userId, ct);
            List<SupraChatMessageRecord> slice;

            if (!string.IsNullOrWhiteSpace(afterMessageId) && Guid.TryParse(afterMessageId, out var afterGuid))
            {
                var anchor = await _store.GetMessageByIdAsync(afterGuid, ct);
                var tail = SliceAfterMessageId(ordered, afterGuid, anchor, chatGuid);
                slice = tail.Take(Math.Max(1, count)).ToList();
            }
            else
            {
                slice = ordered
                    .OrderByDescending(m => m.CreatedOn)
                    .ThenByDescending(m => m.Id)
                    .Skip(offset)
                    .Take(count)
                    .OrderBy(m => m.CreatedOn)
                    .ThenBy(m => m.Id)
                    .ToList();
            }

            var messages = slice.Select(m => MapMessageDto(m, userId, avatarByUser, chat)).ToList();
            return new SupraGetMessagesResponse { success = true, messages = messages };
        }
        catch (Exception ex)
        {
            return new SupraGetMessagesResponse { success = false, messages = [], error = ex.Message };
        }
    }

    public async Task<SupraGetMessagesAroundResponse> GetMessagesAroundAsync(
        Guid userId,
        string chatId,
        string messageId,
        int before,
        int after,
        CancellationToken ct = default)
    {
        try
        {
            var chatGuid = Guid.Parse(chatId);
            if (!await _store.IsParticipantAsync(chatGuid, userId, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            if (!Guid.TryParse(messageId, out var msgGuid))
                return new SupraGetMessagesAroundResponse { success = false, error = "Некорректный messageId" };

            var avatarByUser = (await _store.GetUsersAsync(ct))
                .ToDictionary(u => u.Id, AvatarUrl);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            var ordered = await GetVisibleMessagesOrderedAsync(chatGuid, userId, ct);
            var idx = ordered.FindIndex(m => m.Id == msgGuid);
            if (idx < 0)
                return new SupraGetMessagesAroundResponse { success = false, error = "Сообщение не найдено" };

            var takeBefore = Math.Max(0, before);
            var takeAfter = Math.Max(0, after);
            var start = Math.Max(0, idx - takeBefore);
            var end = Math.Min(ordered.Count, idx + takeAfter + 1);
            var slice = ordered.Skip(start).Take(end - start).ToList();
            var messages = slice.Select(m => MapMessageDto(m, userId, avatarByUser, chat)).ToList();

            return new SupraGetMessagesAroundResponse
            {
                success = true,
                messages = messages,
                hasMoreBefore = start > 0,
                hasMoreAfter = end < ordered.Count,
            };
        }
        catch (Exception ex)
        {
            return new SupraGetMessagesAroundResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(SupraSyncChatPanelResponse response, List<(SupraWsStatusPayload payload, Guid senderUserId)> readUpdates)> SyncChatPanelAsync(
        Guid userId,
        string chatId,
        int? count,
        string? afterMessageId,
        bool markAsRead,
        CancellationToken ct = default)
    {
        try
        {
            var chatGuid = Guid.Parse(chatId);
            if (!await _store.IsParticipantAsync(chatGuid, userId, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var wantsSync = count is > 0 || !string.IsNullOrWhiteSpace(afterMessageId);

            if (markAsRead && !wantsSync)
            {
                var (markResponse, updates) = await MarkMessagesReadAsync(userId, chatId, ct);
                return (new SupraSyncChatPanelResponse
                {
                    success = markResponse.success,
                    markedRead = markResponse.success,
                    error = markResponse.error,
                }, updates);
            }

            if (!wantsSync)
            {
                return (new SupraSyncChatPanelResponse
                {
                    success = false,
                    error = "Укажите count или afterMessageId для синхронизации, либо markAsRead для прочтения",
                }, []);
            }

            var avatarByUser = (await _store.GetUsersAsync(ct))
                .ToDictionary(u => u.Id, AvatarUrl);
            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            var ordered = await GetVisibleMessagesOrderedAsync(chatGuid, userId, ct);

            var syncEntries = ordered.Select(m => new SupraMessageSyncEntryDto
            {
                id = m.Id.ToString(),
                timestamp = m.CreatedOn,
            }).ToList();

            var takeCount = count ?? 0;
            var tailLimit = takeCount > 0 ? takeCount : 50;

            var recentSlice = takeCount > 0
                ? ordered
                    .OrderByDescending(m => m.CreatedOn)
                    .ThenByDescending(m => m.Id)
                    .Take(takeCount)
                    .OrderBy(m => m.CreatedOn)
                    .ThenBy(m => m.Id)
                    .ToList()
                : [];

            List<SupraChatMessageRecord> tailSlice = [];
            if (!string.IsNullOrWhiteSpace(afterMessageId) && Guid.TryParse(afterMessageId, out var afterGuid))
            {
                var anchor = await _store.GetMessageByIdAsync(afterGuid, ct);
                tailSlice = SliceAfterMessageId(ordered, afterGuid, anchor, chatGuid)
                    .Take(tailLimit)
                    .ToList();
            }

            var recentIds = recentSlice.Select(m => m.Id).ToHashSet();
            var messageRecords = recentSlice
                .Concat(tailSlice.Where(m => !recentIds.Contains(m.Id)))
                .OrderBy(m => m.CreatedOn)
                .ThenBy(m => m.Id)
                .ToList();

            var messages = messageRecords.Select(m => MapMessageDto(m, userId, avatarByUser, chat)).ToList();

            var readUpdates = new List<(SupraWsStatusPayload payload, Guid senderUserId)>();
            var markedRead = false;
            if (markAsRead)
            {
                var (markResponse, updates) = await MarkMessagesReadAsync(userId, chatId, ct);
                markedRead = markResponse.success;
                readUpdates = updates;
            }

            return (new SupraSyncChatPanelResponse
            {
                success = true,
                messages = messages,
                syncIndex = syncEntries,
                activities = _activities.GetActiveForChat(chatGuid),
                markedRead = markedRead,
            }, readUpdates);
        }
        catch (Exception ex)
        {
            return (new SupraSyncChatPanelResponse { success = false, error = ex.Message }, []);
        }
    }

    public async Task<SupraGetMessageSyncIndexResponse> GetMessageSyncIndexAsync(
        Guid userId,
        string chatId,
        string? afterMessageId = null,
        CancellationToken ct = default)
    {
        try
        {
            var chatGuid = Guid.Parse(chatId);
            if (!await _store.IsParticipantAsync(chatGuid, userId, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var ordered = await GetVisibleMessagesOrderedAsync(chatGuid, userId, ct);
            if (!string.IsNullOrWhiteSpace(afterMessageId) && Guid.TryParse(afterMessageId, out var afterGuid))
            {
                var anchor = await _store.GetMessageByIdAsync(afterGuid, ct);
                ordered = SliceAfterMessageId(ordered, afterGuid, anchor, chatGuid);
            }

            var entries = ordered.Select(m => new SupraMessageSyncEntryDto
            {
                id = m.Id.ToString(),
                timestamp = m.CreatedOn,
            }).ToList();

            return new SupraGetMessageSyncIndexResponse { success = true, entries = entries };
        }
        catch (Exception ex)
        {
            return new SupraGetMessageSyncIndexResponse { success = false, entries = [], error = ex.Message };
        }
    }

    public async Task<(SupraEditMessageResponse response, SupraWsMessageUpdatedPayload? broadcast)> EditMessageAsync(
        UserRecord user, string chatId, string messageId, string? text,
        IReadOnlyList<Guid>? attachmentFileIds = null,
        IReadOnlyList<BotMessageButtonDto>? buttons = null,
        CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(text) && buttons == null)
                return (new SupraEditMessageResponse { success = false, error = "Укажите text и/или buttons" }, null);

            List<BotMessageButtonDto>? normalizedButtons = null;
            if (buttons != null)
            {
                var (validated, buttonsError) = BotMessageButtonHelper.ValidateButtons(buttons.ToList());
                if (buttonsError != null)
                    return (new SupraEditMessageResponse { success = false, error = buttonsError }, null);
                normalizedButtons = validated;
            }

            var chatGuid = Guid.Parse(chatId);
            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            if (!Guid.TryParse(messageId, out var msgGuid))
                return (new SupraEditMessageResponse { success = false, error = "Некорректный messageId" }, null);

            var message = await _store.GetMessageByIdAsync(msgGuid, ct);
            if (message == null || message.ChatId != chatGuid)
                return (new SupraEditMessageResponse { success = false, error = "Сообщение не найдено" }, null);

            if (message.SenderUserId != user.Id)
                return (new SupraEditMessageResponse { success = false, error = "Можно редактировать только свои сообщения" }, null);

            if (message.DeletedForEveryone)
                return (new SupraEditMessageResponse { success = false, error = "Сообщение удалено" }, null);

            if (!string.IsNullOrWhiteSpace(text))
                message.Text = text.Trim();

            if (buttons != null)
            {
                message.ButtonsJson = normalizedButtons != null && normalizedButtons.Count > 0
                    ? BotMessageButtonHelper.SerializeButtons(normalizedButtons)
                    : null;
            }

            message.EditedOn = DateTime.UtcNow;
            await _store.UpdateMessageAsync(message, ct);
            await _files.SyncMessageAttachmentsAsync(message.Id, chatGuid, message.Text, attachmentFileIds, ct);

            var payload = new SupraWsMessageUpdatedPayload
            {
                chatId = chatGuid.ToString(),
                messageId = message.Id.ToString(),
                text = message.Text,
                editedOn = message.EditedOn,
                replyToMessageId = message.ReplyToMessageId?.ToString(),
                replyToSenderName = message.ReplyToSenderName,
                replyToTextPreview = message.ReplyToTextPreview,
                forwardedFromSenderName = message.ForwardedFromSenderName,
                deletedForEveryone = false,
                buttons = ParseButtonsOrNull(message.ButtonsJson),
            };
            return (new SupraEditMessageResponse { success = true }, payload);
        }
        catch (Exception ex)
        {
            return (new SupraEditMessageResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<(SupraDeleteMessageResponse response, SupraWsDeleteMessagePayload? broadcast, bool hideLocally)> DeleteMessageAsync(
        UserRecord user, string chatId, string messageId, bool deleteForEveryone, CancellationToken ct = default)
    {
        try
        {
            var chatGuid = Guid.Parse(chatId);
            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            if (!Guid.TryParse(messageId, out var msgGuid))
                return (new SupraDeleteMessageResponse { success = false, error = "Некорректный messageId" }, null, false);

            var message = await _store.GetMessageByIdAsync(msgGuid, ct);
            if (message == null || message.ChatId != chatGuid)
                return (new SupraDeleteMessageResponse { success = false, error = "Сообщение не найдено" }, null, false);

            if (deleteForEveryone)
            {
                var chat = await _store.GetChatByIdAsync(chatGuid, ct);
                if (!await CanDeleteMessageForEveryoneAsync(user.Id, chat, message.SenderUserId, ct))
                {
                    await _store.SaveMessageUserDeletionAsync(new SupraMessageUserDeletionRecord
                    {
                        MessageId = msgGuid,
                        UserId = user.Id,
                    }, ct);
                    return (new SupraDeleteMessageResponse { success = true }, null, true);
                }

                message.DeletedForEveryone = true;
                message.Text = "";
                await _store.UpdateMessageAsync(message, ct);
                await _files.ReleaseMessageAttachmentsAsync(msgGuid, ct);

                var payload = new SupraWsDeleteMessagePayload
                {
                    chatId = chatGuid.ToString(),
                    messageId = message.Id.ToString(),
                    deleteScope = "everyone",
                };
                return (new SupraDeleteMessageResponse { success = true }, payload, false);
            }

            await _store.SaveMessageUserDeletionAsync(new SupraMessageUserDeletionRecord
            {
                MessageId = msgGuid,
                UserId = user.Id,
            }, ct);

            return (new SupraDeleteMessageResponse { success = true }, null, true);
        }
        catch (Exception ex)
        {
            return (new SupraDeleteMessageResponse { success = false, error = ex.Message }, null, false);
        }
    }

    public async Task<(SupraForwardMessageResponse response, List<(Guid chatId, SupraWsNewMessagePayload payload)> broadcasts)> ForwardMessageAsync(
        UserRecord user, string sourceChatId, string messageId, IReadOnlyList<string> contactIds, CancellationToken ct = default)
    {
        try
        {
            if (contactIds.Count == 0)
                return (new SupraForwardMessageResponse { success = false, error = "Не выбраны контакты" }, []);

            if (contactIds.Count > ForwardMaxContacts)
                return (new SupraForwardMessageResponse { success = false, error = $"Можно выбрать не более {ForwardMaxContacts} контактов" }, []);

            if (!Guid.TryParse(sourceChatId, out var sourceChatGuid))
                return (new SupraForwardMessageResponse { success = false, error = "Некорректный chatId" }, []);

            if (!await _store.IsParticipantAsync(sourceChatGuid, user.Id, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            if (!Guid.TryParse(messageId, out var msgGuid))
                return (new SupraForwardMessageResponse { success = false, error = "Некорректный messageId" }, []);

            var source = await _store.GetMessageByIdAsync(msgGuid, ct);
            if (source == null || source.ChatId != sourceChatGuid || source.DeletedForEveryone)
                return (new SupraForwardMessageResponse { success = false, error = "Сообщение не найдено" }, []);

            if (string.Equals(source.EncryptionTier, "protected", StringComparison.OrdinalIgnoreCase))
                return (new SupraForwardMessageResponse { success = false, error = "Нельзя переслать защищённое сообщение" }, []);

            var sourceChat = await _store.GetChatByIdAsync(sourceChatGuid, ct);
            var forwardFrom = sourceChat != null && IsChannelChat(sourceChat)
                ? sourceChat.Name
                : source.SenderName;
            var text = source.Text;
            var sourceAttachmentFileIds = (await _store.GetMessageFileReferencesByMessageAsync(msgGuid, ct))
                .Select(r => r.FileId)
                .Distinct()
                .ToList();
            var sentChatIds = new List<string>();
            var broadcasts = new List<(Guid, SupraWsNewMessagePayload)>();

            foreach (var targetId in contactIds.Distinct())
            {
                string? targetChatId = null;
                if (Guid.TryParse(targetId, out var targetGuid) &&
                    await _store.IsParticipantAsync(targetGuid, user.Id, ct))
                {
                    var existingChat = await _store.GetChatByIdAsync(targetGuid, ct);
                    if (existingChat != null)
                        targetChatId = targetGuid.ToString();
                }

                if (targetChatId == null)
                {
                    var (createResp, _) = await CreateDirectChatAsync(user, targetId, ct);
                    if (createResp.success && !string.IsNullOrEmpty(createResp.chatId))
                        targetChatId = createResp.chatId;
                }

                if (string.IsNullOrEmpty(targetChatId))
                    continue;

                var (sendResp, payload) = await SendMessageAsync(
                    user,
                    targetChatId,
                    text,
                    replyToMessageId: null,
                    forwardedFromSenderName: forwardFrom,
                    attachmentFileIds: sourceAttachmentFileIds.Count > 0 ? sourceAttachmentFileIds : null,
                    ct: ct);

                if (sendResp.success && payload != null && Guid.TryParse(targetChatId, out var targetChatGuid))
                {
                    sentChatIds.Add(targetChatId);
                    broadcasts.Add((targetChatGuid, payload));
                }
            }

            return (new SupraForwardMessageResponse
            {
                success = sentChatIds.Count > 0,
                sentChatIds = sentChatIds,
                error = sentChatIds.Count == 0 ? "Не удалось переслать ни одному контакту" : null,
            }, broadcasts);
        }
        catch (Exception ex)
        {
            return (new SupraForwardMessageResponse { success = false, error = ex.Message }, []);
        }
    }
}
