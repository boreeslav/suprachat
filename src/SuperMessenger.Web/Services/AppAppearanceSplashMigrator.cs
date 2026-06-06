using System.Text.RegularExpressions;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Applies bundled splash screen updates on deploy (revision marker in data/branding).
/// Overwrites saved splash CSS/HTML only when still empty or matching a previous bundled default.
/// </summary>
public sealed class AppAppearanceSplashMigrator
{
    public const int CurrentRevision = 5;

    private readonly AppAppearanceService _appearance;
    private readonly string _markerPath;

    public AppAppearanceSplashMigrator(AppAppearanceService appearance, string dataRoot)
    {
        _appearance = appearance;
        var brandingDir = Path.Combine(dataRoot, "branding");
        Directory.CreateDirectory(brandingDir);
        _markerPath = Path.Combine(brandingDir, $".appearance-splash-rev-{CurrentRevision}");
    }

    public async Task MigrateAsync(CancellationToken ct = default)
    {
        if (File.Exists(_markerPath))
            return;

        var defaults = AppAppearanceDefaults.Create();
        var raw = await _appearance.ReadRawSettingsAsync(ct);
        var settings = raw ?? defaults;
        var changed = false;

        if (ShouldReplaceSplashCss(settings.SplashCss))
        {
            settings.SplashCss = defaults.SplashCss;
            changed = true;
        }

        if (ShouldReplaceSplashHtml(settings.SplashHtml))
        {
            settings.SplashHtml = defaults.SplashHtml;
            changed = true;
        }

        if (changed || raw == null)
            await _appearance.SaveAsync(settings, ct);

        await File.WriteAllTextAsync(_markerPath, DateTime.UtcNow.ToString("O"), ct);
    }

    static bool ShouldReplaceSplashCss(string? value)
    {
        if (MatchesBundled(value, AppAppearanceDefaults.SplashCss))
            return false;

        return string.IsNullOrWhiteSpace(value)
               || MatchesBundled(value, AppAppearanceDefaults.LegacySplashCssRev1)
               || MatchesBundled(value, AppAppearanceDefaults.LegacySplashCssRev2)
               || MatchesBundled(value, AppAppearanceDefaults.LegacySplashCssRev3);
    }

    static bool ShouldReplaceSplashHtml(string? value)
    {
        if (MatchesBundled(value, AppAppearanceDefaults.SplashHtml))
            return false;

        return string.IsNullOrWhiteSpace(value)
               || MatchesBundled(value, AppAppearanceDefaults.LegacySplashHtml)
               || MatchesBundled(value, AppAppearanceDefaults.LegacySplashHtmlRev3)
               || MatchesBundled(value, AppAppearanceDefaults.LegacySplashHtmlRev4);
    }

    static bool MatchesBundled(string? value, string bundled) =>
        Normalize(value) == Normalize(bundled);

    static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "";
        return Regex.Replace(value.Trim(), @"\s+", " ");
    }
}
