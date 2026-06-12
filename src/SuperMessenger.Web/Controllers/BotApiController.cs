using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/bot-api")]
[AllowAnonymous]
public sealed class BotApiController : ControllerBase
{
    private readonly BotApiService _botApi;
    private readonly RealtimeNotifier _realtime;

    public BotApiController(BotApiService botApi, RealtimeNotifier realtime)
    {
        _botApi = botApi;
        _realtime = realtime;
    }

    [HttpGet("me")]
    [HttpPost("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null) return Unauthorized(new BotApiMeResponse { success = false, error = "Unauthorized" });
        var (botUser, bot) = auth.Value;
        return Ok(await _botApi.GetMeAsync(botUser, bot, ct));
    }

    [HttpGet("sendMessage")]
    [HttpPost("sendMessage")]
    public async Task<IActionResult> SendMessage(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSendMessageResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var (response, broadcast) = await _botApi.SendMessageAsync(
            botUser,
            p.text ?? "",
            p.userLogin,
            p.chatId,
            ct);

        if (response.success && broadcast != null &&
            Guid.TryParse(broadcast.chatId, out var chatGuid))
        {
            var participants = await GetChatParticipantIdsAsync(chatGuid, ct);
            await _realtime.BroadcastToChatParticipantsAsync(participants, broadcast, ct);
        }

        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("getMessages")]
    [HttpPost("getMessages")]
    public async Task<IActionResult> GetMessages(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiGetMessagesResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var count = ParseInt(p.count, 50);
        var offset = ParseInt(p.offset, 0);
        var response = await _botApi.GetMessagesAsync(
            botUser.Id,
            count,
            offset,
            p.afterMessageId,
            ct);
        return Ok(response);
    }

    async Task<(UserRecord botUser, BotRecord bot)?> AuthenticateParamsAsync(
        BotApiRequestParams p, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(p.login) || string.IsNullOrWhiteSpace(p.token))
            return null;
        return await _botApi.AuthenticateAsync(p.login!, p.token!, ct);
    }

    async Task<BotApiRequestParams> ReadParamsAsync(CancellationToken ct)
    {
        var creds = BotApiRequestReader.ReadQueryCredentials(Request);
        var result = new BotApiRequestParams
        {
            login = creds.Login,
            token = creds.Token,
            text = Request.Query["text"].ToString(),
            userLogin = Request.Query["userLogin"].ToString(),
            chatId = Request.Query["chatId"].ToString(),
            count = Request.Query["count"].ToString(),
            offset = Request.Query["offset"].ToString(),
            afterMessageId = Request.Query["afterMessageId"].ToString(),
        };

        if (!HttpMethods.IsPost(Request.Method) && !HttpMethods.IsPut(Request.Method))
            return result;

        if (Request.ContentLength is null or 0)
            return result;

        try
        {
            Request.EnableBuffering();
            Request.Body.Position = 0;
            using var doc = await JsonDocument.ParseAsync(Request.Body, cancellationToken: ct);
            var root = doc.RootElement;
            result.text = FirstNonEmpty(result.text, GetString(root, "text"));
            result.userLogin = FirstNonEmpty(result.userLogin, GetString(root, "userLogin"));
            result.chatId = FirstNonEmpty(result.chatId, GetString(root, "chatId"));
            result.count = FirstNonEmpty(result.count, GetString(root, "count"));
            result.offset = FirstNonEmpty(result.offset, GetString(root, "offset"));
            result.afterMessageId = FirstNonEmpty(result.afterMessageId, GetString(root, "afterMessageId"));
        }
        catch
        {
            // query-only fallback
        }

        return result;
    }

    static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var v in values)
        {
            if (!string.IsNullOrWhiteSpace(v))
                return v.Trim();
        }
        return null;
    }

    static string? GetString(JsonElement el, string name) =>
        el.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String
            ? prop.GetString()
            : null;

    static int ParseInt(string? raw, int fallback) =>
        int.TryParse(raw, out var n) ? n : fallback;

    async Task<IReadOnlyList<Guid>> GetChatParticipantIdsAsync(Guid chatId, CancellationToken ct)
    {
        var store = HttpContext.RequestServices.GetRequiredService<Core.Abstractions.IDataStore>();
        var parts = await store.GetParticipantsByChatAsync(chatId, ct);
        return parts.Select(p => p.UserId).ToList();
    }

    sealed class BotApiRequestParams
    {
        public string? login { get; set; }
        public string? token { get; set; }
        public string? text { get; set; }
        public string? userLogin { get; set; }
        public string? chatId { get; set; }
        public string? count { get; set; }
        public string? offset { get; set; }
        public string? afterMessageId { get; set; }
    }
}
