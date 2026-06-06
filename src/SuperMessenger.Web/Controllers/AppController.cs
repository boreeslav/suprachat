using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/app")]
public sealed class AppController : ControllerBase
{
    private static readonly System.Text.RegularExpressions.Regex BuildNumberRegex =
        new(@"const BUILD_NUMBER = (\d+);", System.Text.RegularExpressions.RegexOptions.Compiled);
    private static readonly System.Text.RegularExpressions.Regex SwVersionRegex =
        new(@"const SW_VERSION = (\d+);", System.Text.RegularExpressions.RegexOptions.Compiled);

    private readonly AppAppearanceService _appearance;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AppController> _log;

    public AppController(AppAppearanceService appearance, IWebHostEnvironment env, ILogger<AppController> log)
    {
        _appearance = appearance;
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
        var path = Path.Combine(_env.WebRootPath, "messenger", "app-script-cache.js");
        if (!System.IO.File.Exists(path)) return NotFound();

        var js = System.IO.File.ReadAllText(path);
        var match = BuildNumberRegex.Match(js);
        if (!match.Success) return NotFound();

        long swVersion = 0;
        var swPath = Path.Combine(_env.WebRootPath, "sw.js");
        if (System.IO.File.Exists(swPath))
        {
            var swMatch = SwVersionRegex.Match(System.IO.File.ReadAllText(swPath));
            if (swMatch.Success) swVersion = long.Parse(swMatch.Groups[1].Value);
        }

        var settings = await _appearance.GetEffectiveAsync(ct);

        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        return Ok(new
        {
            build = long.Parse(match.Groups[1].Value),
            swVersion,
            appVersion = settings.AppVersion ?? "",
        });
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
        var themeColor = NormalizeColor(s.Base?.Accent, "#4a7fc1");
        // Белый фон совпадает со сплэшем — плавный переход при запуске WebAPK на Android.
        var bgColor = NormalizeColor(s.Base?.ContentBg, "#ffffff");
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
                new { src = "/icons/icon-192.png", sizes = "192x192", type = "image/png", purpose = "any" },
                new { src = "/icons/icon-512.png", sizes = "512x512", type = "image/png", purpose = "any" },
                new { src = "/icons/icon-maskable-512.png", sizes = "512x512", type = "image/png", purpose = "maskable" },
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
                        new { src = "/icons/icon-192.png", sizes = "192x192", type = "image/png" },
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

    [HttpGet("logo")]
    [AllowAnonymous]
    public async Task<IActionResult> GetLogo(CancellationToken ct)
    {
        var path = await _appearance.GetLogoPhysicalPathAsync(ct);
        if (path == null) return NotFound();
        var ext = Path.GetExtension(path).ToLowerInvariant();
        var contentType = ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
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
