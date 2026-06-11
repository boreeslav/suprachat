using System.Text.Json;
using System.Text.RegularExpressions;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Источник номера сборки для /api/app/build.
/// При деплое manifest копируется в data/build-manifest.json до рестарта контейнера.
/// </summary>
public sealed class AppBuildInfoService
{
    private static readonly Regex BuildNumberRegex =
        new(@"const BUILD_NUMBER = (\d+);", RegexOptions.Compiled);
    private static readonly Regex SwVersionRegex =
        new(@"const SW_VERSION = (\d+);", RegexOptions.Compiled);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private readonly string _dataRoot;
    private readonly string _webRoot;
    private readonly AppAppearanceService _appearance;

    public AppBuildInfoService(
        IConfiguration configuration,
        IWebHostEnvironment env,
        AppAppearanceService appearance)
    {
        _dataRoot = configuration["Data:Root"] ?? Path.Combine(env.ContentRootPath, "data");
        _webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        _appearance = appearance;
    }

    public sealed record BuildInfo(long Build, long SwVersion, string AppVersion);

    public async Task<BuildInfo?> ResolveAsync(CancellationToken ct = default)
    {
        var fromManifest = await TryReadManifestAsync(ct);
        if (fromManifest != null)
            return fromManifest;

        return await ReadFromStaticFilesAsync(ct);
    }

    async Task<BuildInfo?> TryReadManifestAsync(CancellationToken ct)
    {
        foreach (var path in ManifestPaths())
        {
            if (!File.Exists(path)) continue;
            try
            {
                var json = await File.ReadAllTextAsync(path, ct);
                var doc = JsonSerializer.Deserialize<BuildManifestDto>(json, JsonOptions);
                if (doc == null || doc.Build <= 0) continue;
                var sw = doc.SwVersion > 0 ? doc.SwVersion : doc.Build;
                var appVersion = (doc.AppVersion ?? "").Trim();
                if (string.IsNullOrEmpty(appVersion))
                {
                    var settings = await _appearance.GetEffectiveAsync(ct);
                    appVersion = settings.AppVersion ?? "";
                }
                return new BuildInfo(doc.Build, sw, appVersion);
            }
            catch
            {
                // try next path
            }
        }

        return null;
    }

    IEnumerable<string> ManifestPaths()
    {
        yield return Path.Combine(_dataRoot, "build-manifest.json");
        yield return Path.Combine(_webRoot, "build-manifest.json");
    }

    async Task<BuildInfo?> ReadFromStaticFilesAsync(CancellationToken ct)
    {
        var scriptPath = Path.Combine(_webRoot, "messenger", "app-script-cache.js");
        if (!File.Exists(scriptPath)) return null;

        var js = await File.ReadAllTextAsync(scriptPath, ct);
        var match = BuildNumberRegex.Match(js);
        if (!match.Success) return null;

        long swVersion = 0;
        var swPath = Path.Combine(_webRoot, "sw.js");
        if (File.Exists(swPath))
        {
            var swJs = await File.ReadAllTextAsync(swPath, ct);
            var swMatch = SwVersionRegex.Match(swJs);
            if (swMatch.Success) swVersion = long.Parse(swMatch.Groups[1].Value);
        }

        var settings = await _appearance.GetEffectiveAsync(ct);
        var build = long.Parse(match.Groups[1].Value);
        return new BuildInfo(
            build,
            swVersion > 0 ? swVersion : build,
            settings.AppVersion ?? "");
    }

    sealed class BuildManifestDto
    {
        public long Build { get; set; }
        public long SwVersion { get; set; }
        public string? AppVersion { get; set; }
    }
}
