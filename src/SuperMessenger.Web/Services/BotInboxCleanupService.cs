using SuperMessenger.Core.Abstractions;
using SuperMessenger.Infrastructure.Services;

namespace SuperMessenger.Web.Services;

public sealed class BotInboxCleanupService : BackgroundService
{
    private static readonly TimeSpan SweepInterval = TimeSpan.FromHours(1);

    private readonly IDataStore _store;
    private readonly ILogger<BotInboxCleanupService> _logger;

    public BotInboxCleanupService(IDataStore store, ILogger<BotInboxCleanupService> logger)
    {
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
                var cutoff = DateTime.UtcNow - BotApiService.InboxRetention;
                await _store.DeleteBotInboxMessagesOlderThanAsync(cutoff, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Bot inbox cleanup failed");
            }
        }
    }
}
