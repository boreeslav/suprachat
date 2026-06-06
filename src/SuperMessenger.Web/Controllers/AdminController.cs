using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Security;

using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public sealed class AdminController : ControllerBase
{
    private readonly IDataStore _store;
    private readonly IConfiguration _config;
    private readonly AppAppearanceService _appearance;
    private readonly UserLoginChangeService _loginChanges;

    public AdminController(
        IDataStore store,
        IConfiguration config,
        AppAppearanceService appearance,
        UserLoginChangeService loginChanges)
    {
        _store = store;
        _config = config;
        _appearance = appearance;
        _loginChanges = loginChanges;
    }

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers(CancellationToken ct)
    {
        var users = await _store.GetUsersAsync(ct);
        return Ok(users.Select(u => new
        {
            u.Id,
            u.Login,
            u.DisplayName,
            u.Email,
            u.Phone,
            userType = u.Type.ToString(),
            u.IsActive,
            avatar = string.IsNullOrEmpty(u.AvatarPath) ? null : $"/api/files/avatar/{u.Id}",
        }));
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] AdminCreateUserRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Login))
            return BadRequest(new { error = "Логин обязателен" });
        if (req.Login.Trim().Length < 4)
            return BadRequest(new { error = "Логин должен быть не короче 4 символов" });
        if (await _store.IsLoginTakenAsync(req.Login.Trim(), ct: ct))
            return BadRequest(new { error = "Логин уже занят" });

        var user = new UserRecord
        {
            Id = Guid.NewGuid(),
            Login = req.Login.Trim(),
            DisplayName = req.DisplayName?.Trim() ?? req.Login.Trim(),
            Email = req.Email,
            Phone = req.Phone,
            PasswordHash = PasswordHasher.Hash(req.Password ?? Guid.NewGuid().ToString("N")),
            Type = Enum.TryParse<UserType>(req.UserType, true, out var t) ? t : UserType.User,
            IsActive = true,
        };
        await _store.SaveUserAsync(user, ct);
        return Ok(new { user.Id });
    }

    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] AdminUpdateUserRequest req, CancellationToken ct)
    {
        var user = await _store.GetUserByIdAsync(id, ct);
        if (user == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.Login) &&
            !string.Equals(req.Login, user.Login, StringComparison.OrdinalIgnoreCase))
        {
            var (ok, error, _) = await _loginChanges.TryChangeLoginAsync(user, req.Login, skipRateLimit: true, ct);
            if (!ok)
                return BadRequest(new { error });
        }
        if (req.DisplayName != null) user.DisplayName = req.DisplayName.Trim();
        if (req.Email != null) user.Email = req.Email;
        if (req.Phone != null) user.Phone = req.Phone;
        if (req.UserType != null && Enum.TryParse<UserType>(req.UserType, true, out var t))
            user.Type = t;
        if (req.IsActive.HasValue) user.IsActive = req.IsActive.Value;
        if (!string.IsNullOrWhiteSpace(req.Password))
            user.PasswordHash = PasswordHasher.Hash(req.Password);

        await _store.SaveUserAsync(user, ct);
        return Ok(new { success = true });
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        var me = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (me == id.ToString()) return BadRequest(new { error = "Нельзя удалить себя" });
        await _store.DeleteUserAsync(id, ct);
        return Ok(new { success = true });
    }

    [HttpGet("invitations")]
    public async Task<IActionResult> ListInvitations(CancellationToken ct)
    {
        var list = await _store.GetInvitationsAsync(ct);
        return Ok(list.Where(i => !i.IsUsed && !i.IsUserInvite).Select(i => new
        {
            i.Id,
            i.Token,
            i.IsUsed,
            i.UsedOn,
            i.CreatedOn,
            i.ExpiresOn,
            link = BuildInviteLink(i.Token),
        }));
    }

    [HttpDelete("invitations/{id:guid}")]
    public async Task<IActionResult> DeleteInvitation(Guid id, CancellationToken ct)
    {
        var inv = (await _store.GetInvitationsAsync(ct)).FirstOrDefault(i => i.Id == id);
        if (inv == null) return NotFound();
        await _store.DeleteInvitationAsync(id, ct);
        return Ok(new { success = true });
    }

    [HttpPost("invitations")]
    public async Task<IActionResult> CreateInvitation(CancellationToken ct)
    {
        var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(adminId, out var creatorId)) return Unauthorized();

        var token = Guid.NewGuid().ToString("N");
        var inv = new InvitationRecord
        {
            Id = Guid.NewGuid(),
            Token = token,
            CreatedByUserId = creatorId,
            CreatedOn = DateTime.UtcNow,
            IsUserInvite = false,
        };
        await _store.SaveInvitationAsync(inv, ct);
        return Ok(new { token, link = InviteLinkBuilder.Build(_config, Request, token) });
    }

    private string BuildInviteLink(string token) => InviteLinkBuilder.Build(_config, Request, token);

    [HttpGet("appearance")]
    public async Task<IActionResult> GetAppearance(CancellationToken ct)
    {
        var settings = await _appearance.GetEffectiveAsync(ct);
        return Ok(_appearance.ToPublicDto(settings));
    }

    [HttpPut("appearance")]
    public async Task<IActionResult> SaveAppearance([FromBody] AppAppearanceSaveRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.AppName))
            return BadRequest(new { error = "Название приложения обязательно" });

        var defaults = AppAppearanceDefaults.Create();
        var current = await _appearance.GetEffectiveAsync(ct);

        var themes = new List<AppThemeSettings>();
        if (req.Themes is { Count: > 0 })
        {
            foreach (var dto in req.Themes)
            {
                if (string.IsNullOrWhiteSpace(dto.Name)) continue;
                var def = defaults.Themes.FirstOrDefault(t =>
                    string.Equals(t.Name, dto.Name.Trim(), StringComparison.Ordinal))
                    ?? current.Themes.FirstOrDefault(t =>
                        string.Equals(t.Name, dto.Name.Trim(), StringComparison.Ordinal));
                themes.Add(MergeThemeDto(dto, def ?? new AppThemeSettings { Name = dto.Name.Trim() }));
            }
        }
        else
        {
            themes = current.Themes;
        }

        var settings = new AppAppearanceSettings
        {
            AppName = req.AppName.Trim(),
            AppDescription = req.AppDescription?.Trim() ?? current.AppDescription,
            AppTagline = req.AppTagline?.Trim() ?? current.AppTagline,
            RegisterWelcome = req.RegisterWelcome?.Trim() ?? current.RegisterWelcome,
            AppVersion = string.IsNullOrWhiteSpace(req.AppVersion)
                ? current.AppVersion
                : req.AppVersion.Trim(),
            LoginWelcomeHtml = req.LoginWelcomeHtml ?? current.LoginWelcomeHtml,
            AboutHtml = req.AboutHtml ?? current.AboutHtml,
            HelpHtml = req.HelpHtml ?? current.HelpHtml,
            ChangelogHtml = req.ChangelogHtml ?? current.ChangelogHtml,
            SplashHtml = req.SplashHtml ?? current.SplashHtml,
            SplashCss = req.SplashCss ?? current.SplashCss,
            LogoClickScript = req.LogoClickScript ?? current.LogoClickScript,
            LogoFileName = current.LogoFileName,
            IncomingMessageSoundFileName = current.IncomingMessageSoundFileName,
            OutgoingMessageSoundFileName = current.OutgoingMessageSoundFileName,
            DefaultThemeName = string.IsNullOrWhiteSpace(req.DefaultThemeName)
                ? current.DefaultThemeName
                : req.DefaultThemeName.Trim(),
            Base = req.Base != null ? MergeBaseDto(req.Base, current.Base) : current.Base,
            Themes = themes.Count > 0 ? themes : current.Themes,
        };

        await _appearance.SaveAsync(settings, ct);
        var effective = await _appearance.GetEffectiveAsync(ct);
        return Ok(_appearance.ToPublicDto(effective));
    }

    [HttpPost("appearance/logo")]
    [RequestSizeLimit(3_000_000)]
    public async Task<IActionResult> UploadLogo(IFormFile? file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "Выберите файл" });

        var (valid, error, ext) = await LogoUploadValidator.ValidateUploadAsync(file, ct);
        if (!valid)
            return BadRequest(new { error });

        await using var stream = file.OpenReadStream();
        await _appearance.SaveLogoAsync(stream, ext, ct);
        return Ok(new { logoUrl = "/api/app/logo", logoSvg = AppAppearanceService.IsSvgLogoFile(ext) });
    }

    [HttpPost("appearance/sound/incoming")]
    [RequestSizeLimit(2_100_000)]
    public async Task<IActionResult> UploadIncomingMessageSound(IFormFile? file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "Выберите файл" });

        var (valid, error, ext) = await MessageSoundUploadValidator.ValidateUploadAsync(file, ct);
        if (!valid)
            return BadRequest(new { error });

        await using var stream = file.OpenReadStream();
        await _appearance.SaveMessageSoundAsync("incoming", stream, ext, ct);
        return Ok(new { incomingMessageSoundUrl = "/api/app/sound/incoming" });
    }

    [HttpPost("appearance/sound/outgoing")]
    [RequestSizeLimit(2_100_000)]
    public async Task<IActionResult> UploadOutgoingMessageSound(IFormFile? file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "Выберите файл" });

        var (valid, error, ext) = await MessageSoundUploadValidator.ValidateUploadAsync(file, ct);
        if (!valid)
            return BadRequest(new { error });

        await using var stream = file.OpenReadStream();
        await _appearance.SaveMessageSoundAsync("outgoing", stream, ext, ct);
        return Ok(new { outgoingMessageSoundUrl = "/api/app/sound/outgoing" });
    }

    [HttpPost("appearance/reset")]
    public async Task<IActionResult> ResetAppearance(CancellationToken ct)
    {
        await _appearance.ResetToDefaultsAsync(ct);
        var settings = await _appearance.GetEffectiveAsync(ct);
        return Ok(_appearance.ToPublicDto(settings));
    }

    static AppBaseColors MergeBaseDto(AppBaseColorsDto dto, AppBaseColors current) => new()
    {
        Accent = dto.Accent ?? current.Accent,
        SidebarBg = dto.SidebarBg ?? current.SidebarBg,
        ContentBg = dto.ContentBg ?? current.ContentBg,
        Text = dto.Text ?? current.Text,
        SubText = dto.SubText ?? current.SubText,
        Border = dto.Border ?? current.Border,
        Hover = dto.Hover ?? current.Hover,
    };

    static AppThemeSettings MergeThemeDto(AppThemeSettingsDto dto, AppThemeSettings def)
    {
        var t = new AppThemeSettings
        {
            Name = dto.Name?.Trim() ?? def.Name,
            BodyBg = dto.BodyBg ?? def.BodyBg,
            HeaderBg = dto.HeaderBg ?? def.HeaderBg,
            ChatBg = dto.ChatBg ?? def.ChatBg,
            MyBubbleBg = dto.MyBubbleBg ?? def.MyBubbleBg,
            MyBubbleText = dto.MyBubbleText ?? def.MyBubbleText,
            OtherBubbleBg = dto.OtherBubbleBg ?? def.OtherBubbleBg,
            OtherBubbleText = dto.OtherBubbleText ?? def.OtherBubbleText,
            Accent = dto.Accent ?? def.Accent,
            InputBg = dto.InputBg ?? def.InputBg,
            InputFieldBg = dto.InputFieldBg ?? def.InputFieldBg,
            InputFieldBorder = dto.InputFieldBorder ?? def.InputFieldBorder,
            InputText = dto.InputText ?? def.InputText,
            InputPlaceholder = dto.InputPlaceholder ?? def.InputPlaceholder,
            HeaderText = dto.HeaderText ?? def.HeaderText,
            HeaderSubText = dto.HeaderSubText ?? def.HeaderSubText,
            HeaderBorder = dto.HeaderBorder ?? def.HeaderBorder,
            InputAreaBorder = dto.InputAreaBorder ?? def.InputAreaBorder,
            ScrollThumb = dto.ScrollThumb ?? def.ScrollThumb,
            SenderName = dto.SenderName ?? def.SenderName,
            MenuBg = dto.MenuBg ?? def.MenuBg,
            MenuText = dto.MenuText ?? def.MenuText,
            MenuBorder = dto.MenuBorder ?? def.MenuBorder,
            MenuHover = dto.MenuHover ?? def.MenuHover,
            DotsColor = dto.DotsColor ?? def.DotsColor,
        };
        return t;
    }
}

public sealed class AdminCreateUserRequest
{
    public string Login { get; set; } = "";
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Password { get; set; }
    public string? UserType { get; set; }
}

public sealed class AdminUpdateUserRequest
{
    public string? Login { get; set; }
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Password { get; set; }
    public string? UserType { get; set; }
    public bool? IsActive { get; set; }
}
