using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Middleware;

public sealed class BotWebSocketMiddleware
{
    private readonly RequestDelegate _next;

    public BotWebSocketMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        BotApiService botApi,
        BotWebSocketManager wsManager)
    {
        if (!context.Request.Path.Equals("/ws/bot", StringComparison.OrdinalIgnoreCase))
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

        var login = context.Request.Query["login"].ToString();
        if (string.IsNullOrWhiteSpace(login))
            login = context.Request.Query["bot"].ToString();
        var token = context.Request.Query["token"].ToString();

        if (string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(token))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsync(
                "Unauthorized: login and token required in URL query",
                context.RequestAborted);
            return;
        }

        var auth = await botApi.AuthenticateAsync(login.Trim(), token.Trim(), context.RequestAborted);
        if (auth == null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsync("Unauthorized", context.RequestAborted);
            return;
        }

        var (botUser, _) = auth.Value;
        var socket = await context.WebSockets.AcceptWebSocketAsync();
        var connectionId = Guid.NewGuid().ToString("N");
        wsManager.Register(botUser.Id, connectionId, socket);

        try
        {
            await wsManager.SendToBotAsync(botUser.Id, new BotApiWsEnvelope
            {
                type = "connected",
                botUserId = botUser.Id.ToString(),
            }, context.RequestAborted);

            var buffer = new byte[4096];
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

                try
                {
                    using var doc = JsonDocument.Parse(text);
                    var action = doc.RootElement.TryGetProperty("action", out var actEl)
                        ? actEl.GetString()
                        : null;
                    if (string.Equals(action, "ping", StringComparison.OrdinalIgnoreCase))
                    {
                        await wsManager.SendToBotAsync(botUser.Id, new { type = "pong" }, context.RequestAborted);
                    }
                }
                catch
                {
                    // ignore malformed client frames
                }
            }
        }
        finally
        {
            wsManager.Unregister(botUser.Id, connectionId);
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
}
