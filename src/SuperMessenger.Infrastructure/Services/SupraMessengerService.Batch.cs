using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed class SupraBatchSideEffects
{
    public List<SupraWsDeleteMessagePayload> DeleteBroadcasts { get; set; } = [];
    public List<(Guid ChatId, SupraWsNewMessagePayload Payload)> NewMessageBroadcasts { get; set; } = [];
    public List<(SupraWsStatusPayload Payload, Guid SenderUserId)> StatusUpdates { get; set; } = [];
    public SupraWsChatReadPayload? ChatReadBroadcast { get; set; }
    public Guid? ChatReadUserId { get; set; }
}

public sealed partial class SupraMessengerService
{
    public async Task<(SupraBatchResponse response, SupraBatchSideEffects sideEffects)> ExecuteBatchAsync(
        UserRecord user,
        string action,
        string chatId,
        IReadOnlyList<string> messageIds,
        IReadOnlyList<string> contactIds,
        bool deleteForEveryone,
        IReadOnlyList<SupraBatchForwardItem> forwardItems,
        CancellationToken ct = default)
    {
        var sideEffects = new SupraBatchSideEffects();
        if (string.IsNullOrWhiteSpace(action))
            return (new SupraBatchResponse { success = false, error = "Не указано действие" }, sideEffects);

        return action switch
        {
            "deleteMessage" when messageIds.Any() =>
                await BatchDeleteMessagesAsync(user, chatId, messageIds, deleteForEveryone, sideEffects, ct),
            "forwardMessages" when forwardItems.Any() =>
                await BatchForwardMessagesAsync(user, chatId, forwardItems, sideEffects, ct),
            "forwardMessage" when messageIds.Any() && contactIds.Any() =>
                await BatchForwardByMessageIdsAsync(user, chatId, messageIds, contactIds, sideEffects, ct),
            "markMessagesRead" =>
                await BatchMarkMessagesReadAsync(user.Id, chatId, messageIds, sideEffects, ct),
            _ when action is "deleteMessage" or "forwardMessages" or "forwardMessage" =>
                (new SupraBatchResponse { success = false, error = "Не указаны элементы для обработки" }, sideEffects),
            _ => (new SupraBatchResponse { success = false, error = $"Неизвестное действие: {action}" }, sideEffects),
        };
    }

