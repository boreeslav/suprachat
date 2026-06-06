using SuperMessenger.Core.Abstractions;

namespace SuperMessenger.Web.Services;

public sealed class PresenceMonitorService : BackgroundService
{
    private static readonly TimeSpan SweepInterval = TimeSpan.FromSeconds(30);

    private readonly UserPresenceService _presence;
    private readonly UserPresenceNotifier _notifier;
    private readonly IDataStore _store;
    private readonly ILogger<PresenceMonitorService> _logger;

    public PresenceMonitorService(
        UserPresenceService presence,
        UserPresenceNotifier notifier,
        IDataStore store,
        ILogger<PresenceMonitorService> logger)
    {
        _presence = presence;
        _notifier = notifier;
        _store = store;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(SweepInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await SweepAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Presence sweep failed");
            }
        }
    }

    async Task SweepAsync(CancellationToken ct)
    {
        var expired = _presence.ExpireStaleConnections();
        if (expired.Count == 0) return;

        foreach (var userId in expired)
        {
            var user = await _store.GetUserByIdAsync(userId, ct);
            if (user != null)
            {
                user.LastSeenAt = DateTime.UtcNow;
                await _store.SaveUserAsync(user, ct);
            }
            await _notifier.BroadcastPresenceAsync(userId, ct);
        }
    }
}
