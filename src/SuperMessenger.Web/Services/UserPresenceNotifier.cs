using SuperMessenger.Core.Dtos;
using SuperMessenger.Infrastructure.Services;

namespace SuperMessenger.Web.Services;

public sealed class UserPresenceNotifier
{
    private readonly UserPresenceService _presence;
    private readonly RealtimeNotifier _realtime;
    private readonly SupraMessengerService _messenger;

    public UserPresenceNotifier(
        UserPresenceService presence,
        RealtimeNotifier realtime,
        SupraMessengerService messenger)
    {
        _presence = presence;
        _realtime = realtime;
        _messenger = messenger;
    }

    public async Task BroadcastPresenceAsync(Guid userId, CancellationToken ct = default)
    {
        var payload = new SupraWsPresencePayload
        {
            userId = userId.ToString(),
            status = _presence.GetStatus(userId),
        };
        var contacts = await _messenger.GetDirectContactUserIdsAsync(userId, ct);
        foreach (var contactId in contacts)
        {
            if (!await _messenger.CanSeeOnlineStatusAsync(contactId, userId, ct))
                continue;
            await _realtime.SendToUserAsync(contactId, payload, ct);
        }
    }

    public async Task SendInitialPresenceToViewerAsync(Guid viewerId, CancellationToken ct = default)
    {
        var contacts = await _messenger.GetDirectContactUserIdsAsync(viewerId, ct);
        foreach (var contactId in contacts)
        {
            if (!await _messenger.CanSeeOnlineStatusAsync(viewerId, contactId, ct))
                continue;
            var payload = new SupraWsPresencePayload
            {
                userId = contactId.ToString(),
                status = _presence.GetStatus(contactId),
            };
            await _realtime.SendToUserAsync(viewerId, payload, ct);
        }
    }
}
