using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Security;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/register")]
[AllowAnonymous]
public sealed class RegisterController : ControllerBase
{
    private readonly IDataStore _store;
    private readonly SupraMessengerService _messenger;
    private readonly RealtimeNotifier _realtime;
    private readonly UserInvitationService _invitations;
    private readonly string _avatarsRoot;

    public RegisterController(
        IDataStore store,
        SupraMessengerService messenger,
        RealtimeNotifier realtime,
        UserInvitationService invitations,
        IConfiguration config)
    {
        _store = store;
        _messenger = messenger;
        _realtime = realtime;
        _invitations = invitations;
        var dataRoot = config["Data:Root"] ?? "data";
        _avatarsRoot = Path.Combine(dataRoot, "avatars");
        Directory.CreateDirectory(_avatarsRoot);
    }

    [HttpGet("{token}")]
    public async Task<IActionResult> ValidateToken(string token, CancellationToken ct)
    {
        await _invitations.CleanupExpiredAsync(ct);
        var inv = await _store.GetInvitationByTokenAsync(token, ct);
        if (inv == null || inv.IsUsed)
            return Ok(new { valid = false, error = "Приглашение недействительно или уже использовано" });
        if (!_invitations.IsActive(inv))
            return Ok(new { valid = false, error = "Срок действия приглашения истёк" });
        return Ok(new { valid = true });
    }

    [HttpPost("{token}")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Register(
        string token,
        [FromForm] string login,
        [FromForm] string displayName,
        [FromForm] string password,
        [FromForm] string? email,
        [FromForm] string? phone,
        IFormFile? photo,
        CancellationToken ct)
    {
        await _invitations.CleanupExpiredAsync(ct);
        var inv = await _store.GetInvitationByTokenAsync(token, ct);
        if (inv == null || inv.IsUsed)
            return BadRequest(new { error = "Приглашение недействительно или уже использовано" });
        if (!_invitations.IsActive(inv))
            return BadRequest(new { error = "Срок действия приглашения истёк" });

        login = login?.Trim() ?? "";
        if (login.Length < 4)
            return BadRequest(new { error = "Логин должен быть не короче 4 символов" });
        if (string.IsNullOrWhiteSpace(password) || password.Length < 6)
            return BadRequest(new { error = "Пароль должен быть не короче 6 символов" });
        if (await _store.IsLoginTakenAsync(login, ct: ct))
            return BadRequest(new { error = "Логин уже занят" });

        var userId = Guid.NewGuid();
        string? avatarPath = null;
        if (photo != null && photo.Length > 0)
        {
            var (valid, error) = await AvatarUploadValidator.ValidateUploadAsync(photo, ct);
            if (!valid)
                return BadRequest(new { error = error });

            var ext = Path.GetExtension(photo.FileName);
            if (string.IsNullOrEmpty(ext)) ext = ".jpg";
            avatarPath = Path.Combine(_avatarsRoot, userId + ext);
            await using var fs = System.IO.File.Create(avatarPath);
            await photo.CopyToAsync(fs, ct);
        }

        var user = new UserRecord
        {
            Id = userId,
            Login = login,
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? login : displayName.Trim(),
            Email = email,
            Phone = phone,
            PasswordHash = PasswordHasher.Hash(password),
            Type = UserType.User,
            AvatarPath = avatarPath,
            IsActive = true,
            SearchableByLogin = true,
            AllowWrite = "everyone",
            MasterPasswordMatchesLogin = true,
        };
        await _store.SaveUserAsync(user, ct);

        if (inv.IsUserInvite)
        {
            var inviter = await _store.GetUserByIdAsync(inv.CreatedByUserId, ct);
            if (inviter != null && inviter.IsActive && inviter.Id != userId)
            {
                var notify = await _messenger.EnsureDirectChatAfterRegistrationAsync(user, inviter, ct);
                if (notify != null)
                    await _realtime.SendToUserAsync(inviter.Id, notify, ct);
            }
        }

        await _store.DeleteInvitationAsync(inv.Id, ct);

        await AuthController.SignInUserAsync(HttpContext, user);
        return Ok(new { success = true, redirect = "/" });
    }
}
