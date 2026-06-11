using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/app")]
public sealed class AppController : ControllerBase
{
    private readonly AppAppearanceService _appearance;
    private readonly AppBuildInfoService _buildInfo;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AppController> _log;

    public AppController(
        AppAppearanceService appearance,
        AppBuildInfoService buildInfo,
        IWebHostEnvironment env,
        ILogger<AppController> log)
    {
        _appearance = appearance;
        _buildInfo = buildInfo;
        _env = env;
        _log = log;
    }

    [HttpGet("appearance")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAppearance(CancellationToken ct)
    {
        var settings = await _appearance.GetEffectiveAsync(ct);
        return Ok(_appearance.ToPublicDto(settings));
    }

    /// <summary>
    /// Номер сборки клиентских скриптов (BUILD_NUMBER из app-script-cache.js).
    /// Используется открытым приложением для проверки доступности новой версии.
    /// </summary>
    [HttpGet("build")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBuild(CancellationToken ct)
    {
        var info = await _buildInfo.ResolveAsync(ct);
        if (info == null) return NotFound();

        var payload = new
        {
            build = info.Build,
            swVersion = info.SwVersion,
            appVersion = info.AppVersion,
        };

        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        return Ok(payload);
    }

    /// <summary>
    /// Динамический Web App Manifest. Имя/цвета берутся из настроек брендинга,
    /// поэтому установленное PWA (WebAPK на Android) отражает текущий бренд.
    /// </summary>
    [HttpGet("/manifest.webmanifest")]
    [AllowAnonymous]
    public async Task<IActionResult> GetManifest(CancellationToken ct)
    {
        var s = await _appearance.GetEffectiveAsync(ct);
        var name = string.IsNullOrWhiteSpace(s.AppName) ? "SuperMessenger" : s.AppName.Trim();
        var shortName = name.Length > 12 ? name[..12].Trim() : name;
        var themeColor = AppAppearanceService.ResolvePwaStatusBarColor(s, "#e8eaed");
        var bgColor = NormalizeColor(s.Base?.ContentBg, "#ffffff");
        var icon192 = ResolveIconUrl(s, PwaIconFiles.Icon192);
        var icon512 = ResolveIconUrl(s, PwaIconFiles.Icon512);
        var iconMaskable = ResolveIconUrl(s, PwaIconFiles.IconMaskable512);
        var description = string.IsNullOrWhiteSpace(s.AppDescription)
            ? (string.IsNullOrWhiteSpace(s.AppTagline) ? name : s.AppTagline!.Trim())
            : s.AppDescription!.Trim();

        var manifest = new
        {
            id = "/",
            name,
            short_name = shortName,
            description,
            lang = "ru",
            dir = "ltr",
            start_url = "/?source=pwa",
            scope = "/",
            display = "standalone",
            display_override = new[] { "standalone", "minimal-ui" },
            orientation = "portrait-primary",
            background_color = bgColor,
            theme_color = themeColor,
            categories = new[] { "social", "communication" },
            icons = new object[]
            {
                new { src = icon192, sizes = "192x192", type = "image/png", purpose = "any" },
                new { src = icon512, sizes = "512x512", type = "image/png", purpose = "any" },
                new { src = iconMaskable, sizes = "512x512", type = "image/png", purpose = "maskable" },
            },
            shortcuts = new object[]
            {
                new
                {
                    name = "Новый чат",
                    short_name = "Чат",
                    url = "/?source=pwa-shortcut",
                    icons = new object[]
                    {
                        new { src = icon192, sizes = "192x192", type = "image/png" },
                    },
                },
            },
        };

        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        return new JsonResult(manifest)
        {
            ContentType = "application/manifest+json; charset=utf-8",
        };
    }

    private static string NormalizeColor(string? value, string fallback)
    {
        var v = (value ?? "").Trim();
        return string.IsNullOrEmpty(v) ? fallback : v;
    }

    static string ResolveIconUrl(Core.Entities.AppAppearanceSettings s, string fileName)
    {
        if (s.LogoFileName != null && AppAppearanceService.IsSvgLogoFile(s.LogoFileName))
            return PwaIconFiles.ApiUrl(fileName);
        return $"/icons/{fileName}";
    }

    [HttpGet("icons/{fileName}")]
    [AllowAnonymous]
    public IActionResult GetPwaIcon(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)
            || fileName.Contains('/') || fileName.Contains('\\')
            || !PwaIconFiles.All.Contains(fileName, StringComparer.OrdinalIgnoreCase))
        {
            return NotFound();
        }

        var custom = _appearance.GetCustomPwaIconPhysicalPath(fileName);
        if (custom != null)
        {
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            return PhysicalFile(custom, "image/png");
        }

        var fallback = Path.Combine(_env.WebRootPath, "icons", fileName);
        if (!System.IO.File.Exists(fallback)) return NotFound();
        return PhysicalFile(fallback, "image/png");
    }

