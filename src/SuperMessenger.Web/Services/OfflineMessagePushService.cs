using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Infrastructure.Services;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Единая точка отправки Web Push участникам чата, у которых нет активного realtime-подключения
/// (приложение свёрнуто/закрыто). Используется как для сообщений пользователей, так и для
/// сообщений ботов, чтобы офлайн-доставка работала одинаково.
/// </summary>
public sealed class OfflineMessagePushService
{
    private readonly UserPresenceService _presence;
    private readonly PushNotificationService _push;
    private readonly NotificationPreferencesStore _notifPrefs;
    private readonly IDataStore _store;
    private readonly SupraMessengerService _messenger;

    public OfflineMessagePushService(
        UserPresenceService presence,
        PushNotificationService push,
        NotificationPreferencesStore notifPrefs,
        IDataStore store,
        SupraMessengerService messenger)
    {
        _presence = presence;
        _push = push;
        _notifPrefs = notifPrefs;
        _store = store;
        _messenger = messenger;
    }

    /// <summary>
    /// Отправляет Web Push офлайн-участникам. Отправитель и пользователи, заглушившие чат или
    /// уведомления целиком, пропускаются. Текст не передаётся из-за E2E — только «от кого».
    /// </summary>
    public async Task<PushDeliveryTrace> PushNewMessageAsync(
        Guid chatId,
        SupraWsNewMessagePayload message,
        IEnumerable<Guid> participants,
        Guid senderId,
        CancellationToken ct)
    {
        var trace = new PushDeliveryTrace { chatId = chatId.ToString() };
        var info = await _messenger.GetChatNotificationInfoAsync(chatId, ct);
        var sender = string.IsNullOrWhiteSpace(message.senderName) ? "Новое сообщение" : message.senderName.Trim();

        string title, body;
        if (info?.isGroup == true)
        {
            title = string.IsNullOrWhiteSpace(info.Value.name) ? sender : info.Value.name.Trim();
            body = sender;
        }
        else
        {
            title = sender;
            body = "Новое сообщение";
        }

        var chatIdStr = chatId.ToString();
        foreach (var uid in participants.Distinct())
        {
            var entry = new PushRecipientTrace
            {
                userId = uid.ToString(),
                presenceStatus = _presence.GetStatus(uid),
                isConnected = _presence.IsConnected(uid),
                isForeground = _presence.IsForeground(uid),
            };

            var recipient = await _store.GetUserByIdAsync(uid, ct);
            entry.displayName = recipient?.DisplayName;

            if (uid == senderId)
            {
                entry.action = "skipped";
                entry.skipReason = "sender";
                trace.recipients.Add(entry);
                continue;
            }

            if (_presence.IsRealtimeAvailable(uid))
            {
                entry.action = "skipped";
                entry.skipReason = "online";
                trace.recipients.Add(entry);
                continue;
            }

            var prefs = await _notifPrefs.GetAsync(uid, ct);
            entry.globalMuted = prefs.GlobalMuted;
            entry.chatMuted = prefs.MutedChatIds != null &&
                prefs.MutedChatIds.Any(c => string.Equals(c, chatIdStr, StringComparison.OrdinalIgnoreCase));

            if (prefs.GlobalMuted)
            {
                entry.action = "skipped";
                entry.skipReason = "muted-global";
                trace.recipients.Add(entry);
                continue;
            }

            if (entry.chatMuted)
            {
                entry.action = "skipped";
                entry.skipReason = "muted-chat";
                trace.recipients.Add(entry);
                continue;
            }

            var sendResult = await _push.SendNewMessageToUserDetailedAsync(uid, title, body, chatIdStr, ct);
            entry.subscriptionCount = sendResult.SubscriptionCount;
            entry.attempts = sendResult.Attempts;
            entry.anyDelivered = sendResult.SuccessCount > 0;

            if (sendResult.SubscriptionCount == 0)
            {
                entry.action = "no-subscriptions";
                entry.skipReason = "no-subscriptions";
            }
            else if (sendResult.SuccessCount > 0)
            {
                entry.action = "sent";
            }
            else
            {
                entry.action = "failed";
                entry.skipReason = "all-subscriptions-failed";
            }

            trace.recipients.Add(entry);
        }

        return trace;
    }
}
