using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Подставляет брендированный сплэш (HTML + CSS + лого) в index.html на сервере —
/// клиент получает готовый первый кадр без ожидания JS/API.
/// </summary>
public sealed class IndexShellRenderer
{
    private static readonly JsonSerializerOptions AppearanceJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private static readonly Regex AtLoginPath = new(@"^/@[^/?#]+$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex AppLogoImgRegex = new(
        @"<img\b(?<before>[^>]*?\bdata-app-logo\b[^>]*?)(?<hidden>\s+hidden)?(?<after>[^>]*)/?>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly IWebHostEnvironment _env;
    private readonly AppAppearanceService _appearance;
    private string? _template;
    private long _templateMtime;

    public IndexShellRenderer(
        IWebHostEnvironment env,
        AppAppearanceService appearance)
    {
        _env = env;
        _appearance = appearance;
    }

    public static bool IsShellPath(PathString path)
    {
        var p = path.Value ?? "";
        if (p.Length == 0 || string.Equals(p, "/", StringComparison.Ordinal)) return true;
        if (string.Equals(p, "/index.html", StringComparison.OrdinalIgnoreCase)) return true;
        return AtLoginPath.IsMatch(p);
    }

    public async Task<string> RenderAsync(CancellationToken ct = default)
    {
        var settings = await _appearance.GetEffectiveAsync(ct);
        var template = await ReadTemplateAsync(ct);
        var appName = string.IsNullOrWhiteSpace(settings.AppName) ? "SuperMessenger" : settings.AppName.Trim();
        var splashHtml = EnrichSplashHtml(settings.SplashHtml ?? "", appName, settings.LogoFileName);
        var splashCss = settings.SplashCss ?? "";
        var themeColor = AppAppearanceService.ResolvePwaStatusBarColor(settings, "#e8eaed");
        var logoPreload = string.IsNullOrEmpty(settings.LogoFileName)
            ? ""
            : "<link rel=\"preload\" href=\"/api/app/logo\" as=\"image\"/>";

        var appearanceJson = JsonSerializer.Serialize(_appearance.ToPublicDto(settings), AppearanceJsonOptions);
        var appearanceBoot =
            $"<script type=\"application/json\" id=\"sm-appearance-ssr\">{appearanceJson}</script>";

        var html = template
            .Replace("<!--SM_APP_TITLE-->", WebUtility.HtmlEncode(appName), StringComparison.Ordinal)
            .Replace("<!--SM_APP_VERSION-->", WebUtility.HtmlEncode(settings.AppVersion ?? ""), StringComparison.Ordinal)
            .Replace("<!--SM_THEME_COLOR-->", WebUtility.HtmlEncode(themeColor), StringComparison.Ordinal)
            .Replace("<!--SM_SPLASH_CSS-->", splashCss, StringComparison.Ordinal)
            .Replace("<!--SM_SPLASH_HTML-->", splashHtml, StringComparison.Ordinal)
            .Replace("<!--SM_LOGO_PRELOAD-->", logoPreload, StringComparison.Ordinal)
            .Replace("<!--SM_APPEARANCE_BOOT-->", appearanceBoot, StringComparison.Ordinal);

        return ApplyBootstrapBuildVersion(html);
    }

    /// <summary>
    /// Bootstrap-скрипты в index.html должны иметь ?v=sm-build, иначе браузер держит
    /// immutable-кеш старого app-script-cache.js при JS-only деплое.
    /// </summary>
    internal static string ApplyBootstrapBuildVersion(string html)
    {
        var m = Regex.Match(html, @"<meta name=""sm-build"" content=""(\d+)""", RegexOptions.IgnoreCase);
        if (!m.Success || m.Groups[1].Value is not { Length: > 0 } build || build == "0")
            return html;

        var scripts = new[] { "app-boot-timing", "app-update-notifier", "app-script-cache", "app-splash" };
        foreach (var name in scripts)
        {
            html = Regex.Replace(
                html,
                $@"((?:src|href)=""/messenger/{Regex.Escape(name)}\.js)\?[^""]*(""|\s)",
                $"$1?v={build}$2",
                RegexOptions.IgnoreCase);
        }

        return html;
    }

    private async Task<string> ReadTemplateAsync(CancellationToken ct)
    {
        var path = Path.Combine(_env.WebRootPath, "index.html");
        var mtime = File.GetLastWriteTimeUtc(path).Ticks;
        if (_template != null && _templateMtime == mtime)
            return _template;

        _template = await File.ReadAllTextAsync(path, ct);
        _templateMtime = mtime;
        return _template;
    }

    internal static string EnrichSplashHtml(string html, string appName, string? logoFileName)
    {
        if (string.IsNullOrWhiteSpace(html)) return html;

        var encodedName = WebUtility.HtmlEncode(appName);
        var logoUrl = string.IsNullOrEmpty(logoFileName) ? null : "/api/app/logo";

        html = AppLogoImgRegex.Replace(html, m =>
        {
            if (logoUrl == null) return m.Value;
            var tag = m.Value.TrimEnd('>', '/').Trim();
            if (tag.EndsWith('/')) tag = tag[..^1].TrimEnd();
            tag = Regex.Replace(tag, @"\s+hidden\b", "", RegexOptions.IgnoreCase);
            if (!Regex.IsMatch(tag, @"\bsrc\s*=", RegexOptions.IgnoreCase))
                tag += $" src=\"{logoUrl}\"";
            if (!Regex.IsMatch(tag, @"\bclass\s*=", RegexOptions.IgnoreCase))
                tag += " class=\"sm-splash-logo sm-splash-logo-ready\"";
            else if (!tag.Contains("sm-splash-logo-ready", StringComparison.Ordinal))
                tag = Regex.Replace(tag, @"\bclass\s*=\s*""([^""]*)""", @"class=""$1 sm-splash-logo-ready""", RegexOptions.IgnoreCase);
            if (!Regex.IsMatch(tag, @"\balt\s*=", RegexOptions.IgnoreCase))
                tag += $" alt=\"{encodedName}\"";
            return tag + ">";
        });

        html = Regex.Replace(
            html,
            @"(<[^>]+data-app-name[^>]*>)\s*(</)",
            $"$1{encodedName}$2",
            RegexOptions.IgnoreCase);

        return html;
    }

    private static string NormalizeColor(string? value, string fallback)
    {
        var v = (value ?? "").Trim();
        return string.IsNullOrEmpty(v) ? fallback : v;
    }
}
