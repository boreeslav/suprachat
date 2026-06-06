using System.Net;
using System.Text.Json;
using WebPush;
using WebPushSubscription = WebPush.PushSubscription;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Отправляет Web Push уведомления оффлайн-получателям. Из-за E2E-шифрования
/// сервер не знает содержимого сообщений, поэтому payload намеренно общий
/// ("Новое сообщение") — реальный текст клиент расшифровывает после открытия.
/// </summary>
public sealed class PushNotificationService
{
    private readonly PushVapidKeyStore _vapid;
    private readonly PushSubscriptionStore _subscriptions;
    private readonly ILogger<PushNotificationService> _logger;
    private readonly WebPushClient _client = new();

    public PushNotificationService(
        PushVapidKeyStore vapid,
        PushSubscriptionStore subscriptions,
        ILogger<PushNotificationService> logger)
    {
        _vapid = vapid;
        _subscriptions = subscriptions;
        _logger = logger;
    }

    public async Task SendNewMessageToUserAsync(Guid userId, string? title, string? body, string? chatId = null, CancellationToken ct = default)
    {
        var subs = await _subscriptions.GetByUserAsync(userId, ct);
        if (subs.Count == 0) return;

        var payload = JsonSerializer.Serialize(new
        {
            type = "new-message",
            title = string.IsNullOrWhiteSpace(title) ? "Новое сообщение" : title,
            body = string.IsNullOrWhiteSpace(body) ? "" : body,
            chatId = chatId ?? "",
            ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        });
        var vapidDetails = _vapid.GetVapidDetails();

        foreach (var sub in subs)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                var pushSub = new WebPushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await _client.SendNotificationAsync(pushSub, payload, vapidDetails, ct);
            }
            catch (WebPushException ex)
            {
                // 404/410 => подписка протухла, удаляем; остальное логируем и продолжаем.
                if (ex.StatusCode == HttpStatusCode.NotFound || ex.StatusCode == HttpStatusCode.Gone)
                {
                    await _subscriptions.RemoveByEndpointAsync(sub.Endpoint, ct);
                    _logger.LogInformation("Removed stale push subscription for user {UserId}", userId);
                }
                else
                {
                    _logger.LogWarning(ex, "Web push send failed ({StatusCode}) for user {UserId}", ex.StatusCode, userId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unexpected error sending web push to user {UserId}", userId);
            }
        }
    }
}
