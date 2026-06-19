using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Middleware;

public sealed class MiniAppWebSocketMiddleware
{
    private readonly RequestDelegate _next;

    public MiniAppWebSocketMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        MiniAppSessionService sessions,
        MiniAppWebSocketManager wsManager,
        BotApiService botApi,
        BotInboxNotifier botInbox,
        IDataStore store)
    {
        if (!context.Request.Path.Equals("/ws/mini-app", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsync("WebSocket required", context.RequestAborted);
            return;
        }

        var token = context.Request.Query["token"].ToString();
        var session = sessions.TryGet(token);
        if (session == null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsync("Session expired or invalid", context.RequestAborted);
            return;
        }

        var socket = await context.WebSockets.AcceptWebSocketAsync();
        var connectionId = Guid.NewGuid().ToString("N");
        var sessionToken = session.Token;
        wsManager.Register(sessionToken, connectionId, socket);

        try
        {
            await wsManager.SendJsonAsync(socket, new { type = "connected", sessionToken }, context.RequestAborted);

            var buffer = new byte[16_384];
            while (socket.State == WebSocketState.Open && !context.RequestAborted.IsCancellationRequested)
            {
                var result = await socket.ReceiveAsync(buffer, context.RequestAborted);
                if (result.MessageType == WebSocketMessageType.Close)
                    break;

                if (result.MessageType != WebSocketMessageType.Text)
                    continue;

                var text = Encoding.UTF8.GetString(buffer, 0, result.Count);
                if (string.IsNullOrWhiteSpace(text))
                    continue;

                await HandleClientMessageAsync(
                    text,
                    sessionToken,
                    sessions,
                    wsManager,
                    botApi,
                    botInbox,
                    store,
                    socket,
                    context.RequestAborted);
            }
        }
        finally
        {
            wsManager.Unregister(sessionToken, connectionId);
            if (socket.State == WebSocketState.Open || socket.State == WebSocketState.CloseReceived)
            {
                try
                {
                    await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "bye", CancellationToken.None);
                }
                catch
                {
                    // best-effort
                }
            }
        }
    }

    static async Task HandleClientMessageAsync(
        string text,
        string sessionToken,
        MiniAppSessionService sessions,
        MiniAppWebSocketManager wsManager,
        BotApiService botApi,
        BotInboxNotifier botInbox,
        IDataStore store,
        WebSocket socket,
        CancellationToken ct)
    {
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(text);
        }
        catch
        {
            return;
        }

        using (doc)
        {
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : null;

            if (string.Equals(type, "ping", StringComparison.OrdinalIgnoreCase))
            {
                await wsManager.SendJsonAsync(socket, new { type = "pong" }, ct);
                return;
            }

            if (!string.Equals(type, "data", StringComparison.OrdinalIgnoreCase))
                return;

            var session = sessions.TryGet(sessionToken);
            if (session == null)
            {
                await wsManager.SendJsonAsync(socket, new
                {
                    type = "dataAck",
                    requestId = GetRequestId(root),
                    success = false,
                    error = "Сессия истекла",
                }, ct);
                return;
            }

            sessions.Touch(sessionToken);

            string payloadJson;
            if (root.TryGetProperty("payload", out var payloadEl))
                payloadJson = payloadEl.GetRawText();
            else
                payloadJson = "{}";

            if (Encoding.UTF8.GetByteCount(payloadJson) > MiniAppSessionService.MaxPayloadBytes)
            {
                await wsManager.SendJsonAsync(socket, new
                {
                    type = "dataAck",
                    requestId = GetRequestId(root),
                    success = false,
                    error = "Payload слишком большой",
                }, ct);
                return;
            }

            var (ok, error) = await botApi.RecordWebAppDataAsync(
                session.BotUserId,
                session.ViewerUserId,
                session.ChatId,
                session.MessageId,
                payloadJson,
                sessionToken: sessionToken,
                ct);
            if (!ok)
            {
                await wsManager.SendJsonAsync(socket, new
                {
                    type = "dataAck",
                    requestId = GetRequestId(root),
                    success = false,
                    error,
                }, ct);
                return;
            }

            var inbox = await store.GetBotInboxMessagesAsync(session.BotUserId, ct);
            var latest = inbox.OrderByDescending(m => m.CreatedOn).FirstOrDefault();
            if (latest != null)
                await botInbox.NotifyAsync([latest], ct);

            await wsManager.SendJsonAsync(socket, new
            {
                type = "dataAck",
                requestId = GetRequestId(root),
                success = true,
            }, ct);
        }
    }

    static string? GetRequestId(JsonElement root) =>
        root.TryGetProperty("requestId", out var idEl) && idEl.ValueKind == JsonValueKind.String
            ? idEl.GetString()
            : null;
}
