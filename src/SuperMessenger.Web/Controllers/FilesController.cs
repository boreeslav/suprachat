using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/files")]
public sealed class FilesController : ControllerBase
{
    private readonly IDataStore _store;
    private readonly CurrentUserAccessor _current;
    private readonly string _filesRoot;

    public FilesController(IDataStore store, CurrentUserAccessor current, IConfiguration config)
    {
        _store = store;
        _current = current;
        _filesRoot = config["Data:FilesPath"] ?? Path.Combine(config["Data:Root"] ?? "data", "uploads");
        Directory.CreateDirectory(_filesRoot);
    }

    [HttpGet("avatar/{userId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvatar(Guid userId, CancellationToken ct)
    {
        var user = await _store.GetUserByIdAsync(userId, ct);
        if (user?.AvatarPath == null || !System.IO.File.Exists(user.AvatarPath))
            return NotFound();
        return PhysicalFile(user.AvatarPath, "image/jpeg");
    }

    [HttpGet("group-avatar/{chatId:guid}")]
    [Authorize]
    public async Task<IActionResult> GetGroupAvatar(Guid chatId, CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        if (!await _store.IsParticipantAsync(chatId, user.Id, ct))
            return Forbid();
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        if (chat?.AvatarPath == null || !System.IO.File.Exists(chat.AvatarPath))
            return NotFound();
        return PhysicalFile(chat.AvatarPath, "image/jpeg");
    }

    // Anonymous group avatar, only for groups that allow joining by link
    // (used by the public deep-link preview for unauthenticated visitors).
    [HttpGet("group-avatar-public/{chatId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetGroupAvatarPublic(Guid chatId, CancellationToken ct)
    {
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        if (chat == null || !chat.AllowJoinByLink ||
            chat.AvatarPath == null || !System.IO.File.Exists(chat.AvatarPath))
            return NotFound();
        return PhysicalFile(chat.AvatarPath, "image/jpeg");
    }

    [HttpGet("{fileId:guid}")]
    [Authorize]
    public async Task<IActionResult> GetFile(Guid fileId, CancellationToken ct)
    {
        var file = await _store.GetFileByIdAsync(fileId, ct);
        if (file == null || !System.IO.File.Exists(file.StoragePath))
            return NotFound();
        return PhysicalFile(file.StoragePath, file.MimeType, file.FileName);
    }

    [HttpPost("upload")]
    [Authorize]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> Upload(CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();

        if (!Request.HasFormContentType)
            return BadRequest(new { success = false, error = "multipart/form-data expected" });

        var fileIdStr = Request.Form["fileId"].FirstOrDefault();
        if (!Guid.TryParse(fileIdStr, out var fileId))
            fileId = Guid.NewGuid();

        var chatIdStr = Request.Form["parentColumnValue"].FirstOrDefault()
            ?? Request.Form["chatId"].FirstOrDefault();
        if (!Guid.TryParse(chatIdStr, out var chatId))
            return BadRequest(new { success = false, error = "chatId required" });

        if (!await _store.IsParticipantAsync(chatId, user.Id, ct))
            return Forbid();

        IFormFile? upload = Request.Form.Files["file"];
        if (upload == null && Request.ContentLength > 0)
        {
            var fileName = Request.Headers["Content-Disposition"].ToString();
            var mime = Request.ContentType ?? "application/octet-stream";
            var path = Path.Combine(_filesRoot, $"{fileId}");
            await using var fs = System.IO.File.Create(path);
            await Request.Body.CopyToAsync(fs, ct);
            var record = new SupraFileRecord
            {
                Id = fileId,
                ChatId = chatId,
                UploadedByUserId = user.Id,
                FileName = "upload",
                MimeType = mime,
                Size = fs.Length,
                StoragePath = path,
            };
            await _store.SaveFileAsync(record, ct);
            return Ok(new { success = true, fileId = fileId.ToString() });
        }

        if (upload == null) return BadRequest(new { success = false, error = "No file" });

        var ext = Path.GetExtension(upload.FileName);
        var storagePath = Path.Combine(_filesRoot, fileId + ext);
        await using (var stream = System.IO.File.Create(storagePath))
            await upload.CopyToAsync(stream, ct);

        await _store.SaveFileAsync(new SupraFileRecord
        {
            Id = fileId,
            ChatId = chatId,
            UploadedByUserId = user.Id,
            FileName = upload.FileName,
            MimeType = upload.ContentType,
            Size = upload.Length,
            StoragePath = storagePath,
        }, ct);

        return Ok(new { success = true, fileId = fileId.ToString() });
    }
}
