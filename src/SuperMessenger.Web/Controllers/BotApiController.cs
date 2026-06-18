using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
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
    private const long MaxAvatarBytes = 512_000;
    private const long MaxUploadBytes = 100_000_000;

    private readonly BotApiService _botApi;
    private readonly SupraMessengerService _messenger;
    private readonly RealtimeNotifier _realtime;
    private readonly MiniAppChannelService _miniAppChannel;
    private readonly IDataStore _store;
    private readonly ChatImageProcessingService _images;
    private readonly string _avatarsRoot;
    private readonly string _filesRoot;

    public BotApiController(
        BotApiService botApi,
        SupraMessengerService messenger,
        RealtimeNotifier realtime,
        MiniAppChannelService miniAppChannel,
        IDataStore store,
        ChatImageProcessingService images,
        IConfiguration config)
    {
        _botApi = botApi;
        _messenger = messenger;
        _realtime = realtime;
        _miniAppChannel = miniAppChannel;
        _store = store;
        _images = images;
        var dataRoot = config["Data:Root"] ?? "data";
        _avatarsRoot = Path.Combine(dataRoot, "group-avatars");
        _filesRoot = config["Data:FilesPath"] ?? Path.Combine(dataRoot, "uploads");
        Directory.CreateDirectory(_avatarsRoot);
        Directory.CreateDirectory(_filesRoot);
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
            p.buttons,
            p.caption,
            p.photoFileId,
            p.photoFileIds,
            p.documentFileId,
            p.attachmentFileIds,
            ParseBool(p.invisible, false),
            p.targetUserLogin,
            ct);

        if (response.success && broadcast != null &&
            Guid.TryParse(broadcast.chatId, out var chatGuid))
        {
            var participants = await GetChatParticipantIdsAsync(chatGuid, ct);
            await _realtime.BroadcastToChatParticipantsAsync(participants, broadcast, ct);
        }

        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("sendMiniApp")]
    [HttpPost("sendMiniApp")]
    public async Task<IActionResult> SendMiniApp(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSendMiniAppResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var manifest = BuildMiniAppManifest(p);
        var (response, broadcast) = await _botApi.SendMiniAppAsync(
            botUser,
            manifest,
            p.userLogin,
            p.chatId,
            ParseBool(p.invisible, false),
            p.targetUserLogin,
            ct);

        if (response.success && broadcast != null &&
            Guid.TryParse(broadcast.chatId, out var chatGuid))
        {
            var participants = await GetChatParticipantIdsAsync(chatGuid, ct);
            await _realtime.BroadcastToChatParticipantsAsync(participants, broadcast, ct);
        }

        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("sendWebAppData")]
    [HttpPost("sendWebAppData")]
    public async Task<IActionResult> SendWebAppData(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSendWebAppDataResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var payloadJson = p.payload == null ? "{}" : JsonSerializer.Serialize(p.payload);

        (bool ok, long seq, string? error) result;
        if (!string.IsNullOrWhiteSpace(p.sessionToken))
        {
            result = _miniAppChannel.Enqueue(botUser.Id, p.sessionToken!, payloadJson);
        }
        else if (!string.IsNullOrWhiteSpace(p.miniAppMessageId) && !string.IsNullOrWhiteSpace(p.userLogin))
        {
            if (!Guid.TryParse(p.miniAppMessageId, out var messageId))
                return BadRequest(new BotApiSendWebAppDataResponse { success = false, error = "Некорректный miniAppMessageId" });

            var viewer = await _store.GetUserByLoginAsync(p.userLogin!.Trim(), ct);
            if (viewer == null || !viewer.IsActive)
                return BadRequest(new BotApiSendWebAppDataResponse { success = false, error = "Пользователь не найден" });

            result = _miniAppChannel.EnqueueByMessageUser(botUser.Id, messageId, viewer.Id, payloadJson);
        }
        else
        {
            return BadRequest(new BotApiSendWebAppDataResponse
            {
                success = false,
                error = "Укажите sessionToken или miniAppMessageId + userLogin",
            });
        }

        if (!result.ok)
            return BadRequest(new BotApiSendWebAppDataResponse { success = false, error = result.error });

        return Ok(new BotApiSendWebAppDataResponse { success = true, seq = result.seq });
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

    [HttpGet("sendActivity")]
    [HttpPost("sendActivity")]
    public async Task<IActionResult> SendActivity(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSendActivityResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var active = ParseBool(p.active, true);
        var (response, broadcast) = await _botApi.SendActivityAsync(
            botUser,
            p.userLogin,
            p.chatId,
            p.activityType ?? "",
            active,
            p.activityMessage,
            ct);

        if (response.success && broadcast != null &&
            Guid.TryParse(broadcast.chatId, out var chatGuid))
        {
            var participants = await GetChatParticipantIdsAsync(chatGuid, ct);
            var targets = participants.Where(id => id != botUser.Id).ToList();
            await _realtime.BroadcastToChatParticipantsAsync(targets, broadcast, ct);
        }

        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("getActivity")]
    [HttpPost("getActivity")]
    public async Task<IActionResult> GetActivity(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiGetActivityResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        return Ok(await _botApi.GetActivityAsync(botUser, p.userLogin, p.chatId, ct));
    }

    [HttpGet("editMessage")]
    [HttpPost("editMessage")]
    public async Task<IActionResult> EditMessage(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiEditMessageResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var (response, broadcast) = await _botApi.EditMessageAsync(
            botUser,
            p.chatId ?? "",
            p.messageId ?? "",
            p.text,
            p.buttons,
            p.caption,
            p.photoFileId,
            p.photoFileIds,
            p.documentFileId,
            p.attachmentFileIds,
            ct);

        if (response.success && broadcast != null &&
            Guid.TryParse(broadcast.chatId, out var chatGuid))
        {
            var participants = await GetAllChatParticipantIdsAsync(chatGuid, ct);
            foreach (var uid in participants)
                await _realtime.SendToUserAsync(uid, broadcast, ct);
        }

        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("deleteMessage")]
    [HttpPost("deleteMessage")]
    public async Task<IActionResult> DeleteMessage(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiDeleteMessageResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var deleteForEveryone = ParseBool(p.deleteForEveryone, true);
        var (response, broadcast) = await _botApi.DeleteMessageAsync(
            botUser,
            p.chatId ?? "",
            p.messageId ?? "",
            deleteForEveryone,
            ct);

        if (response.success && broadcast != null &&
            Guid.TryParse(broadcast.chatId, out var chatGuid))
        {
            var participants = await GetAllChatParticipantIdsAsync(chatGuid, ct);
            foreach (var uid in participants)
                await _realtime.SendToUserAsync(uid, broadcast, ct);
        }

        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpPost("uploadFile")]
    [RequestSizeLimit(100_000_000)]
    public async Task<IActionResult> UploadFile(IFormFile? file, CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiUploadFileResponse { success = false, error = "Unauthorized" });

        if (file == null || file.Length == 0)
            return BadRequest(new BotApiUploadFileResponse { success = false, error = "Файл не выбран" });
        if (file.Length > MaxUploadBytes)
            return BadRequest(new BotApiUploadFileResponse { success = false, error = "Размер файла не должен превышать 100 МБ" });
        if (!Guid.TryParse(p.chatId, out var chatGuid))
            return BadRequest(new BotApiUploadFileResponse { success = false, error = "Некорректный chatId" });

        var (botUser, _) = auth.Value;
        if (!await _store.IsParticipantAsync(chatGuid, botUser.Id, ct))
            return BadRequest(new BotApiUploadFileResponse { success = false, error = "Бот не является участником чата" });

        var fileId = Guid.NewGuid();
        var ext = Path.GetExtension(file.FileName);
        var storagePath = Path.Combine(_filesRoot, fileId + ext);
        await using (var stream = System.IO.File.Create(storagePath))
            await file.CopyToAsync(stream, ct);

        var fileRecord = new SupraFileRecord
        {
            Id = fileId,
            ChatId = chatGuid,
            UploadedByUserId = botUser.Id,
            FileName = file.FileName,
            MimeType = file.ContentType ?? "application/octet-stream",
            Size = file.Length,
            StoragePath = storagePath,
        };
        await SaveWithImageVariantsAsync(fileRecord, ct);

        return Ok(new BotApiUploadFileResponse
        {
            success = true,
            fileId = fileId.ToString(),
            fileName = fileRecord.FileName,
            mimeType = fileRecord.MimeType,
            size = fileRecord.Size,
            chatId = chatGuid.ToString(),
        });
    }

    [HttpGet("getFile")]
    public Task<IActionResult> GetFile(CancellationToken ct) =>
        ServeBotFileAsync(ImageVariant.Original, ct);

    [HttpGet("getFilePreview")]
    public Task<IActionResult> GetFilePreview(CancellationToken ct) =>
        ServeBotFileAsync(ImageVariant.Preview, ct);

    [HttpGet("getFileMedium")]
    public Task<IActionResult> GetFileMedium(CancellationToken ct) =>
        ServeBotFileAsync(ImageVariant.Medium, ct);

    async Task<IActionResult> ServeBotFileAsync(ImageVariant variant, CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null) return Unauthorized();
        if (!Guid.TryParse(p.fileId, out var fileGuid))
            return BadRequest(new { success = false, error = "Некорректный fileId" });

        var (botUser, _) = auth.Value;
        var (file, error) = await _botApi.GetAccessibleFileAsync(botUser, fileGuid, ct);
        if (error != null)
            return error == "Файл не найден" ? NotFound() : Forbid();

        file = await EnsureImageVariantsAsync(file!, ct);
        return variant switch
        {
            ImageVariant.Preview => ServeImagePath(file.PreviewPath, file),
            ImageVariant.Medium => ServeImagePath(file.MediumPath, file),
            _ => PhysicalFile(file.StoragePath, file.MimeType, file.FileName),
        };
    }

    async Task SaveWithImageVariantsAsync(SupraFileRecord record, CancellationToken ct)
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

    async Task<SupraFileRecord> EnsureImageVariantsAsync(SupraFileRecord file, CancellationToken ct)
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

    enum ImageVariant { Preview, Medium, Original }

    IActionResult ServeImagePath(string? variantPath, SupraFileRecord file)
    {
        if (variantPath != null && System.IO.File.Exists(variantPath))
            return PhysicalFile(variantPath, "image/jpeg");
        return PhysicalFile(file.StoragePath, file.MimeType, file.FileName);
    }

    [HttpGet("getMenu")]
    [HttpPost("getMenu")]
    public async Task<IActionResult> GetMenu(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiGetMenuResponse { success = false, error = "Unauthorized" });

        var (_, bot) = auth.Value;
        return Ok(await _botApi.GetMenuAsync(bot, p.chatId, ct));
    }

    [HttpGet("setMenu")]
    [HttpPost("setMenu")]
    public async Task<IActionResult> SetMenu(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSetMenuResponse { success = false, error = "Unauthorized" });

        var (botUser, bot) = auth.Value;
        var (response, payload) = await _botApi.SetMenuAsync(botUser, bot, p.menu, p.chatId, ct);
        if (!response.success)
            return BadRequest(response);

        if (payload != null)
            await BroadcastBotUpdatedAsync(payload, ct);

        return Ok(response);
    }

    [HttpGet("getAssistantMenu")]
    [HttpPost("getAssistantMenu")]
    public async Task<IActionResult> GetAssistantMenu(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiGetAssistantMenuResponse { success = false, error = "Unauthorized" });

        var (_, bot) = auth.Value;
        return Ok(await _botApi.GetAssistantMenuAsync(bot, p.chatId, ct));
    }

    [HttpGet("setAssistantMenu")]
    [HttpPost("setAssistantMenu")]
    public async Task<IActionResult> SetAssistantMenu(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSetAssistantMenuResponse { success = false, error = "Unauthorized" });

        var (botUser, bot) = auth.Value;
        var (response, payload) = await _botApi.SetAssistantMenuAsync(botUser, bot, p.assistantMenu ?? p.menu, p.chatId, ct);
        if (!response.success)
            return BadRequest(response);

        if (payload != null)
            await BroadcastBotAssistantUpdatedAsync(payload, ct);

        return Ok(response);
    }

    [HttpGet("getGroupMenu")]
    [HttpPost("getGroupMenu")]
    public async Task<IActionResult> GetGroupMenu(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiGetGroupMenuResponse { success = false, error = "Unauthorized" });

        var (_, bot) = auth.Value;
        return Ok(await _botApi.GetGroupMenuAsync(bot, p.chatId, ct));
    }

    [HttpGet("setGroupMenu")]
    [HttpPost("setGroupMenu")]
    public async Task<IActionResult> SetGroupMenu(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSetGroupMenuResponse { success = false, error = "Unauthorized" });

        var (botUser, bot) = auth.Value;
        var menu = p.groupMenu ?? p.menu;
        var (response, payload) = await _botApi.SetGroupMenuAsync(botUser, bot, menu, p.chatId, ct);
        if (!response.success)
            return BadRequest(response);

        if (payload != null)
            await BroadcastBotGroupUpdatedAsync(payload, ct);

        return Ok(response);
    }

    [HttpGet("assistantReply")]
    [HttpPost("assistantReply")]
    public async Task<IActionResult> AssistantReply(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiAssistantReplyResponse { success = false, error = "Unauthorized" });

        var (botUser, bot) = auth.Value;
        var (response, botBroadcast, pending) = await _botApi.AssistantReplyAsync(
            botUser,
            bot,
            p.sessionId ?? "",
            p.text ?? "",
            p.caption,
            p.photoFileId,
            p.photoFileIds,
            p.documentFileId,
            p.attachmentFileIds,
            ct);

        if (!response.success)
            return BadRequest(response);

        if (botBroadcast != null && Guid.TryParse(botBroadcast.chatId, out var botChatGuid))
            await BroadcastChatMessageAsync(botChatGuid, botBroadcast, ct);

        if (pending != null && Guid.TryParse(pending.sessionId, out var sessionGuid))
        {
            var session = await _store.GetBotAssistantSessionByIdAsync(sessionGuid, ct);
            if (session != null)
                await _realtime.SendToUserAsync(session.UserId, pending, ct);
        }

        return Ok(response);
    }

    [HttpGet("getChatInfo")]
    [HttpPost("getChatInfo")]
    public async Task<IActionResult> GetChatInfo(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiGetChatInfoResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var response = await _botApi.GetChatInfoAsync(botUser, p.chatId ?? "", ct);
        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("updateGroup")]
    [HttpPost("updateGroup")]
    public async Task<IActionResult> UpdateGroup(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiUpdateGroupResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var (response, systemEvent, groupUpdated) = await _botApi.UpdateGroupAsync(
            botUser,
            p.chatId ?? "",
            p.name,
            p.description,
            ParseNullableBool(p.allowJoinByLink),
            ct);

        if (response.success && Guid.TryParse(p.chatId, out var chatGuid))
        {
            if (groupUpdated != null)
                await BroadcastGroupUpdatedAsync(chatGuid, ct);
            if (systemEvent != null)
                await BroadcastChatMessageAsync(chatGuid, systemEvent, ct);
        }

        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpPost("setGroupAvatar")]
    [RequestSizeLimit(MaxAvatarBytes)]
    public async Task<IActionResult> SetGroupAvatar(IFormFile? photo, CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiUpdateGroupResponse { success = false, error = "Unauthorized" });
        if (photo == null || photo.Length == 0)
            return BadRequest(new BotApiUpdateGroupResponse { success = false, error = "Файл не выбран" });
        if (photo.Length > MaxAvatarBytes)
            return BadRequest(new BotApiUpdateGroupResponse { success = false, error = "Размер файла не должен превышать 512 КБ" });
        if (!photo.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new BotApiUpdateGroupResponse { success = false, error = "Допустимы только изображения" });
        if (!Guid.TryParse(p.chatId, out var chatGuid))
            return BadRequest(new BotApiUpdateGroupResponse { success = false, error = "Некорректный chatId" });

        var path = Path.Combine(_avatarsRoot, chatGuid + ".jpg");
        await using (var fs = System.IO.File.Create(path))
            await photo.CopyToAsync(fs, ct);
        if (new FileInfo(path).Length > MaxAvatarBytes)
        {
            System.IO.File.Delete(path);
            return BadRequest(new BotApiUpdateGroupResponse { success = false, error = "Размер файла не должен превышать 512 КБ" });
        }

        var (botUser, _) = auth.Value;
        var (response, systemEvent, groupUpdated) = await _botApi.SaveGroupAvatarAsync(botUser, p.chatId!, path, ct);
        if (!response.success)
        {
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
            return BadRequest(response);
        }

        if (groupUpdated != null)
            await BroadcastGroupUpdatedAsync(chatGuid, ct);
        if (systemEvent != null)
            await BroadcastChatMessageAsync(chatGuid, systemEvent, ct);
        return Ok(response);
    }

    [HttpGet("removeGroupMember")]
    [HttpPost("removeGroupMember")]
    public async Task<IActionResult> RemoveGroupMember(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSimpleResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var response = await _botApi.RemoveGroupMemberAsync(
            botUser, p.chatId ?? "", p.memberUserId ?? p.userId ?? "", ct);
        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("blockGroupMember")]
    [HttpPost("blockGroupMember")]
    public async Task<IActionResult> BlockGroupMember(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSimpleResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var response = await _botApi.BlockGroupMemberAsync(
            botUser, p.chatId ?? "", p.memberUserId ?? p.userId ?? "", ct);
        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("createGroupBranch")]
    [HttpPost("createGroupBranch")]
    public async Task<IActionResult> CreateGroupBranch(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiCreateGroupBranchResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var parentChatId = p.parentChatId ?? p.chatId ?? "";
        var (response, notifies) = await _botApi.CreateGroupBranchAsync(
            botUser, parentChatId, p.name ?? "", p.slug, ct);

        if (response.success)
        {
            foreach (var (uid, notify) in notifies)
                await _realtime.SendToUserAsync(uid, notify, ct);
            if (Guid.TryParse(parentChatId, out var pg))
                await BroadcastGroupUpdatedAsync(pg, ct);
        }

        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("updateGroupBranch")]
    [HttpPost("updateGroupBranch")]
    public async Task<IActionResult> UpdateGroupBranch(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiUpdateGroupResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var branchChatId = p.branchChatId ?? p.chatId ?? "";
        var (response, systemEvent) = await _botApi.UpdateGroupBranchAsync(
            botUser, branchChatId, p.name, p.description, ct);

        if (response.success && Guid.TryParse(branchChatId, out var branchGuid))
        {
            if (systemEvent != null)
                await BroadcastChatMessageAsync(branchGuid, systemEvent, ct);
            var store = HttpContext.RequestServices.GetRequiredService<Core.Abstractions.IDataStore>();
            var chat = await store.GetChatByIdAsync(branchGuid, ct);
            if (chat?.ParentChatId is Guid parentId)
                await BroadcastGroupUpdatedAsync(parentId, ct);
        }

        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("deleteGroupBranch")]
    [HttpPost("deleteGroupBranch")]
    public async Task<IActionResult> DeleteGroupBranch(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSimpleResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var branchChatId = p.branchChatId ?? p.chatId ?? "";
        var (response, _) = await _botApi.DeleteGroupBranchAsync(botUser, branchChatId, ct);
        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("reorderGroupBranches")]
    [HttpPost("reorderGroupBranches")]
    public async Task<IActionResult> ReorderGroupBranches(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSimpleResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var response = await _botApi.ReorderGroupBranchesAsync(
            botUser, p.parentChatId ?? p.chatId ?? "", p.branchIds ?? [], ct);
        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("updateChannel")]
    [HttpPost("updateChannel")]
    public async Task<IActionResult> UpdateChannel(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiUpdateChannelResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var (response, updated) = await _botApi.UpdateChannelAsync(
            botUser, p.chatId ?? "", p.name, p.description, ct);

        if (response.success && updated != null && Guid.TryParse(p.chatId, out var chatGuid))
            await BroadcastChannelUpdatedAsync(chatGuid, updated, ct);

        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpPost("setChannelAvatar")]
    [RequestSizeLimit(MaxAvatarBytes)]
    public async Task<IActionResult> SetChannelAvatar(IFormFile? photo, CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiUpdateChannelResponse { success = false, error = "Unauthorized" });
        if (photo == null || photo.Length == 0)
            return BadRequest(new BotApiUpdateChannelResponse { success = false, error = "Файл не выбран" });
        if (photo.Length > MaxAvatarBytes)
            return BadRequest(new BotApiUpdateChannelResponse { success = false, error = "Размер файла не должен превышать 512 КБ" });
        if (!photo.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new BotApiUpdateChannelResponse { success = false, error = "Допустимы только изображения" });
        if (!Guid.TryParse(p.chatId, out var chatGuid))
            return BadRequest(new BotApiUpdateChannelResponse { success = false, error = "Некорректный chatId" });

        var path = Path.Combine(_avatarsRoot, chatGuid + ".jpg");
        await using (var fs = System.IO.File.Create(path))
            await photo.CopyToAsync(fs, ct);
        if (new FileInfo(path).Length > MaxAvatarBytes)
        {
            System.IO.File.Delete(path);
            return BadRequest(new BotApiUpdateChannelResponse { success = false, error = "Размер файла не должен превышать 512 КБ" });
        }

        var (botUser, _) = auth.Value;
        var (response, updated) = await _botApi.SaveChannelAvatarAsync(botUser, p.chatId!, path, ct);
        if (!response.success)
        {
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
            return BadRequest(response);
        }

        if (updated != null)
            await BroadcastChannelUpdatedAsync(chatGuid, updated, ct);
        return Ok(response);
    }

    [HttpGet("removeChannelMember")]
    [HttpPost("removeChannelMember")]
    public async Task<IActionResult> RemoveChannelMember(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSimpleResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var response = await _botApi.RemoveChannelMemberAsync(
            botUser, p.chatId ?? "", p.memberUserId ?? p.userId ?? "", ct);
        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("setChannelMemberRole")]
    [HttpPost("setChannelMemberRole")]
    public async Task<IActionResult> SetChannelMemberRole(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiSimpleResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var response = await _botApi.SetChannelMemberRoleAsync(
            botUser, p.chatId ?? "", p.memberUserId ?? p.userId ?? "", p.role ?? "", ct);
        return response.success ? Ok(response) : BadRequest(response);
    }

    [HttpGet("getChannelSubscribers")]
    [HttpPost("getChannelSubscribers")]
    public async Task<IActionResult> GetChannelSubscribers(CancellationToken ct)
    {
        var p = await ReadParamsAsync(ct);
        var auth = await AuthenticateParamsAsync(p, ct);
        if (auth == null)
            return Unauthorized(new BotApiGetChannelSubscribersResponse { success = false, error = "Unauthorized" });

        var (botUser, _) = auth.Value;
        var page = ParseInt(p.page, 1);
        var pageSize = ParseInt(p.pageSize, 50);
        var response = await _botApi.GetChannelSubscribersAsync(
            botUser, p.chatId ?? "", page, pageSize, p.query, ct);
        return response.success ? Ok(response) : BadRequest(response);
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
            messageId = Request.Query["messageId"].ToString(),
            activityType = Request.Query["activityType"].ToString(),
            active = Request.Query["active"].ToString(),
            activityMessage = Request.Query["activityMessage"].ToString(),
            deleteForEveryone = Request.Query["deleteForEveryone"].ToString(),
            name = Request.Query["name"].ToString(),
            description = Request.Query["description"].ToString(),
            allowJoinByLink = Request.Query["allowJoinByLink"].ToString(),
            memberUserId = Request.Query["memberUserId"].ToString(),
            userId = Request.Query["userId"].ToString(),
            parentChatId = Request.Query["parentChatId"].ToString(),
            branchChatId = Request.Query["branchChatId"].ToString(),
            slug = Request.Query["slug"].ToString(),
            role = Request.Query["role"].ToString(),
            page = Request.Query["page"].ToString(),
            pageSize = Request.Query["pageSize"].ToString(),
            query = Request.Query["query"].ToString(),
            caption = Request.Query["caption"].ToString(),
            photoFileId = Request.Query["photoFileId"].ToString(),
            documentFileId = Request.Query["documentFileId"].ToString(),
            fileId = Request.Query["fileId"].ToString(),
            sessionId = Request.Query["sessionId"].ToString(),
            sessionToken = Request.Query["sessionToken"].ToString(),
            miniAppMessageId = Request.Query["miniAppMessageId"].ToString(),
            invisible = Request.Query["invisible"].ToString(),
            targetUserLogin = Request.Query["targetUserLogin"].ToString(),
        };
        result.photoFileIds = ParseQueryStringList(Request.Query["photoFileIds"]);
        result.attachmentFileIds = ParseQueryStringList(Request.Query["attachmentFileIds"]);

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
            result.messageId = FirstNonEmpty(result.messageId, GetString(root, "messageId"));
            result.activityType = FirstNonEmpty(result.activityType, GetString(root, "activityType"));
            result.active = FirstNonEmpty(result.active, GetBoolString(root, "active"));
            result.activityMessage = FirstNonEmpty(result.activityMessage, GetString(root, "activityMessage"));
            result.deleteForEveryone = FirstNonEmpty(result.deleteForEveryone, GetBoolString(root, "deleteForEveryone"));
            result.name = FirstNonEmpty(result.name, GetString(root, "name"));
            result.description = FirstNonEmpty(result.description, GetString(root, "description"));
            result.allowJoinByLink = FirstNonEmpty(result.allowJoinByLink, GetBoolString(root, "allowJoinByLink"));
            result.memberUserId = FirstNonEmpty(result.memberUserId, GetString(root, "memberUserId"));
            result.userId = FirstNonEmpty(result.userId, GetString(root, "userId"));
            result.parentChatId = FirstNonEmpty(result.parentChatId, GetString(root, "parentChatId"));
            result.branchChatId = FirstNonEmpty(result.branchChatId, GetString(root, "branchChatId"));
            result.slug = FirstNonEmpty(result.slug, GetString(root, "slug"));
            result.role = FirstNonEmpty(result.role, GetString(root, "role"));
            result.page = FirstNonEmpty(result.page, GetString(root, "page"));
            result.pageSize = FirstNonEmpty(result.pageSize, GetString(root, "pageSize"));
            result.query = FirstNonEmpty(result.query, GetString(root, "query"));
            result.caption = FirstNonEmpty(result.caption, GetString(root, "caption"));
            result.photoFileId = FirstNonEmpty(result.photoFileId, GetString(root, "photoFileId"));
            result.documentFileId = FirstNonEmpty(result.documentFileId, GetString(root, "documentFileId"));
            result.fileId = FirstNonEmpty(result.fileId, GetString(root, "fileId"));
            result.sessionId = FirstNonEmpty(result.sessionId, GetString(root, "sessionId"));
            result.sessionToken = FirstNonEmpty(result.sessionToken, GetString(root, "sessionToken"));
            result.miniAppMessageId = FirstNonEmpty(result.miniAppMessageId, GetString(root, "miniAppMessageId"));
            result.invisible = FirstNonEmpty(result.invisible, GetBoolString(root, "invisible"));
            result.targetUserLogin = FirstNonEmpty(result.targetUserLogin, GetString(root, "targetUserLogin"));
            result.payload = root.TryGetProperty("payload", out var payloadEl)
                ? JsonSerializer.Deserialize<object>(payloadEl.GetRawText(), MenuJsonOptions)
                : result.payload;
            result.branchIds = ParseStringList(root, "branchIds");
            result.photoFileIds = FirstNonEmptyList(result.photoFileIds, ParseStringList(root, "photoFileIds"));
            result.attachmentFileIds = FirstNonEmptyList(result.attachmentFileIds, ParseStringList(root, "attachmentFileIds"));
            result.menu = ParseMenu(root);
            result.assistantMenu = ParseAssistantMenu(root);
            result.groupMenu = ParseGroupMenu(root);
            result.buttons = ParseButtons(root);
            result.miniApp = ParseMiniApp(root);
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

    static bool ParseBool(string? raw, bool fallback)
    {
        if (string.IsNullOrWhiteSpace(raw)) return fallback;
        return raw.Trim().ToLowerInvariant() switch
        {
            "1" or "true" or "yes" => true,
            "0" or "false" or "no" => false,
            _ => fallback,
        };
    }

    static string? GetBoolString(JsonElement el, string name)
    {
        if (!el.TryGetProperty(name, out var prop)) return null;
        return prop.ValueKind switch
        {
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.String => prop.GetString(),
            _ => null,
        };
    }

    static bool? ParseNullableBool(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return raw.Trim().ToLowerInvariant() switch
        {
            "1" or "true" or "yes" => true,
            "0" or "false" or "no" => false,
            _ => null,
        };
    }

    static List<string>? ParseStringList(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var prop) || prop.ValueKind != JsonValueKind.Array)
            return null;
        return prop.EnumerateArray()
            .Where(el => el.ValueKind == JsonValueKind.String)
            .Select(el => el.GetString() ?? "")
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToList();
    }

    static List<string>? ParseQueryStringList(Microsoft.Extensions.Primitives.StringValues values)
    {
        if (values.Count == 0) return null;
        var result = new List<string>();
        foreach (var raw in values)
        {
            if (string.IsNullOrWhiteSpace(raw)) continue;
            foreach (var part in raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (!string.IsNullOrWhiteSpace(part))
                    result.Add(part);
            }
        }
        return result.Count > 0 ? result : null;
    }

    static List<string>? FirstNonEmptyList(List<string>? current, List<string>? next) =>
        current is { Count: > 0 } ? current : next is { Count: > 0 } ? next : current ?? next;

    async Task BroadcastGroupUpdatedAsync(Guid chatId, CancellationToken ct)
    {
        var payload = await _messenger.GetGroupUpdatedPayloadAsync(chatId, ct);
        if (payload == null) return;
        var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);
        foreach (var uid in participants)
            await _realtime.SendToUserAsync(uid, payload, ct);
    }

    async Task BroadcastChannelUpdatedAsync(Guid chatId, SupraWsChannelUpdatedPayload payload, CancellationToken ct)
    {
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

    async Task BroadcastBotUpdatedAsync(SupraWsBotUpdatedPayload payload, CancellationToken ct)
    {
        if (!Guid.TryParse(payload.botUserId, out var botUserId)) return;

        if (!string.IsNullOrWhiteSpace(payload.chatId) &&
            Guid.TryParse(payload.chatId, out var chatGuid))
        {
            var participants = await GetAllChatParticipantIdsAsync(chatGuid, ct);
            foreach (var uid in participants.Where(id => id != botUserId))
                await _realtime.SendToUserAsync(uid, payload, ct);
            return;
        }

        var store = HttpContext.RequestServices.GetRequiredService<Core.Abstractions.IDataStore>();
        var bot = await store.GetBotByUserIdAsync(botUserId, ct);
        if (bot == null) return;
        await _realtime.SendToUserAsync(bot.OwnerUserId, payload, ct);
        var allChats = await store.GetChatsAsync(ct);
        var allParts = await store.GetAllParticipantsAsync(ct);
        foreach (var chat in allChats.Where(c =>
                     string.Equals(c.Type, "direct", StringComparison.OrdinalIgnoreCase)))
        {
            var parts = allParts.Where(p => p.ChatId == chat.Id).ToList();
            if (!parts.Any(p => p.UserId == botUserId)) continue;
            foreach (var p in parts.Where(p => p.UserId != botUserId))
                await _realtime.SendToUserAsync(p.UserId, payload, ct);
        }
    }

    async Task BroadcastBotAssistantUpdatedAsync(SupraWsBotAssistantUpdatedPayload payload, CancellationToken ct)
    {
        if (!Guid.TryParse(payload.botUserId, out var botUserId)) return;

        var store = HttpContext.RequestServices.GetRequiredService<Core.Abstractions.IDataStore>();
        var bot = await store.GetBotByUserIdAsync(botUserId, ct);
        if (bot == null) return;

        await _realtime.SendToUserAsync(bot.OwnerUserId, payload, ct);

        if (!string.IsNullOrWhiteSpace(payload.chatId) &&
            Guid.TryParse(payload.chatId, out var chatGuid))
        {
            var participants = await GetAllChatParticipantIdsAsync(chatGuid, ct);
            foreach (var uid in participants.Where(id => id != botUserId))
                await _realtime.SendToUserAsync(uid, payload, ct);
            return;
        }

        var allAssistants = await store.GetUsersAsync(ct);
        foreach (var user in allAssistants.Where(u => u.IsActive && u.Type != UserType.Bot))
        {
            if (await store.HasUserBotAssistantAsync(user.Id, botUserId, ct))
                await _realtime.SendToUserAsync(user.Id, payload, ct);
        }
    }

    async Task BroadcastBotGroupUpdatedAsync(SupraWsBotGroupUpdatedPayload payload, CancellationToken ct)
    {
        if (!Guid.TryParse(payload.botUserId, out var botUserId)) return;

        var store = HttpContext.RequestServices.GetRequiredService<Core.Abstractions.IDataStore>();
        var bot = await store.GetBotByUserIdAsync(botUserId, ct);
        if (bot == null) return;

        await _realtime.SendToUserAsync(bot.OwnerUserId, payload, ct);

        if (!string.IsNullOrWhiteSpace(payload.chatId) &&
            Guid.TryParse(payload.chatId, out var chatGuid))
        {
            var participants = await GetAllChatParticipantIdsAsync(chatGuid, ct);
            foreach (var uid in participants.Where(id => id != botUserId))
                await _realtime.SendToUserAsync(uid, payload, ct);

            var chat = await store.GetChatByIdAsync(chatGuid, ct);
            if (chat != null && SupraMessengerService.IsRootGroupChat(chat))
            {
                var branches = await store.GetGroupBranchesByParentAsync(chatGuid, ct);
                foreach (var branch in branches)
                {
                    var branchParticipants = await GetAllChatParticipantIdsAsync(branch.Id, ct);
                    foreach (var uid in branchParticipants.Where(id => id != botUserId))
                        await _realtime.SendToUserAsync(uid, payload, ct);
                }
            }
            return;
        }

        var allChats = await store.GetChatsAsync(ct);
        var allParts = await store.GetAllParticipantsAsync(ct);
        foreach (var chat in allChats.Where(c => SupraMessengerService.IsGroupChat(c)))
        {
            var parts = allParts.Where(p => p.ChatId == chat.Id).ToList();
            var botPart = parts.FirstOrDefault(p => p.UserId == botUserId && p.IsAdmin);
            if (botPart == null) continue;
            foreach (var p in parts.Where(p => p.UserId != botUserId))
                await _realtime.SendToUserAsync(p.UserId, payload, ct);
        }
    }

    static BotApiMenuDto? ParseAssistantMenu(JsonElement root)
    {
        if (root.TryGetProperty("assistantMenu", out var menuEl))
            return DeserializeMenu(menuEl);
        return null;
    }

    static BotApiMenuDto? ParseGroupMenu(JsonElement root)
    {
        if (root.TryGetProperty("groupMenu", out var menuEl))
            return DeserializeMenu(menuEl);
        return null;
    }

    static BotApiMenuDto? ParseMenu(JsonElement root)
    {
        if (root.TryGetProperty("menu", out var menuEl))
            return DeserializeMenu(menuEl);
        if (root.TryGetProperty("items", out _))
            return DeserializeMenu(root);
        return null;
    }

    static List<BotMessageButtonDto>? ParseButtons(JsonElement root)
    {
        if (!root.TryGetProperty("buttons", out var buttonsEl) || buttonsEl.ValueKind != JsonValueKind.Array)
            return null;

        try
        {
            return JsonSerializer.Deserialize<List<BotMessageButtonDto>>(buttonsEl.GetRawText(), MenuJsonOptions);
        }
        catch
        {
            return null;
        }
    }

    static BotApiMenuDto? DeserializeMenu(JsonElement el)
    {
        try
        {
            return JsonSerializer.Deserialize<BotApiMenuDto>(el.GetRawText(), MenuJsonOptions);
        }
        catch
        {
            return null;
        }
    }

    static BotMiniAppManifestDto? ParseMiniApp(JsonElement root)
    {
        if (root.TryGetProperty("miniApp", out var miniEl))
        {
            try
            {
                return JsonSerializer.Deserialize<BotMiniAppManifestDto>(miniEl.GetRawText(), MenuJsonOptions);
            }
            catch
            {
                return null;
            }
        }

        var title = GetString(root, "title") ?? GetString(root, "text");
        var entry = GetString(root, "entry");
        if (string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(entry))
            return null;

        List<BotMiniAppFileDto>? files = null;
        if (root.TryGetProperty("files", out var filesEl) && filesEl.ValueKind == JsonValueKind.Array)
        {
            try
            {
                files = JsonSerializer.Deserialize<List<BotMiniAppFileDto>>(filesEl.GetRawText(), MenuJsonOptions);
            }
            catch
            {
                files = null;
            }
        }

        object? initData = null;
        if (root.TryGetProperty("initData", out var initEl))
            initData = JsonSerializer.Deserialize<object>(initEl.GetRawText(), MenuJsonOptions);

        return new BotMiniAppManifestDto
        {
            title = title ?? "",
            entry = entry ?? "index.html",
            files = files ?? [],
            initData = initData,
            autoOpen = ParseBool(GetBoolString(root, "autoOpen"), false),
            reusable = ParseBool(GetBoolString(root, "reusable"), true),
            baseOrigin = GetString(root, "baseOrigin"),
        };
    }

    static BotMiniAppManifestDto? BuildMiniAppManifest(BotApiRequestParams p) => p.miniApp;

    static readonly JsonSerializerOptions MenuJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    async Task<IReadOnlyList<Guid>> GetChatParticipantIdsAsync(Guid chatId, CancellationToken ct)
    {
        var store = HttpContext.RequestServices.GetRequiredService<Core.Abstractions.IDataStore>();
        var parts = await store.GetParticipantsByChatAsync(chatId, ct);
        return parts.Select(p => p.UserId).ToList();
    }

    async Task<IReadOnlyList<Guid>> GetAllChatParticipantIdsAsync(Guid chatId, CancellationToken ct)
    {
        var store = HttpContext.RequestServices.GetRequiredService<Core.Abstractions.IDataStore>();
        var parts = await store.GetParticipantsByChatAsync(chatId, ct);
        return parts.Select(p => p.UserId).Distinct().ToList();
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
        public string? messageId { get; set; }
        public string? activityType { get; set; }
        public string? active { get; set; }
        public string? activityMessage { get; set; }
        public string? deleteForEveryone { get; set; }
        public string? name { get; set; }
        public string? description { get; set; }
        public string? allowJoinByLink { get; set; }
        public string? memberUserId { get; set; }
        public string? userId { get; set; }
        public string? parentChatId { get; set; }
        public string? branchChatId { get; set; }
        public string? slug { get; set; }
        public string? role { get; set; }
        public string? page { get; set; }
        public string? pageSize { get; set; }
        public string? query { get; set; }
        public List<string>? branchIds { get; set; }
        public BotApiMenuDto? menu { get; set; }
        public List<BotMessageButtonDto>? buttons { get; set; }
        public string? caption { get; set; }
        public string? photoFileId { get; set; }
        public List<string>? photoFileIds { get; set; }
        public string? documentFileId { get; set; }
        public List<string>? attachmentFileIds { get; set; }
        public string? fileId { get; set; }
        public string? sessionId { get; set; }
        public string? sessionToken { get; set; }
        public string? miniAppMessageId { get; set; }
        public string? invisible { get; set; }
        public string? targetUserLogin { get; set; }
        public object? payload { get; set; }
        public BotApiMenuDto? assistantMenu { get; set; }
        public BotApiMenuDto? groupMenu { get; set; }
        public BotMiniAppManifestDto? miniApp { get; set; }
    }
}
