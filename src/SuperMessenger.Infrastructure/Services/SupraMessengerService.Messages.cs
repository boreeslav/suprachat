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

    SupraChatMessageDto MapMessageDto(
        SupraChatMessageRecord m,
        Guid userId,
        IReadOnlyDictionary<Guid, string?> avatarByUser)
    {
        var text = m.DeletedForEveryone ? "" : m.Text;
        return new SupraChatMessageDto
        {
            id = m.Id.ToString(),
            senderId = m.SenderUserId.ToString(),
            senderName = m.SenderName,
            senderAvatar = avatarByUser.TryGetValue(m.SenderUserId, out var av) ? av : null,
            text = text,
            timestamp = m.CreatedOn,
            status = m.Status,
            isOwn = m.SenderUserId == userId,
            replyToMessageId = m.ReplyToMessageId?.ToString(),
            replyToSenderName = m.ReplyToSenderName,
            replyToTextPreview = m.ReplyToTextPreview,
            forwardedFromSenderName = m.ForwardedFromSenderName,
            editedOn = m.EditedOn,
            deletedForEveryone = m.DeletedForEveryone,
            encryptionTier = NormalizeEncryptionTier(m.EncryptionTier),
        };
    }

    static string NormalizeEncryptionTier(string? tier) =>
        string.Equals(tier, "protected", StringComparison.OrdinalIgnoreCase) ? "protected" : "basic";

    SupraWsNewMessagePayload MapNewMessagePayload(SupraChatMessageRecord m, UserRecord? sender)
    {
        var text = m.DeletedForEveryone ? "" : m.Text;
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
        };
    }

    static bool IsEncryptedPayload(string? text) =>
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
        CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(text))
                return (new SupraSendMessageResponse { success = false, error = "Текст сообщения пуст" }, null);

            var chatGuid = Guid.Parse(chatId);
            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat != null && string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
            {
                var parts = await _store.GetParticipantsByChatAsync(chatGuid, ct);
                var otherId = parts.FirstOrDefault(p => p.UserId != user.Id)?.UserId;
                if (otherId.HasValue)
                {
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
            var record = new SupraChatMessageRecord
            {
                Id = msgGuid,
                ChatId = chatGuid,
                SenderUserId = user.Id,
                SenderName = user.DisplayName,
                Text = text.Trim(),
                Status = "sent",
                CreatedOn = now,
                ReplyToMessageId = replyId,
                ReplyToSenderName = replySender,
                ReplyToTextPreview = replyPreview,
                ForwardedFromSenderName = fwdName,
                EncryptionTier = NormalizeEncryptionTier(encryptionTier),
            };
            await _store.SaveMessageAsync(record, ct);

            var payload = MapNewMessagePayload(record, user);
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
            .Where(m => !hiddenIds.Contains(m.Id) && !m.DeletedForEveryone)
            .OrderBy(m => m.CreatedOn)
            .ThenBy(m => m.Id)
            .ToList();
    }

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

            var messages = slice.Select(m => MapMessageDto(m, userId, avatarByUser)).ToList();
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

            var ordered = await GetVisibleMessagesOrderedAsync(chatGuid, userId, ct);
            var idx = ordered.FindIndex(m => m.Id == msgGuid);
            if (idx < 0)
                return new SupraGetMessagesAroundResponse { success = false, error = "Сообщение не найдено" };

            var takeBefore = Math.Max(0, before);
            var takeAfter = Math.Max(0, after);
            var start = Math.Max(0, idx - takeBefore);
            var end = Math.Min(ordered.Count, idx + takeAfter + 1);
            var slice = ordered.Skip(start).Take(end - start).ToList();
            var messages = slice.Select(m => MapMessageDto(m, userId, avatarByUser)).ToList();

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
        UserRecord user, string chatId, string messageId, string text, CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(text))
                return (new SupraEditMessageResponse { success = false, error = "Текст сообщения пуст" }, null);

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

            message.Text = text.Trim();
            message.EditedOn = DateTime.UtcNow;
            await _store.UpdateMessageAsync(message, ct);

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
                if (message.SenderUserId != user.Id)
                    return (new SupraDeleteMessageResponse { success = false, error = "Можно удалить у всех только свои сообщения" }, null, false);

                message.DeletedForEveryone = true;
                message.Text = "";
                await _store.UpdateMessageAsync(message, ct);

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

            var forwardFrom = source.SenderName;
            var text = source.Text;
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