    async Task<(SupraBatchResponse, SupraBatchSideEffects)> BatchDeleteMessagesAsync(
        UserRecord user,
        string chatId,
        IReadOnlyList<string> messageIds,
        bool deleteForEveryone,
        SupraBatchSideEffects sideEffects,
        CancellationToken ct)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new SupraBatchResponse { success = false, error = "Некорректный chatId" }, sideEffects);

            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            var isGroupModerator = await IsGroupModeratorAsync(user.Id, chat, ct);

            var results = new List<SupraBatchItemResult>();
            var userDeletions = new List<SupraMessageUserDeletionRecord>();
            var messagesToUpdate = new List<SupraChatMessageRecord>();

            foreach (var messageId in messageIds.Distinct(StringComparer.Ordinal))
            {
                if (!Guid.TryParse(messageId, out var msgGuid))
                {
                    results.Add(new SupraBatchItemResult
                    {
                        messageId = messageId,
                        success = false,
                        error = "Некорректный messageId",
                    });
                    continue;
                }

                var message = await _store.GetMessageByIdAsync(msgGuid, ct);
                if (message == null || message.ChatId != chatGuid)
                {
                    results.Add(new SupraBatchItemResult
                    {
                        messageId = messageId,
                        success = false,
                        error = "Сообщение не найдено",
                    });
                    continue;
                }

                if (deleteForEveryone && (message.SenderUserId == user.Id || isGroupModerator))
                {
                    message.DeletedForEveryone = true;
                    message.Text = "";
                    messagesToUpdate.Add(message);
                    sideEffects.DeleteBroadcasts.Add(new SupraWsDeleteMessagePayload
                    {
                        chatId = chatGuid.ToString(),
                        messageId = message.Id.ToString(),
                        deleteScope = "everyone",
                    });
                    results.Add(new SupraBatchItemResult { messageId = messageId, success = true });
                    continue;
                }

                userDeletions.Add(new SupraMessageUserDeletionRecord
                {
                    MessageId = msgGuid,
                    UserId = user.Id,
                });
                results.Add(new SupraBatchItemResult { messageId = messageId, success = true });
            }

            foreach (var message in messagesToUpdate)
                await _store.UpdateMessageAsync(message, ct);

            if (userDeletions.Count > 0)
                await _store.SaveMessageUserDeletionsAsync(userDeletions, ct);

            var successCount = results.Count(r => r.success);
            return (new SupraBatchResponse
            {
                success = successCount > 0,
                error = successCount == 0 ? "Не удалось удалить сообщения" : null,
                results = results,
            }, sideEffects);
        }
        catch (Exception ex)
        {
            return (new SupraBatchResponse { success = false, error = ex.Message }, sideEffects);
        }
    }

    async Task<(SupraBatchResponse, SupraBatchSideEffects)> BatchForwardMessagesAsync(
        UserRecord user,
        string sourceChatId,
        IReadOnlyList<SupraBatchForwardItem> forwardItems,
        SupraBatchSideEffects sideEffects,
        CancellationToken ct)
    {
        try
        {
            if (!Guid.TryParse(sourceChatId, out var sourceChatGuid))
                return (new SupraBatchResponse { success = false, error = "Некорректный chatId" }, sideEffects);

            if (!await _store.IsParticipantAsync(sourceChatGuid, user.Id, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var results = new List<SupraBatchItemResult>();
            var sentChatIds = new HashSet<string>(StringComparer.Ordinal);

            foreach (var item in forwardItems)
            {
                if (!Guid.TryParse(item.targetChatId, out var targetChatGuid))
                {
                    results.Add(new SupraBatchItemResult
                    {
                        messageId = item.sourceMessageId,
                        targetChatId = item.targetChatId,
                        success = false,
                        error = "Некорректный targetChatId",
                    });
                    continue;
                }

                var (sendResp, payload) = await SendMessageAsync(
                    user,
                    targetChatGuid.ToString(),
                    item.text,
                    forwardedFromSenderName: item.forwardedFromSenderName,
                    encryptionTier: item.encryptionTier,
                    ct: ct);

                if (sendResp.success && payload != null)
                {
                    sentChatIds.Add(targetChatGuid.ToString());
                    sideEffects.NewMessageBroadcasts.Add((targetChatGuid, payload));
                    results.Add(new SupraBatchItemResult
                    {
                        messageId = item.sourceMessageId,
                        targetChatId = targetChatGuid.ToString(),
                        newMessageId = sendResp.messageId,
                        success = true,
                    });
                    continue;
                }

                results.Add(new SupraBatchItemResult
                {
                    messageId = item.sourceMessageId,
                    targetChatId = targetChatGuid.ToString(),
                    success = false,
                    error = sendResp.error ?? "Не удалось отправить",
                });
            }

            var successCount = results.Count(r => r.success);
            return (new SupraBatchResponse
            {
                success = successCount > 0,
                sentChatIds = sentChatIds.ToList(),
                error = successCount == 0 ? "Не удалось переслать сообщения" : null,
                results = results,
            }, sideEffects);
        }
        catch (Exception ex)
        {
            return (new SupraBatchResponse { success = false, error = ex.Message }, sideEffects);
        }
    }

    async Task<(SupraBatchResponse, SupraBatchSideEffects)> BatchForwardByMessageIdsAsync(
        UserRecord user,
        string sourceChatId,
        IReadOnlyList<string> messageIds,
        IReadOnlyList<string> contactIds,
        SupraBatchSideEffects sideEffects,
        CancellationToken ct)
    {
        var results = new List<SupraBatchItemResult>();
        var sentChatIds = new HashSet<string>(StringComparer.Ordinal);

        foreach (var messageId in messageIds.Distinct(StringComparer.Ordinal))
        {
            var (response, broadcasts) = await ForwardMessageAsync(user, sourceChatId, messageId, contactIds, ct);
            if (response.success)
            {
                foreach (var chatId in response.sentChatIds)
                    sentChatIds.Add(chatId);
                sideEffects.NewMessageBroadcasts.AddRange(broadcasts);
            }

            results.Add(new SupraBatchItemResult
            {
                messageId = messageId,
                success = response.success,
                error = response.error,
            });
        }

        var successCount = results.Count(r => r.success);
        return (new SupraBatchResponse
        {
            success = successCount > 0,
            sentChatIds = sentChatIds.ToList(),
            error = successCount == 0 ? "Не удалось переслать сообщения" : null,
            results = results,
        }, sideEffects);
    }

    async Task<(SupraBatchResponse, SupraBatchSideEffects)> BatchMarkMessagesReadAsync(
        Guid userId,
        string chatId,
        IReadOnlyList<string> messageIds,
        SupraBatchSideEffects sideEffects,
        CancellationToken ct)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new SupraBatchResponse { success = false, error = "Некорректный chatId" }, sideEffects);

            if (!await _store.IsParticipantAsync(chatGuid, userId, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat != null && IsChannelChat(chat))
                return (new SupraBatchResponse { success = true, results = [] }, sideEffects);

            var allMessages = (await _store.GetMessagesByChatAsync(chatGuid, ct))
                .Where(m => m.SenderUserId != userId)
                .ToList();

            HashSet<Guid>? selectedIds = null;
            if (messageIds.Count > 0)
            {
                selectedIds = messageIds
                    .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
                    .Where(g => g != Guid.Empty)
                    .ToHashSet();
            }

            var toMark = selectedIds == null
                ? allMessages.Where(m => m.Status != "read").ToList()
                : allMessages.Where(m => selectedIds.Contains(m.Id)).ToList();

            var results = new List<SupraBatchItemResult>();
            var readAt = DateTime.UtcNow;

            foreach (var message in toMark)
            {
                await _store.UpsertMessageReadReceiptAsync(new SupraMessageReadReceiptRecord
                {
                    MessageId = message.Id,
                    UserId = userId,
                    ReadAt = readAt,
                }, ct);
                results.Add(new SupraBatchItemResult { messageId = message.Id.ToString(), success = true });
            }

            if (toMark.Count > 0)
            {
                await _store.UpdateMessagesStatusAsync(chatGuid, userId, "read", ct);
                sideEffects.StatusUpdates.AddRange(toMark.Select(m => (
                    new SupraWsStatusPayload
                    {
                        chatId = chatGuid.ToString(),
                        messageId = m.Id.ToString(),
                        status = "read",
                    },
                    m.SenderUserId)));
                sideEffects.ChatReadBroadcast = new SupraWsChatReadPayload { chatId = chatGuid.ToString() };
                sideEffects.ChatReadUserId = userId;
            }

            return (new SupraBatchResponse
            {
                success = true,
                results = results,
            }, sideEffects);
        }
        catch (Exception ex)
        {
            return (new SupraBatchResponse { success = false, error = ex.Message }, sideEffects);
        }
    }
}
