using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Infrastructure.Services;

namespace SuperMessenger.Web.Controllers;

/// <summary>
/// Anonymous, read-only previews for deep links (/@login, /@group-guid) so that
/// unauthenticated visitors can see who/what a link points to before signing in.
/// User data is only exposed when the user opted into login search.
/// Group data is only exposed when the group allows joining by link.
/// </summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public sealed class PublicPreviewController : ControllerBase
{
    private readonly IDataStore _store;
    private readonly SupraMessengerService _messenger;

    public PublicPreviewController(IDataStore store, SupraMessengerService messenger)
    {
        _store = store;
        _messenger = messenger;
    }

    [HttpGet("profile/{login}")]
    public async Task<IActionResult> GetProfile(string login, CancellationToken ct)
    {
        var loginNorm = (login ?? string.Empty).Trim();
        if (loginNorm.Length < 4) return Ok(new { found = false });

        var user = await _store.GetUserByLoginAsync(loginNorm, ct);
        if (user == null || !user.IsActive || !user.SearchableByLogin)
            return Ok(new { found = false });

        var loginChanged = !string.Equals(loginNorm, user.Login, StringComparison.OrdinalIgnoreCase);

        return Ok(new
        {
            found = true,
            type = "user",
            id = user.Id.ToString(),
            login = user.Login,
            displayName = user.DisplayName,
            avatar = AvatarUrlHelper.ForUser(user),
            statusText = user.StatusText ?? "",
            aboutText = user.AboutText ?? "",
            loginChanged,
            previousLogin = loginChanged ? loginNorm : null,
        });
    }

    [HttpGet("group/{chatId:guid}")]
    public async Task<IActionResult> GetGroup(Guid chatId, CancellationToken ct)
    {
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        var isGroup = chat != null && (
            string.Equals(chat.Type, "group", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(chat.Type, "public_group", StringComparison.OrdinalIgnoreCase));
        if (chat == null || !isGroup || !chat.AllowJoinByLink)
            return Ok(new { found = false });

        var members = await _store.GetParticipantsByChatAsync(chatId, ct);

        return Ok(new
        {
            found = true,
            type = "group",
            chatId = chat.Id.ToString(),
            name = chat.Name,
            avatar = string.IsNullOrEmpty(chat.AvatarPath) ? null : $"/api/files/group-avatar-public/{chat.Id}",
            memberCount = members.Count(),
            canJoin = true,
        });
    }

    [HttpGet("channel/{slug}")]
    public async Task<IActionResult> GetChannel(string slug, CancellationToken ct)
    {
        var chat = await _store.GetChannelBySlugAsync(slug, ct);
        if (chat == null)
            return Ok(new { found = false });

        var members = await _store.GetParticipantsByChatAsync(chat.Id, ct);

        return Ok(new
        {
            found = true,
            type = "channel",
            chatId = chat.Id.ToString(),
            name = chat.Name,
            slug = chat.Slug,
            description = chat.Description ?? "",
            avatar = string.IsNullOrEmpty(chat.AvatarPath) ? null : $"/api/files/group-avatar-public/{chat.Id}",
            subscriberCount = members.Count,
        });
    }

    [HttpGet("channel/{slug}/messages")]
    public async Task<IActionResult> GetChannelMessages(string slug, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var chat = await _store.GetChannelBySlugAsync(slug, ct);
        if (chat == null)
            return Ok(new { found = false, messages = Array.Empty<object>() });

        var messages = await _messenger.GetPublicChannelMessagesAsync(slug, limit, ct);
        return Ok(new
        {
            found = true,
            chatId = chat.Id.ToString(),
            name = chat.Name,
            slug = chat.Slug,
            description = chat.Description ?? "",
            avatar = string.IsNullOrEmpty(chat.AvatarPath) ? null : $"/api/files/group-avatar-public/{chat.Id}",
            messages,
        });
    }

    [HttpGet("channel/{slug}/messages/around")]
    public async Task<IActionResult> GetChannelMessagesAround(
        string slug,
        [FromQuery] string messageId,
        [FromQuery] int before = 25,
        [FromQuery] int after = 25,
        CancellationToken ct = default)
    {
        var result = await _messenger.GetPublicChannelMessagesAroundAsync(slug, messageId, before, after, ct);
        if (result == null)
            return Ok(new { found = false, messages = Array.Empty<object>() });
        return Ok(result);
    }
}
