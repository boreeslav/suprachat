using Microsoft.AspNetCore.SignalR;
using SuperMessenger.Web.Hubs;

namespace SuperMessenger.Web.Services;

public sealed class RealtimeNotifier
{
    private readonly IHubContext<MessengerHub> _hub;

    public RealtimeNotifier(IHubContext<MessengerHub> hub) => _hub = hub;

    public Task SendToUserAsync(Guid userId, object payload, CancellationToken ct = default)
    {
        var envelope = new
        {
            Header = new { BodyTypeName = "SupraMessenger", Sender = "SupraMessenger" },
            Body = payload,
        };
        return _hub.Clients.Group(MessengerHub.UserGroup(userId.ToString()))
            .SendAsync("message", envelope, ct);
    }

    public async Task BroadcastToChatParticipantsAsync(
        IEnumerable<Guid> userIds,
        object payload,
        CancellationToken ct = default)
    {
        foreach (var uid in userIds.Distinct())
            await SendToUserAsync(uid, payload, ct);
    }
}
