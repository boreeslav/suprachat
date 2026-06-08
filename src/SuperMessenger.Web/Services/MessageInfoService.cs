using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Собирает полную информацию о сообщении: отправка, правки, прочтения, push-доставка.
/// </summary>
public sealed class MessageInfoService
{
    private readonly IDataStore _store;
    private readonly PushDiagnosticLogStore _pushLog;
    private readonly PushSubscriptionStore _pushSubs;
    private readonly UserPresenceService _presence;

    public MessageInfoService(
        IDataStore store,
        PushDiagnosticLogStore pushLog,
        PushSubscriptionStore pushSubs,
        UserPresenceService presence)
    {
        _store = store;
        _pushLog = pushLog;
        _pushSubs = pushSubs;
        _presence = presence;
    }

    public async Task<SupraGetMessageInfoResponse> GetAsync(
        UserRecord viewer, string chatId, string messageId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid) || !Guid.TryParse(messageId, out var msgGuid))
                return new SupraGetMessageInfoResponse { success = false, error = "Некорректный идентификатор" };

            if (!await _store.IsParticipantAsync(chatGuid, viewer.Id, ct))
                return new SupraGetMessageInfoResponse { success = false, error = "Нет доступа к чату" };

            var message = await _store.GetMessageByIdAsync(msgGuid, ct);
            if (message == null || message.ChatId != chatGuid)
                return new SupraGetMessageInfoResponse { success = false, error = "Сообщение не найдено" };

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            var participants = await _store.GetParticipantsByChatAsync(chatGuid, ct);
            var isGroup = chat != null && string.Equals(chat.Type, "group", StringComparison.OrdinalIgnoreCase);
            var canSeeDelivery = viewer.Id == message.SenderUserId || viewer.Type == UserType.Admin;

            var info = new SupraMessageInfoDto
            {
                messageId = message.Id.ToString(),
                chatId = chatGuid.ToString(),
                chatName = chat?.Name ?? "",
                chatType = isGroup ? "group" : "direct",
                senderId = message.SenderUserId.ToString(),
                senderName = message.SenderName,
                sentAt = message.CreatedOn,
                editedAt = message.EditedOn,
                status = message.Status,
                deletedForEveryone = message.DeletedForEveryone,
                encryptionTier = string.Equals(message.EncryptionTier, "protected", StringComparison.OrdinalIgnoreCase)
                    ? "protected" : "basic",
                replyToMessageId = message.ReplyToMessageId?.ToString(),
                replyToSenderName = message.ReplyToSenderName,
                forwardedFromSenderName = message.ForwardedFromSenderName,
            };

            info.readBy = await BuildReadByAsync(message, participants, isGroup, ct);
            info.events = BuildEvents(info, message);

            if (canSeeDelivery)
            {
                var pushTrace = _pushLog.GetByMessageId(message.Id.ToString());
                if (pushTrace != null)
                {
                    info.pushDebug = pushTrace;
                    AppendPushEvents(info.events, pushTrace);
                }
                else if (message.SenderUserId == viewer.Id || viewer.Type == UserType.Admin)
                {
                    await AppendLiveDeliverySnapshotAsync(info.events, message, participants, ct);
                }
            }

            info.events = info.events
                .OrderBy(e => e.at ?? DateTime.MinValue)
                .ThenBy(e => e.kind, StringComparer.Ordinal)
                .ToList();

            return new SupraGetMessageInfoResponse { success = true, info = info };
        }
        catch (Exception ex)
        {
            return new SupraGetMessageInfoResponse { success = false, error = ex.Message };
        }
    }

    async Task<List<SupraMessageReadReceiptDto>> BuildReadByAsync(
        SupraChatMessageRecord message,
        IReadOnlyList<SupraChatParticipantRecord> participants,
        bool isGroup,
        CancellationToken ct)
    {
        var receipts = await _store.GetReadReceiptsByMessageAsync(message.Id, ct);
        var receiptByUser = receipts.ToDictionary(r => r.UserId, r => r);
        var targets = participants
            .Select(p => p.UserId)
            .Where(uid => uid != message.SenderUserId)
            .Distinct()
            .ToList();

        if (targets.Count == 0 && !isGroup)
            return [];

        var result = new List<SupraMessageReadReceiptDto>();
        foreach (var uid in targets)
        {
            var user = await _store.GetUserByIdAsync(uid, ct);
            if (receiptByUser.TryGetValue(uid, out var receipt))
            {
                result.Add(new SupraMessageReadReceiptDto
                {
                    userId = uid.ToString(),
                    displayName = user?.DisplayName ?? uid.ToString(),
                    readAt = receipt.ReadAt,
                    read = true,
                    legacy = false,
                });
                continue;
            }

            var legacyRead = !isGroup && string.Equals(message.Status, "read", StringComparison.OrdinalIgnoreCase);
            result.Add(new SupraMessageReadReceiptDto
            {
                userId = uid.ToString(),
                displayName = user?.DisplayName ?? uid.ToString(),
                readAt = null,
                read = legacyRead,
                legacy = legacyRead,
            });
        }

        return result
            .OrderByDescending(r => r.read)
            .ThenBy(r => r.displayName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    static List<SupraMessageDeliveryEventDto> BuildEvents(
        SupraMessageInfoDto info, SupraChatMessageRecord message)
    {
        var events = new List<SupraMessageDeliveryEventDto>
        {
            new()
            {
                kind = "sent",
                at = message.CreatedOn,
                userId = info.senderId,
                userName = info.senderName,
            },
        };

        if (message.EditedOn.HasValue)
        {
            events.Add(new SupraMessageDeliveryEventDto
            {
                kind = "edited",
                at = message.EditedOn,
                userId = info.senderId,
                userName = info.senderName,
            });
        }

        if (message.DeletedForEveryone)
        {
            events.Add(new SupraMessageDeliveryEventDto
            {
                kind = "deleted",
                at = message.EditedOn ?? message.CreatedOn,
                userId = info.senderId,
                userName = info.senderName,
            });
        }

        foreach (var r in info.readBy.Where(x => x.read && x.readAt.HasValue))
        {
            events.Add(new SupraMessageDeliveryEventDto
            {
                kind = "read",
                at = r.readAt,
                userId = r.userId,
                userName = r.displayName,
            });
        }

        return events;
    }

    static void AppendPushEvents(List<SupraMessageDeliveryEventDto> events, PushDeliveryTrace trace)
    {
        foreach (var r in trace.recipients)
        {
            if (string.Equals(r.action, "skipped", StringComparison.OrdinalIgnoreCase))
            {
                if (string.Equals(r.skipReason, "sender", StringComparison.OrdinalIgnoreCase))
                    continue;

                var kind = string.Equals(r.skipReason, "online", StringComparison.OrdinalIgnoreCase)
                    ? "realtime"
                    : "push-skipped";
                events.Add(new SupraMessageDeliveryEventDto
                {
                    kind = kind,
                    at = trace.at.UtcDateTime,
                    userId = r.userId,
                    userName = r.displayName,
                    detail = DescribePushSkip(r),
                });
                continue;
            }

            if (r.attempts.Count > 0)
            {
                foreach (var a in r.attempts)
                {
                    var kind = a.outcome switch
                    {
                        "sent" => "push-sent",
                        "stale-removed" => "push-stale",
                        _ => "push-failed",
                    };
                    events.Add(new SupraMessageDeliveryEventDto
                    {
                        kind = kind,
                        at = a.at.UtcDateTime,
                        userId = r.userId,
                        userName = r.displayName,
                        detail = DescribePushAttempt(a, r),
                    });
                }
                continue;
            }

            events.Add(new SupraMessageDeliveryEventDto
            {
                kind = r.action == "no-subscriptions" ? "push-skipped" : "push-failed",
                at = trace.at.UtcDateTime,
                userId = r.userId,
                userName = r.displayName,
                detail = DescribePushSkip(r),
            });
        }
    }

    async Task AppendLiveDeliverySnapshotAsync(
        List<SupraMessageDeliveryEventDto> events,
        SupraChatMessageRecord message,
        IReadOnlyList<SupraChatParticipantRecord> participants,
        CancellationToken ct)
    {
        foreach (var p in participants)
        {
            if (p.UserId == message.SenderUserId) continue;
            var user = await _store.GetUserByIdAsync(p.UserId, ct);
            var name = user?.DisplayName ?? p.UserId.ToString();
            if (_presence.IsConnected(p.UserId))
            {
                events.Add(new SupraMessageDeliveryEventDto
                {
                    kind = "realtime",
                    at = message.CreatedOn,
                    userId = p.UserId.ToString(),
                    userName = name,
                    detail = "online",
                });
                continue;
            }

            var subs = await _pushSubs.GetByUserAsync(p.UserId, ct);
            events.Add(new SupraMessageDeliveryEventDto
            {
                kind = subs.Count == 0 ? "push-unknown" : "push-unknown",
                at = message.CreatedOn,
                userId = p.UserId.ToString(),
                userName = name,
                detail = subs.Count == 0 ? "no-subscriptions-now" : $"subscriptions:{subs.Count}",
            });
        }
    }

    static string DescribePushSkip(PushRecipientTrace r)
    {
        var parts = new List<string> { r.skipReason ?? r.action };
        if (r.globalMuted) parts.Add("global-muted");
        if (r.chatMuted) parts.Add("chat-muted");
        parts.Add($"presence:{r.presenceStatus}");
        parts.Add($"subscriptions:{r.subscriptionCount}");
        return string.Join(", ", parts.Where(x => !string.IsNullOrWhiteSpace(x)));
    }

    static string DescribePushAttempt(PushSubscriptionAttempt a, PushRecipientTrace r)
    {
        var parts = new List<string> { a.outcome };
        if (a.httpStatus.HasValue) parts.Add($"HTTP {a.httpStatus}");
        if (!string.IsNullOrWhiteSpace(a.error)) parts.Add(a.error);
        if (!string.IsNullOrWhiteSpace(a.endpointSuffix)) parts.Add($"…{a.endpointSuffix}");
        if (r.subscriptionCount > 0) parts.Add($"subs:{r.subscriptionCount}");
        return string.Join(" · ", parts);
    }
}
