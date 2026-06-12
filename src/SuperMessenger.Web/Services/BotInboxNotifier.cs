using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Services;

namespace SuperMessenger.Web.Services;

public sealed class BotInboxNotifier
{
    private readonly BotWebSocketManager _ws;

    public BotInboxNotifier(BotWebSocketManager ws) => _ws = ws;

    public async Task NotifyAsync(IReadOnlyList<BotInboxMessageRecord> records, CancellationToken ct = default)
    {
        foreach (var record in records)
        {
            var dto = BotApiService.MapInboxDto(record);
            await _ws.SendToBotAsync(record.BotUserId, new BotApiWsEnvelope
            {
                type = "message",
                update = dto,
            }, ct);
        }
    }
}
