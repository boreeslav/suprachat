using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/mini-app")]
public sealed class MiniAppController : ControllerBase
{
    private static readonly Regex ScriptSrcRegex = new(
        @"<script\b([^>]*?)\bsrc\s*=\s*[""']([^""']+)[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LinkHrefRegex = new(
        @"<link\b([^>]*?)\bhref\s*=\s*[""']([^""']+)[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly IDataStore _store;
    private readonly CurrentUserAccessor _current;
    private readonly MiniAppSessionService _sessions;
    private readonly BotApiService _botApi;
    private readonly BotInboxNotifier _botInbox;
    private readonly ChatFileService _files;
    private readonly string _filesRoot;

    public MiniAppController(
        IDataStore store,
        CurrentUserAccessor current,
        MiniAppSessionService sessions,
        BotApiService botApi,
        BotInboxNotifier botInbox,
        ChatFileService files,
        IConfiguration config)
    {
        _store = store;
        _current = current;
        _sessions = sessions;
        _botApi = botApi;
        _botInbox = botInbox;
        _files = files;
        _filesRoot = config["Data:FilesPath"] ?? Path.Combine(config["Data:Root"] ?? "data", "uploads");
    }

    [HttpPost("session")]
    [Authorize]
    public async Task<ActionResult<MiniAppSessionResponseDto>> CreateSession(
        [FromBody] MiniAppSessionRequestDto body, CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();

        if (!Guid.TryParse(body.messageId, out var messageId))
            return BadRequest(new MiniAppSessionResponseDto { success = false, error = "Некорректный messageId" });

        var message = await _store.GetMessageByIdAsync(messageId, ct);
        if (message == null || message.DeletedForEveryone)
            return NotFound(new MiniAppSessionResponseDto { success = false, error = "Сообщение не найдено" });

        if (!await _store.IsParticipantAsync(message.ChatId, user.Id, ct))
            return Forbid();

        if (!MiniAppManifestHelper.TryParseManifest(message.Text, out var manifest) || manifest == null)
            return BadRequest(new MiniAppSessionResponseDto { success = false, error = "Сообщение не является mini app" });

        var sender = await _store.GetUserByIdAsync(message.SenderUserId, ct);
        if (sender == null || !SupraMessengerService.IsBotUser(sender))
            return BadRequest(new MiniAppSessionResponseDto { success = false, error = "Mini app может отправлять только бот" });

        var token = _sessions.CreateSession(user.Id, messageId, message.ChatId, sender.Id, manifest);
        return Ok(new MiniAppSessionResponseDto
        {
            success = true,
            token = token,
            expiresAt = DateTime.UtcNow.Add(MiniAppSessionService.SessionTtl).ToString("O"),
            title = manifest.title,
            baseOrigin = manifest.baseOrigin,
        });
    }

    [HttpGet("frame")]
    [AllowAnonymous]
    public async Task<IActionResult> Frame([FromQuery] string? token, CancellationToken ct)
    {
        var session = _sessions.TryGet(token);
        if (session == null) return NotFound("Session expired");

        var fileIdStr = MiniAppManifestHelper.FindFileId(session.Manifest, session.Manifest.entry);
        if (fileIdStr == null || !Guid.TryParse(fileIdStr, out var fileId))
            return NotFound("Entry file not found");

        var file = await _store.GetFileByIdAsync(fileId, ct);
        if (file == null || !System.IO.File.Exists(file.StoragePath))
            return NotFound("File missing");

        if (!await _files.CanUserAccessFileAsync(session.ViewerUserId, file, ct))
            return Forbid();

        var html = await System.IO.File.ReadAllTextAsync(file.StoragePath, ct);
        html = RewriteAssetUrls(html, token!);
        html = InjectSdk(html, token!, session.Manifest);

        Response.Headers.ContentSecurityPolicy =
            "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'";
        return Content(html, "text/html; charset=utf-8");
    }

    [HttpGet("asset")]
    [AllowAnonymous]
    public async Task<IActionResult> Asset([FromQuery] string? token, [FromQuery] string? path, CancellationToken ct)
    {
        var session = _sessions.TryGet(token);
        if (session == null) return NotFound();

        var normalized = MiniAppManifestHelper.NormalizePath(path);
        if (normalized == null) return BadRequest();

        var fileIdStr = MiniAppManifestHelper.FindFileId(session.Manifest, normalized);
        if (fileIdStr == null || !Guid.TryParse(fileIdStr, out var fileId))
            return NotFound();

        var file = await _store.GetFileByIdAsync(fileId, ct);
        if (file == null || !System.IO.File.Exists(file.StoragePath))
            return NotFound();

        if (!await _files.CanUserAccessFileAsync(session.ViewerUserId, file, ct))
            return Forbid();

        return PhysicalFile(file.StoragePath, file.MimeType ?? "application/octet-stream");
    }

    [HttpPost("data")]
    [AllowAnonymous]
    public async Task<ActionResult<MiniAppDataResponseDto>> SendData(
        [FromBody] MiniAppDataRequestDto body, CancellationToken ct)
    {
        var session = _sessions.TryGet(body.token);
        if (session == null)
            return BadRequest(new MiniAppDataResponseDto { success = false, error = "Сессия истекла" });

        var payloadJson = body.payload == null ? "{}" : JsonSerializer.Serialize(body.payload);
        if (Encoding.UTF8.GetByteCount(payloadJson) > MiniAppSessionService.MaxPayloadBytes)
            return BadRequest(new MiniAppDataResponseDto { success = false, error = "Payload слишком большой" });

        var (ok, error) = await _botApi.RecordWebAppDataAsync(
            session.BotUserId,
            session.ViewerUserId,
            session.ChatId,
            session.MessageId,
            payloadJson,
            ct);
        if (!ok)
            return BadRequest(new MiniAppDataResponseDto { success = false, error = error });

        var inbox = await _store.GetBotInboxMessagesAsync(session.BotUserId, ct);
        var latest = inbox.OrderByDescending(m => m.CreatedOn).FirstOrDefault();
        if (latest != null)
            await _botInbox.NotifyAsync([latest], ct);

        return Ok(new MiniAppDataResponseDto { success = true });
    }

    [HttpGet("context")]
    [AllowAnonymous]
    public async Task<IActionResult> GetContext([FromQuery] string? token, CancellationToken ct)
    {
        var session = _sessions.TryGet(token);
        if (session == null) return Unauthorized();

        var user = await _store.GetUserByIdAsync(session.ViewerUserId, ct);
        var chat = await _store.GetChatByIdAsync(session.ChatId, ct);
        if (user == null || chat == null) return NotFound();

        return Ok(new
        {
            userId = user.Id.ToString(),
            displayName = user.DisplayName ?? user.Login ?? "",
            avatarUrl = $"/api/files/avatar/{user.Id}",
            chatId = session.ChatId.ToString(),
            chatType = chat.Type,
            messageId = session.MessageId.ToString(),
            initData = session.Manifest.initData,
        });
    }

    static string RewriteAssetUrls(string html, string token)
    {
        html = ScriptSrcRegex.Replace(html, m =>
        {
            var src = m.Groups[2].Value;
            if (IsAbsoluteOrApi(src)) return m.Value;
            var path = WebUtility.UrlEncode(src);
            return $"<script{m.Groups[1].Value}src=\"/api/mini-app/asset?token={token}&path={path}\"";
        });
        html = LinkHrefRegex.Replace(html, m =>
        {
            var href = m.Groups[2].Value;
            if (IsAbsoluteOrApi(href)) return m.Value;
            var path = WebUtility.UrlEncode(href);
            return $"<link{m.Groups[1].Value}href=\"/api/mini-app/asset?token={token}&path={path}\"";
        });
        return html;
    }

    static bool IsAbsoluteOrApi(string url) =>
        url.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
        || url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
        || url.StartsWith("/api/", StringComparison.OrdinalIgnoreCase)
        || url.StartsWith("data:", StringComparison.OrdinalIgnoreCase);

    static string InjectSdk(string html, string token, BotMiniAppManifestDto manifest)
    {
        const string marker = "supra-mini-app-sdk";
        if (html.Contains(marker, StringComparison.OrdinalIgnoreCase)) return html;

        var initJson = JsonSerializer.Serialize(manifest.initData ?? new { });
        var tokenJson = JsonSerializer.Serialize(token);
        var boot =
            "<script id=\"" + marker + "\">\n" +
            "window.__SUPRA_MINI_APP__={token:" + tokenJson + ",initData:" + initJson + "};\n" +
            "</script>\n" +
            "<script src=\"/messenger/mini-app-sdk.js\"></script>\n";
        if (html.Contains("</head>", StringComparison.OrdinalIgnoreCase))
            return Regex.Replace(html, "</head>", boot + "</head>", RegexOptions.IgnoreCase);
        return boot + html;
    }
}