    [HttpGet("pwa-icon-bg-image")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPwaIconBgImage(CancellationToken ct)
    {
        var path = await _appearance.GetPwaIconBgImagePhysicalPathAsync(ct);
        if (path == null) return NotFound();
        return PhysicalFile(path, PwaIconBgImageUploadValidator.GetContentType(Path.GetExtension(path)));
    }

    [HttpGet("theme-chat-bg-image")]
    [AllowAnonymous]
    public async Task<IActionResult> GetThemeChatBgImage(
        [FromQuery] string? f,
        [FromQuery] string? theme,
        CancellationToken ct)
    {
        string? path = null;
        if (!string.IsNullOrWhiteSpace(f))
            path = await _appearance.GetThemeChatBgImagePhysicalPathByFileNameAsync(f.Trim(), ct);
        else if (!string.IsNullOrWhiteSpace(theme))
            path = await _appearance.GetThemeChatBgImagePhysicalPathAsync(theme.Trim(), ct);

        if (path == null) return NotFound();
        if (Request.Query.ContainsKey("r"))
            Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        else
            Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        return PhysicalFile(path, ThemeChatBgImageUploadValidator.GetContentType(Path.GetExtension(path)));
    }

    [HttpGet("pwa-icon-logo")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPwaIconLogo(CancellationToken ct)
    {
        var path = await _appearance.GetPwaIconLogoPhysicalPathAsync(ct);
        if (path == null) return NotFound();
        return PhysicalFile(path, "image/svg+xml");
    }

    [HttpGet("logo")]
    [AllowAnonymous]
    public async Task<IActionResult> GetLogo(CancellationToken ct)
    {
        var path = await _appearance.GetLogoPhysicalPathAsync(ct);
        if (path == null) return NotFound();
        var ext = Path.GetExtension(path).ToLowerInvariant();
        var contentType = ext switch
        {
            ".svg" => "image/svg+xml",
            _ => "application/octet-stream",
        };
        return PhysicalFile(path, contentType);
    }

    [HttpGet("sound/incoming")]
    [AllowAnonymous]
    public async Task<IActionResult> GetIncomingMessageSound(CancellationToken ct)
    {
        var path = await _appearance.GetMessageSoundPhysicalPathAsync("incoming", ct);
        if (path == null) return NotFound();
        return PhysicalFile(path, MessageSoundUploadValidator.GetContentType(Path.GetExtension(path)));
    }

    [HttpGet("sound/outgoing")]
    [AllowAnonymous]
    public async Task<IActionResult> GetOutgoingMessageSound(CancellationToken ct)
    {
        var path = await _appearance.GetMessageSoundPhysicalPathAsync("outgoing", ct);
        if (path == null) return NotFound();
        return PhysicalFile(path, MessageSoundUploadValidator.GetContentType(Path.GetExtension(path)));
    }

    /// <summary>
    /// Клиентский boot-профиль (тайминги загрузки). Принимается только при ?bootdebug=1 на клиенте.
    /// </summary>
    [HttpPost("boot-profile")]
    [AllowAnonymous]
    public IActionResult PostBootProfile([FromBody] BootProfileRequest? body)
    {
        if (body?.marks == null || body.marks.Count == 0)
            return NoContent();

        var summary = string.Join(" | ", body.marks.Take(40).Select(m => $"{m.Ms}ms:{m.Label}"));
        _log.LogInformation(
            "Boot profile {Event} path={Path} build={Build} marks={Count} [{Summary}] ua={Ua}",
            body.Event ?? "boot",
            body.Path ?? "",
            body.Build ?? "",
            body.marks.Count,
            summary,
            body.Ua ?? "");

        return NoContent();
    }

    public sealed class BootProfileRequest
    {
        public string? Event { get; set; }
        public string? Path { get; set; }
        public string? Build { get; set; }
        public string? Ua { get; set; }
        public List<BootMarkDto>? marks { get; set; }
    }

    public sealed class BootMarkDto
    {
        public string Label { get; set; } = "";
        public int Ms { get; set; }
        public object? Extra { get; set; }
    }
}
