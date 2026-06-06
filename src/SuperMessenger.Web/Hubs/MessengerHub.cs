using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Web.Services;
using System.Security.Claims;

namespace SuperMessenger.Web.Hubs;

[Authorize]
public sealed class MessengerHub : Hub
{
    private readonly UserPresenceService _presence;
    private readonly UserPresenceNotifier _presenceNotifier;
    private readonly IDataStore _store;
    private readonly UserLoginChangeService _loginChanges;

    public MessengerHub(
        UserPresenceService presence,
        UserPresenceNotifier presenceNotifier,
        IDataStore store,
        UserLoginChangeService loginChanges)
    {
        _presence = presence;
        _presenceNotifier = presenceNotifier;
        _store = store;
        _loginChanges = loginChanges;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId.Value.ToString()));
            _presence.UserConnected(userId.Value);
            await _presenceNotifier.BroadcastPresenceAsync(userId.Value);
            await _presenceNotifier.SendInitialPresenceToViewerAsync(userId.Value);
            await _loginChanges.DeliverPendingLoginChangesAsync(userId.Value, Context.ConnectionAborted);
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            _presence.UserDisconnected(userId.Value);
            var user = await _store.GetUserByIdAsync(userId.Value);
            if (user != null)
            {
                user.LastSeenAt = DateTime.UtcNow;
                await _store.SaveUserAsync(user);
            }
            await _presenceNotifier.BroadcastPresenceAsync(userId.Value);
        }
        await base.OnDisconnectedAsync(exception);
    }

    public Task Heartbeat()
    {
        var userId = GetUserId();
        if (!userId.HasValue) return Task.CompletedTask;
        _presence.ReportHeartbeat(userId.Value);
        return Task.CompletedTask;
    }

    public async Task ReportActivity()
    {
        var userId = GetUserId();
        if (!userId.HasValue) return;
        var prev = _presence.GetStatus(userId.Value);
        _presence.ReportActivity(userId.Value);
        var next = _presence.GetStatus(userId.Value);
        if (prev != next)
            await _presenceNotifier.BroadcastPresenceAsync(userId.Value);
    }

    public static string UserGroup(string userId) => $"user:{userId}";

    private Guid? GetUserId()
    {
        var raw = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
