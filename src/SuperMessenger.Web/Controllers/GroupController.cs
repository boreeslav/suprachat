using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;


namespace SuperMessenger.Web.Controllers;



[ApiController]

[Route("api/group")]

[Authorize]

public sealed class GroupController : ControllerBase

{

    private const long MaxAvatarBytes = 512_000;



    private readonly SupraMessengerService _messenger;

    private readonly CurrentUserAccessor _current;

    private readonly RealtimeNotifier _realtime;

    private readonly string _avatarsRoot;



    public GroupController(

        SupraMessengerService messenger,

        CurrentUserAccessor current,

        RealtimeNotifier realtime,

        IConfiguration config)

    {

        _messenger = messenger;

        _current = current;

        _realtime = realtime;

        var dataRoot = config["Data:Root"] ?? "data";

        _avatarsRoot = Path.Combine(dataRoot, "group-avatars");

        Directory.CreateDirectory(_avatarsRoot);

    }



    [HttpPost("{chatId}/avatar")]

    [RequestSizeLimit(MaxAvatarBytes)]

    public async Task<IActionResult> UploadAvatar(string chatId, IFormFile? photo, CancellationToken ct)

    {

        var user = await _current.GetCurrentUserAsync(ct);

        if (user == null) return Unauthorized();

        if (photo == null || photo.Length == 0)

            return BadRequest(new { success = false, error = "Файл не выбран" });

        if (photo.Length > MaxAvatarBytes)

            return BadRequest(new { success = false, error = "Размер файла не должен превышать 512 КБ" });

        if (!photo.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))

            return BadRequest(new { success = false, error = "Допустимы только изображения" });



        if (!Guid.TryParse(chatId, out var chatGuid))

            return BadRequest(new { success = false, error = "Некорректный chatId" });



        var path = Path.Combine(_avatarsRoot, chatGuid + ".jpg");

        await using (var fs = System.IO.File.Create(path))

            await photo.CopyToAsync(fs, ct);



        if (new FileInfo(path).Length > MaxAvatarBytes)

        {

            System.IO.File.Delete(path);

            return BadRequest(new { success = false, error = "Размер файла не должен превышать 512 КБ" });

        }



        var (result, systemEvent) = await _messenger.SaveGroupAvatarPathAsync(user, chatId, path, ct);

        if (!result.success)

        {

            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

            return BadRequest(result);

        }



        await BroadcastGroupUpdatedAsync(chatGuid, ct);

        if (systemEvent != null)

            await BroadcastChatMessageAsync(chatGuid, systemEvent, ct);

        return Ok(result);

    }



    async Task BroadcastGroupUpdatedAsync(Guid chatId, CancellationToken ct)

    {

        var payload = await _messenger.GetGroupUpdatedPayloadAsync(chatId, ct);

        if (payload == null) return;

        var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);

        foreach (var uid in participants)

            await _realtime.SendToUserAsync(uid, payload, ct);

    }



    async Task BroadcastChatMessageAsync(Guid chatId, SupraWsNewMessagePayload payload, CancellationToken ct)

    {

        var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);

        foreach (var uid in participants)

            await _realtime.SendToUserAsync(uid, payload, ct);

    }

}


