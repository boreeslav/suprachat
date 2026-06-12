using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace SuperMessenger.Web.Services;

public sealed class BotWebSocketManager
{
    static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, WebSocket>> _connections = new();

    public void Register(Guid botUserId, string connectionId, WebSocket socket)
    {
        var bucket = _connections.GetOrAdd(botUserId, _ => new ConcurrentDictionary<string, WebSocket>());
        bucket[connectionId] = socket;
    }

    public void Unregister(Guid botUserId, string connectionId)
    {
        if (!_connections.TryGetValue(botUserId, out var bucket)) return;
        bucket.TryRemove(connectionId, out _);
        if (bucket.IsEmpty)
            _connections.TryRemove(botUserId, out _);
    }

    public async Task SendToBotAsync(Guid botUserId, object payload, CancellationToken ct = default)
    {
        if (!_connections.TryGetValue(botUserId, out var bucket) || bucket.IsEmpty)
            return;

        var json = JsonSerializer.Serialize(payload, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        var segment = new ArraySegment<byte>(bytes);

        foreach (var (connectionId, socket) in bucket.ToArray())
        {
            if (socket.State != WebSocketState.Open)
            {
                bucket.TryRemove(connectionId, out _);
                continue;
            }

            try
            {
                await socket.SendAsync(segment, WebSocketMessageType.Text, true, ct);
            }
            catch
            {
                bucket.TryRemove(connectionId, out _);
            }
        }
    }
}
