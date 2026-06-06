using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Infrastructure.Security;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public sealed class ProfileController : ControllerBase
{
    public const int MaxStatusTextLength = 20;
    public const int MaxAboutTextLength = 140;

    private readonly IDataStore _store;
    private readonly CurrentUserAccessor _current;
    private readonly UserInvitationService _invitations;
    private readonly SupraMessengerService _messenger;
    private readonly RealtimeNotifier _realtime;
    private readonly UserLoginChangeService _loginChanges;
    private readonly IConfiguration _config;
    private readonly string _avatarsRoot;

    public ProfileController(
        IDataStore store,
        CurrentUserAccessor current,
        UserInvitationService invitations,
        SupraMessengerService messenger,
        RealtimeNotifier realtime,
        UserLoginChangeService loginChanges,
        IConfiguration config)
    {
        _store = store;
        _current = current;
        _invitations = invitations;
        _messenger = messenger;
        _realtime = realtime;
        _loginChanges = loginChanges;
        _config = config;
        var dataRoot = config["Data:Root"] ?? "data";
        _avatarsRoot = Path.Combine(dataRoot, "avatars");
        Directory.CreateDirectory(_avatarsRoot);
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        return Ok(new
        {
            id = user.Id,
            user.Login,
            displayName = user.DisplayName,
            user.Email,
            user.Phone,
            avatar = AvatarUrlHelper.ForUser(user),
            searchableByLogin = user.SearchableByLogin,
            searchableByName = user.SearchableByName,
            statusText = user.StatusText ?? "",
            aboutText = user.AboutText ?? "",
            allowInvite = string.IsNullOrEmpty(user.AllowInvite) ? "everyone" : user.AllowInvite,
            showOnlineStatus = string.IsNullOrEmpty(user.ShowOnlineStatus) ? "everyone" : user.ShowOnlineStatus,
            allowWrite = string.IsNullOrEmpty(user.AllowWrite) ? "everyone" : user.AllowWrite,
            encryptionConfigured = !string.IsNullOrEmpty(user.EncryptionSalt)
                && !string.IsNullOrEmpty(user.EncryptionVerifier)
                && !string.IsNullOrEmpty(user.EncryptionPublicKey),
            encryptionSalt = user.EncryptionSalt,
            encryptionVerifier = user.EncryptionVerifier,
            masterPasswordMatchesLogin = user.MasterPasswordMatchesLogin,
            canChangeLogin = UserLoginChangeService.CanChangeLogin(user),
            lastLoginChangedAt = user.LastLoginChangedAt,
            nextLoginChangeAt = UserLoginChangeService.GetNextLoginChangeAt(user),
        });
    }

    [HttpPost("master-password-link")]
    public async Task<IActionResult> SetMasterPasswordLink(
        [FromBody] MasterPasswordLinkRequest req,
        CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        user.MasterPasswordMatchesLogin = req.MatchesLogin;
        await _store.SaveUserAsync(user, ct);
        return Ok(new { success = true, masterPasswordMatchesLogin = user.MasterPasswordMatchesLogin });
    }

    [HttpGet("by-login/{login}")]
    public async Task<IActionResult> GetByLogin(string login, CancellationToken ct)
    {
        var me = await _current.GetCurrentUserAsync(ct);
        if (me == null) return Unauthorized();
        var loginNorm = login.Trim();
        if (loginNorm.Length < 4) return NotFound();
        var user = await _store.GetUserByLoginAsync(loginNorm, ct);
        if (user == null || !user.IsActive) return NotFound();
        var viaAlias = !string.Equals(loginNorm, user.Login, StringComparison.OrdinalIgnoreCase);
        return await BuildPublicProfileAsync(me, user, ct, viaAlias ? loginNorm : null);
    }

    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetContact(Guid userId, CancellationToken ct)
    {
        var me = await _current.GetCurrentUserAsync(ct);
        if (me == null) return Unauthorized();
        var user = await _store.GetUserByIdAsync(userId, ct);
        if (user == null || !user.IsActive) return NotFound();
        return await BuildPublicProfileAsync(me, user, ct);
    }

    [HttpPost("change-login")]
    public async Task<IActionResult> ChangeLogin(
        [FromBody] ChangeLoginRequest req,
        CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();

        var (success, error, oldLogin) = await _loginChanges.TryChangeLoginAsync(user, req.Login ?? "", skipRateLimit: false, ct);
        if (!success)
            return BadRequest(new { error });

        await AuthController.SignInUserAsync(HttpContext, user);
        return Ok(new
        {
            success = true,
            login = user.Login,
            previousLogin = oldLogin,
            canChangeLogin = UserLoginChangeService.CanChangeLogin(user),
            lastLoginChangedAt = user.LastLoginChangedAt,
            nextLoginChangeAt = UserLoginChangeService.GetNextLoginChangeAt(user),
        });
    }

    async Task<IActionResult> BuildPublicProfileAsync(
        Core.Entities.UserRecord me, Core.Entities.UserRecord user, CancellationToken ct, string? resolvedViaLogin = null)
    {
        var presence = HttpContext.RequestServices.GetRequiredService<UserPresenceService>();
        var messenger = HttpContext.RequestServices.GetRequiredService<SupraMessengerService>();
        var canSeeOnline = await messenger.CanSeeOnlineStatusAsync(me.Id, user.Id, ct);
        string? onlineStatus = null;
        if (canSeeOnline)
            onlineStatus = presence.GetStatus(user.Id);
        var canWrite = await messenger.CanWriteAsync(me.Id, user.Id, ct);

        var loginChanged = !string.IsNullOrEmpty(resolvedViaLogin)
            && !string.Equals(resolvedViaLogin, user.Login, StringComparison.OrdinalIgnoreCase);

        return Ok(new
        {
            id = user.Id.ToString(),
            login = user.Login,
            displayName = user.DisplayName,
            avatar = AvatarUrlHelper.ForUser(user),
            statusText = user.StatusText ?? "",
            aboutText = user.AboutText ?? "",
            lastSeenAt = user.LastSeenAt,
            onlineStatus,
            canWrite,
            loginChanged,
            previousLogin = loginChanged ? resolvedViaLogin : null,
        });
    }

    [HttpPut("privacy")]
    public async Task<IActionResult> UpdatePrivacy(
        [FromBody] PrivacySettingsRequest req,
        CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();

        user.SearchableByLogin = req.SearchableByLogin;
        user.SearchableByName = req.SearchableByName;
        user.AllowInvite = req.AllowInvite ?? "everyone";
        user.ShowOnlineStatus = req.ShowOnlineStatus ?? "everyone";
        user.AllowWrite = req.AllowWrite ?? "everyone";
        await _store.SaveUserAsync(user, ct);
        return Ok(new { success = true });
    }

    [HttpPut]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Update(
        [FromForm] string? displayName,
        [FromForm] string? email,
        [FromForm] string? phone,
        [FromForm] string? statusText,
        [FromForm] string? aboutText,
        IFormFile? photo,
        CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();

        if (!string.IsNullOrWhiteSpace(displayName))
            user.DisplayName = displayName.Trim();
        if (email != null) user.Email = email;
        if (phone != null) user.Phone = phone;
        if (Request.HasFormContentType && Request.Form.ContainsKey("statusText"))
        {
            var nextStatus = (statusText ?? string.Empty).Trim();
            user.StatusText = nextStatus.Length > MaxStatusTextLength
                ? nextStatus[..MaxStatusTextLength]
                : nextStatus;
        }
        if (Request.HasFormContentType && Request.Form.ContainsKey("aboutText"))
        {
            var nextAbout = (aboutText ?? string.Empty).Trim();
            user.AboutText = nextAbout.Length > MaxAboutTextLength
                ? nextAbout[..MaxAboutTextLength]
                : nextAbout;
        }

        if (photo != null && photo.Length > 0)
        {
            var (valid, error) = await AvatarUploadValidator.ValidateUploadAsync(photo, ct);
            if (!valid)
                return BadRequest(new { error });

            var ext = Path.GetExtension(photo.FileName);
            if (string.IsNullOrEmpty(ext)) ext = ".jpg";
            var path = Path.Combine(_avatarsRoot, user.Id + ext);
            await using var fs = System.IO.File.Create(path);
            await photo.CopyToAsync(fs, ct);
            user.AvatarPath = path;
        }

        await _store.SaveUserAsync(user, ct);
        await BroadcastProfileUpdatedAsync(user, ct);
        return Ok(new
        {
            success = true,
            statusText = user.StatusText ?? "",
            aboutText = user.AboutText ?? "",
        });
    }

    async Task BroadcastProfileUpdatedAsync(Core.Entities.UserRecord user, CancellationToken ct)
    {
        var payload = new SupraWsProfileUpdatedPayload
        {
            userId = user.Id.ToString(),
            statusText = user.StatusText ?? "",
            aboutText = user.AboutText ?? "",
            displayName = user.DisplayName,
            avatar = AvatarUrlHelper.ForUser(user),
        };
        var recipients = new HashSet<Guid>(await _messenger.GetChatContactUserIdsAsync(user.Id, ct));
        recipients.Add(user.Id);
        foreach (var uid in recipients)
            await _realtime.SendToUserAsync(uid, payload, ct);
    }

    [HttpGet("invitations")]
    public async Task<IActionResult> ListInvitations(CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        if (user.Type == Core.Entities.UserType.Admin)
            return Ok(new { invitations = Array.Empty<object>(), activeCount = 0, maxActive = UserInvitationService.MaxActivePerUser, canCreate = false });

        var active = await _invitations.GetActiveForUserAsync(user.Id, ct);
        return Ok(new
        {
            invitations = active.Select(i => new
            {
                i.Id,
                link = InviteLinkBuilder.Build(_config, Request, i.Token),
                expiresOn = _invitations.GetExpiresOn(i),
                status = "active",
            }),
            activeCount = active.Count,
            maxActive = UserInvitationService.MaxActivePerUser,
            canCreate = active.Count < UserInvitationService.MaxActivePerUser,
        });
    }

    [HttpPost("invitations")]
    public async Task<IActionResult> CreateInvitation(CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        if (user.Type == Core.Entities.UserType.Admin)
            return BadRequest(new { error = "Администратор использует панель администрирования" });

        var activeCount = await _invitations.CountActiveForUserAsync(user.Id, ct);
        if (activeCount >= UserInvitationService.MaxActivePerUser)
            return BadRequest(new { error = $"Не более {UserInvitationService.MaxActivePerUser} активных ссылок" });

        var token = Guid.NewGuid().ToString("N");
        var now = DateTime.UtcNow;
        var inv = new Core.Entities.InvitationRecord
        {
            Id = Guid.NewGuid(),
            Token = token,
            CreatedByUserId = user.Id,
            CreatedOn = now,
            ExpiresOn = now.Add(UserInvitationService.ActiveLifetime),
            IsUserInvite = true,
        };
        await _store.SaveInvitationAsync(inv, ct);
        return Ok(new
        {
            id = inv.Id,
            link = InviteLinkBuilder.Build(_config, Request, token),
            expiresOn = inv.ExpiresOn,
            status = "active",
            activeCount = activeCount + 1,
            maxActive = UserInvitationService.MaxActivePerUser,
            canCreate = activeCount + 1 < UserInvitationService.MaxActivePerUser,
        });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest req,
        CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        if (!PasswordHasher.Verify(req.CurrentPassword ?? "", user.PasswordHash))
            return BadRequest(new { error = "Неверный текущий пароль" });
        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
            return BadRequest(new { error = "Новый пароль должен быть не короче 6 символов" });

        user.PasswordHash = PasswordHasher.Hash(req.NewPassword);
        await _store.SaveUserAsync(user, ct);
        return Ok(new { success = true });
    }
}

public sealed class ChangePasswordRequest
{
    public string? CurrentPassword { get; set; }
    public string? NewPassword { get; set; }
}

public sealed class ChangeLoginRequest
{
    public string? Login { get; set; }
}

public sealed class MasterPasswordLinkRequest
{
    public bool MatchesLogin { get; set; }
}

public sealed class PrivacySettingsRequest
{
    public bool SearchableByLogin { get; set; }
    public bool SearchableByName { get; set; }
    public string? AllowInvite { get; set; }
    public string? ShowOnlineStatus { get; set; }
    public string? AllowWrite { get; set; }
}
