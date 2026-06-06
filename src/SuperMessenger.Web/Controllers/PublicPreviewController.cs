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

    public PublicPreviewController(IDataStore store)
    {
        _store = store;
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
}
