using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Security;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IDataStore _store;
    private readonly IWebHostEnvironment _env;

    public AuthController(IDataStore store, IWebHostEnvironment env)
    {
        _store = store;
        _env = env;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromForm] string login, [FromForm] string password, CancellationToken ct)
    {
        var user = await _store.GetUserByLoginAsync(login.Trim(), ct);
        if (user == null || !user.IsActive || !PasswordHasher.Verify(password, user.PasswordHash))
            return BadRequest(new { error = "Неверный логин или пароль" });

        user.LastSeenAt = DateTime.UtcNow;
        await _store.SaveUserAsync(user, ct);
        await SignInAsync(user);
        return Ok(new { success = true, userType = user.Type.ToString() });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { success = true });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(id, out var uid)) return Unauthorized();
        var user = await _store.GetUserByIdAsync(uid, ct);
        if (user == null) return Unauthorized();
        return Ok(new
        {
            id = user.Id,
            login = user.Login,
            name = user.DisplayName,
            statusText = user.StatusText ?? "",
            userType = user.Type.ToString(),
            avatar = AvatarUrlHelper.ForUser(user),
            encryptionConfigured = !string.IsNullOrEmpty(user.EncryptionSalt)
                && !string.IsNullOrEmpty(user.EncryptionVerifier)
                && !string.IsNullOrEmpty(user.EncryptionPublicKey),
            encryptionSalt = user.EncryptionSalt,
            encryptionVerifier = user.EncryptionVerifier,
            masterPasswordMatchesLogin = user.MasterPasswordMatchesLogin,
        });
    }

    internal static async Task SignInUserAsync(HttpContext http, UserRecord user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Login),
            new(ClaimTypes.Role, user.Type.ToString()),
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await http.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true });
    }

    private Task SignInAsync(UserRecord user) => SignInUserAsync(HttpContext, user);
}
