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

    public Task<PushUserSendResult> SendNewMessageToUserAsync(
        Guid userId, string? title, string? body, string? chatId = null, CancellationToken ct = default)
        => SendNewMessageToUserDetailedAsync(userId, title, body, chatId, ct);

    public async Task<PushUserSendResult> SendNewMessageToUserDetailedAsync(
        Guid userId, string? title, string? body, string? chatId = null, CancellationToken ct = default)
    {
        var result = new PushUserSendResult();
        var subs = await _subscriptions.GetByUserAsync(userId, ct);
        result.SubscriptionCount = subs.Count;

        if (subs.Count == 0)
        {
            _logger.LogInformation("Push skipped for user {UserId}: no subscriptions registered", userId);
            return result;
        }

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
            var attempt = new PushSubscriptionAttempt
            {
                endpointSuffix = PushDiagnosticsHelper.MaskEndpoint(sub.Endpoint),
            };

            try
            {
                var pushSub = new WebPushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await _client.SendNotificationAsync(pushSub, payload, vapidDetails, ct);
                attempt.outcome = "sent";
                result.SuccessCount++;
                _logger.LogInformation(
                    "Web push sent to user {UserId} endpoint …{EndpointSuffix}",
                    userId, attempt.endpointSuffix);
            }
            catch (WebPushException ex)
            {
                attempt.httpStatus = (int)ex.StatusCode;
                attempt.error = ex.Message;

                if (ex.StatusCode == HttpStatusCode.NotFound || ex.StatusCode == HttpStatusCode.Gone)
                {
                    await _subscriptions.RemoveByEndpointAsync(sub.Endpoint, ct);
                    attempt.outcome = "stale-removed";
                    _logger.LogInformation(
                        "Removed stale push subscription for user {UserId} ({StatusCode}) endpoint …{EndpointSuffix}",
                        userId, ex.StatusCode, attempt.endpointSuffix);
                }
                else
                {
                    attempt.outcome = "failed";
                    _logger.LogWarning(ex,
                        "Web push send failed ({StatusCode}) for user {UserId} endpoint …{EndpointSuffix}",
                        ex.StatusCode, userId, attempt.endpointSuffix);
                }
            }
            catch (Exception ex)
            {
                attempt.outcome = "error";
                attempt.error = ex.Message;
                _logger.LogWarning(ex,
                    "Unexpected error sending web push to user {UserId} endpoint …{EndpointSuffix}",
                    userId, attempt.endpointSuffix);
            }

            result.Attempts.Add(attempt);
        }

        if (result.SuccessCount == 0)
        {
            _logger.LogWarning(
                "Push delivery failed for user {UserId}: {AttemptCount} subscription(s), none succeeded",
                userId, subs.Count);
        }

        return result;
    }
}
