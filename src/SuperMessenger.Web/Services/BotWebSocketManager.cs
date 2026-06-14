using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace SuperMessenger.Web.Services;

public sealed class BotWebSocketManager
{
    static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, WebSocket>> _connections = new();
    readonly ConcurrentDictionary<Guid, string> _primaryConnection = new();

    public void Register(Guid botUserId, string connectionId, WebSocket socket)
    {
        var bucket = _connections.GetOrAdd(botUserId, _ => new ConcurrentDictionary<string, WebSocket>());

        foreach (var (oldId, oldSocket) in bucket.ToArray())
        {
            bucket.TryRemove(oldId, out _);
            _ = CloseSocketAsync(oldSocket, "replaced");
        }

        bucket[connectionId] = socket;
        _primaryConnection[botUserId] = connectionId;
    }

    public void Unregister(Guid botUserId, string connectionId)
    {
        if (!_connections.TryGetValue(botUserId, out var bucket)) return;
        bucket.TryRemove(connectionId, out _);
        if (_primaryConnection.TryGetValue(botUserId, out var primary) &&
            string.Equals(primary, connectionId, StringComparison.Ordinal))
        {
            _primaryConnection.TryRemove(botUserId, out _);
        }
        if (bucket.IsEmpty)
            _connections.TryRemove(botUserId, out _);
    }

    public async Task SendToBotAsync(Guid botUserId, object payload, CancellationToken ct = default)
    {
        if (!_connections.TryGetValue(botUserId, out var bucket) || bucket.IsEmpty)
            return;

        if (!_primaryConnection.TryGetValue(botUserId, out var connectionId) ||
            !bucket.TryGetValue(connectionId, out var socket))
        {
            PruneDeadConnections(botUserId, bucket);
            return;
        }

        if (socket.State != WebSocketState.Open)
        {
            Unregister(botUserId, connectionId);
            return;
        }

        var json = JsonSerializer.Serialize(payload, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        var segment = new ArraySegment<byte>(bytes);

        try
        {
            await socket.SendAsync(segment, WebSocketMessageType.Text, true, ct);
        }
        catch
        {
            Unregister(botUserId, connectionId);
        }
    }

    void PruneDeadConnections(Guid botUserId, ConcurrentDictionary<string, WebSocket> bucket)
    {
        foreach (var (connectionId, socket) in bucket.ToArray())
        {
            if (socket.State == WebSocketState.Open) continue;
            Unregister(botUserId, connectionId);
        }
    }

    static async Task CloseSocketAsync(WebSocket socket, string reason)
    {
        if (socket.State != WebSocketState.Open && socket.State != WebSocketState.CloseReceived)
            return;

        try
        {
            await socket.CloseAsync(
                WebSocketCloseStatus.NormalClosure,
                reason,
                CancellationToken.None);
        }
        catch
        {
            // best-effort
        }
    }
}
