using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/files")]
public sealed class FilesController : ControllerBase
{
    private readonly IDataStore _store;
    private readonly CurrentUserAccessor _current;
    private readonly ChatImageProcessingService _images;
    private readonly ChatFileService _files;
    private readonly string _filesRoot;

    public FilesController(
        IDataStore store,
        CurrentUserAccessor current,
        ChatImageProcessingService images,
        ChatFileService files,
        IConfiguration config)
    {
        _store = store;
        _current = current;
        _images = images;
        _files = files;
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

    // Anonymous avatar for public deep links: joinable groups and channels.
    [HttpGet("group-avatar-public/{chatId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetGroupAvatarPublic(Guid chatId, CancellationToken ct)
    {
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        if (chat == null || chat.AvatarPath == null || !System.IO.File.Exists(chat.AvatarPath))
            return NotFound();
        var isChannel = SupraMessengerService.IsChannelChat(chat);
        var isJoinableGroup = (string.Equals(chat.Type, "group", StringComparison.OrdinalIgnoreCase)
            || string.Equals(chat.Type, "public_group", StringComparison.OrdinalIgnoreCase))
            && chat.AllowJoinByLink;
        if (!isChannel && !isJoinableGroup)
            return NotFound();
        return PhysicalFile(chat.AvatarPath, "image/jpeg");
    }

    [HttpGet("channel-public/{fileId:guid}/preview")]
    [AllowAnonymous]
    public Task<IActionResult> GetChannelPublicPreview(Guid fileId, CancellationToken ct) =>
        ServeVariantAsync(fileId, ImageVariant.Preview, channelPublic: true, ct);

    [HttpGet("channel-public/{fileId:guid}/medium")]
    [AllowAnonymous]
    public Task<IActionResult> GetChannelPublicMedium(Guid fileId, CancellationToken ct) =>
        ServeVariantAsync(fileId, ImageVariant.Medium, channelPublic: true, ct);

    /// <summary>Файлы из сообщений публичного канала (без авторизации).</summary>
    [HttpGet("channel-public/{fileId:guid}")]
    [AllowAnonymous]
    public Task<IActionResult> GetChannelPublicFile(Guid fileId, CancellationToken ct) =>
        ServeVariantAsync(fileId, ImageVariant.Original, channelPublic: true, ct);

    [HttpGet("{fileId:guid}/preview")]
    [Authorize]
    public Task<IActionResult> GetPreview(Guid fileId, CancellationToken ct) =>
        ServeVariantAsync(fileId, ImageVariant.Preview, channelPublic: false, ct);

    [HttpGet("{fileId:guid}/medium")]
    [Authorize]
    public Task<IActionResult> GetMedium(Guid fileId, CancellationToken ct) =>
        ServeVariantAsync(fileId, ImageVariant.Medium, channelPublic: false, ct);

    [HttpGet("{fileId:guid}")]
    [Authorize]
    public Task<IActionResult> GetFile(Guid fileId, CancellationToken ct) =>
        ServeVariantAsync(fileId, ImageVariant.Original, channelPublic: false, ct);

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
            await SaveWithImageVariantsAsync(record, ct);
            return Ok(new { success = true, fileId = fileId.ToString() });
        }

        if (upload == null) return BadRequest(new { success = false, error = "No file" });

        var ext = Path.GetExtension(upload.FileName);
        var storagePath = Path.Combine(_filesRoot, fileId + ext);
        await using (var stream = System.IO.File.Create(storagePath))
            await upload.CopyToAsync(stream, ct);

        var fileRecord = new SupraFileRecord
        {
            Id = fileId,
            ChatId = chatId,
            UploadedByUserId = user.Id,
            FileName = upload.FileName,
            MimeType = upload.ContentType,
            Size = upload.Length,
            StoragePath = storagePath,
        };
        await SaveWithImageVariantsAsync(fileRecord, ct);

        return Ok(new { success = true, fileId = fileId.ToString() });
    }

    private enum ImageVariant { Preview, Medium, Original }

    private async Task<IActionResult> ServeVariantAsync(
        Guid fileId,
        ImageVariant variant,
        bool channelPublic,
        CancellationToken ct)
    {
        var file = await _store.GetFileByIdAsync(fileId, ct);
        if (file == null || !System.IO.File.Exists(file.StoragePath))
            return NotFound();

        if (channelPublic)
        {
            var chat = await _store.GetChatByIdAsync(file.ChatId, ct);
            if (chat == null || !SupraMessengerService.IsChannelChat(chat))
                return NotFound();
        }
        else
        {
            var user = await _current.GetCurrentUserAsync(ct);
            if (user == null) return Unauthorized();
            if (!await _files.CanUserAccessFileAsync(user.Id, file, ct))
                return Forbid();
        }

        file = await EnsureImageVariantsAsync(file, ct);

        return variant switch
        {
            ImageVariant.Preview => ServeImagePath(file.PreviewPath, file),
            ImageVariant.Medium => ServeImagePath(file.MediumPath, file),
            _ => PhysicalFile(file.StoragePath, file.MimeType, file.FileName),
        };
    }

    private IActionResult ServeImagePath(string? variantPath, SupraFileRecord file)
    {
        if (variantPath != null && System.IO.File.Exists(variantPath))
            return PhysicalFile(variantPath, "image/jpeg");
        return PhysicalFile(file.StoragePath, file.MimeType, file.FileName);
    }

    private async Task SaveWithImageVariantsAsync(SupraFileRecord record, CancellationToken ct)
    {
        if (ChatImageProcessingService.IsProcessableImage(record.MimeType, record.FileName))
        {
            try
            {
                var (preview, medium) = await _images.ProcessAsync(record.StoragePath, record.Id, ct);
                record.PreviewPath = preview;
                record.MediumPath = medium;
            }
            catch
            {
                // Оригинал сохранён — варианты сгенерируются при первом запросе.
            }
        }

        await _store.SaveFileAsync(record, ct);
    }

    private async Task<SupraFileRecord> EnsureImageVariantsAsync(SupraFileRecord file, CancellationToken ct)
    {
        if (!ChatImageProcessingService.IsProcessableImage(file.MimeType, file.FileName))
            return file;

        var previewOk = file.PreviewPath != null && System.IO.File.Exists(file.PreviewPath);
        var mediumOk = file.MediumPath != null && System.IO.File.Exists(file.MediumPath);
        if (previewOk && mediumOk)
            return file;

        try
        {
            var (preview, medium) = await _images.ProcessAsync(file.StoragePath, file.Id, ct);
            file.PreviewPath = preview;
            file.MediumPath = medium;
            await _store.SaveFileAsync(file, ct);
        }
        catch
        {
            // Отдаём оригинал как fallback.
        }

        return file;
    }
}
