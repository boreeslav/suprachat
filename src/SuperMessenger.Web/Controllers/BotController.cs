using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/bot")]
[Authorize]
public sealed class BotController : ControllerBase
{
    private const long MaxAvatarBytes = 512_000;

    private readonly SupraMessengerService _messenger;
    private readonly CurrentUserAccessor _current;
    private readonly RealtimeNotifier _realtime;
    private readonly IDataStore _store;
    private readonly string _avatarsRoot;

    public BotController(
        SupraMessengerService messenger,
        CurrentUserAccessor current,
        RealtimeNotifier realtime,
        IDataStore store,
        IConfiguration config)
    {
        _messenger = messenger;
        _current = current;
        _realtime = realtime;
        _store = store;
        var dataRoot = config["Data:Root"] ?? "data";
        _avatarsRoot = Path.Combine(dataRoot, "avatars");
        Directory.CreateDirectory(_avatarsRoot);
    }

    [HttpPost("{botUserId}/avatar")]
    [RequestSizeLimit(MaxAvatarBytes)]
    public async Task<IActionResult> UploadAvatar(string botUserId, IFormFile? photo, CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        if (photo == null || photo.Length == 0)
            return BadRequest(new { success = false, error = "Файл не выбран" });
        if (photo.Length > MaxAvatarBytes)
            return BadRequest(new { success = false, error = "Размер файла не должен превышать 512 КБ" });
        if (!photo.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { success = false, error = "Допустимы только изображения" });
        if (!Guid.TryParse(botUserId, out var botUserGuid))
            return BadRequest(new { success = false, error = "Некорректный botUserId" });

        var path = Path.Combine(_avatarsRoot, botUserGuid + ".jpg");
        await using (var fs = System.IO.File.Create(path))
            await photo.CopyToAsync(fs, ct);

        if (new FileInfo(path).Length > MaxAvatarBytes)
        {
            System.IO.File.Delete(path);
            return BadRequest(new { success = false, error = "Размер файла не должен превышать 512 КБ" });
        }

        var (result, updated) = await _messenger.SaveBotAvatarPathAsync(user, botUserId, path, ct);
        if (!result.success)
        {
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
            return BadRequest(result);
        }

        if (updated != null)
            await BroadcastBotUpdatedAsync(botUserGuid, updated, ct);
        return Ok(result);
    }

    async Task BroadcastBotUpdatedAsync(Guid botUserId, SupraWsBotUpdatedPayload payload, CancellationToken ct)
    {
        var bot = await _store.GetBotByUserIdAsync(botUserId, ct);
        if (bot == null) return;
        await _realtime.SendToUserAsync(bot.OwnerUserId, payload, ct);
        var allChats = await _store.GetChatsAsync(ct);
        var allParts = await _store.GetAllParticipantsAsync(ct);
        foreach (var chat in allChats.Where(c =>
                     string.Equals(c.Type, "direct", StringComparison.OrdinalIgnoreCase)))
        {
            var parts = allParts.Where(p => p.ChatId == chat.Id).ToList();
            if (!parts.Any(p => p.UserId == botUserId)) continue;
            foreach (var p in parts.Where(p => p.UserId != botUserId))
                await _realtime.SendToUserAsync(p.UserId, payload, ct);
        }
    }
}
