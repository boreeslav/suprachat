using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace SuperMessenger.Web.Services;

public sealed class MiniAppWebSocketManager
{
    static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    readonly ConcurrentDictionary<string, (string ConnectionId, WebSocket Socket)> _connections = new(StringComparer.Ordinal);

    public void Register(string sessionToken, string connectionId, WebSocket socket)
    {
        var key = sessionToken.Trim();
        if (_connections.TryGetValue(key, out var existing))
        {
            _ = CloseSocketAsync(existing.Socket, "replaced");
        }

        _connections[key] = (connectionId, socket);
    }

    public void Unregister(string sessionToken, string connectionId)
    {
        var key = sessionToken.Trim();
        if (!_connections.TryGetValue(key, out var current)) return;
        if (!string.Equals(current.ConnectionId, connectionId, StringComparison.Ordinal)) return;
        _connections.TryRemove(key, out _);
    }

    public void CloseSession(string? sessionToken)
    {
        if (string.IsNullOrWhiteSpace(sessionToken)) return;
        if (!_connections.TryRemove(sessionToken.Trim(), out var current)) return;
        _ = CloseSocketAsync(current.Socket, "session closed");
    }

    public bool IsConnected(string sessionToken) =>
        _connections.TryGetValue(sessionToken.Trim(), out var conn) &&
        conn.Socket.State == WebSocketState.Open;

    public async Task SendDataAsync(
        string sessionToken,
        long seq,
        string payloadJson,
        CancellationToken ct = default)
    {
        if (!_connections.TryGetValue(sessionToken.Trim(), out var conn)) return;
        if (conn.Socket.State != WebSocketState.Open)
        {
            _connections.TryRemove(sessionToken.Trim(), out _);
            return;
        }

        object? payload = null;
        try
        {
            payload = JsonSerializer.Deserialize<object>(payloadJson);
        }
        catch
        {
            payload = payloadJson;
        }

        var frame = new
        {
            type = "data",
            seq,
            payload,
            payloadJson,
            timestamp = DateTime.UtcNow.ToString("O"),
        };

        await SendJsonAsync(conn.Socket, frame, ct);
    }

    public async Task SendJsonAsync(WebSocket socket, object payload, CancellationToken ct = default)
    {
        if (socket.State != WebSocketState.Open) return;

        var json = JsonSerializer.Serialize(payload, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(json);
        var segment = new ArraySegment<byte>(bytes);

        try
        {
            await socket.SendAsync(segment, WebSocketMessageType.Text, true, ct);
        }
        catch
        {
            // caller handles cleanup
        }
    }

    static async Task CloseSocketAsync(WebSocket socket, string reason)
    {
        if (socket.State != WebSocketState.Open && socket.State != WebSocketState.CloseReceived)
            return;

        try
        {
            await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, reason, CancellationToken.None);
        }
        catch
        {
            // best-effort
        }
    }
}
