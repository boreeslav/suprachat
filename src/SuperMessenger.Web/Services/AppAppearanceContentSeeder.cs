using SuperMessenger.Core.Entities;

namespace SuperMessenger.Web.Services;

/// <summary>
/// One-time seed of HTML content fields. After the marker file exists, seeding never runs again.
/// </summary>
public sealed class AppAppearanceContentSeeder
{
    private readonly AppAppearanceService _appearance;
    private readonly string _markerPath;

    public AppAppearanceContentSeeder(AppAppearanceService appearance, string dataRoot)
    {
        _appearance = appearance;
        var brandingDir = Path.Combine(dataRoot, "branding");
        Directory.CreateDirectory(brandingDir);
        _markerPath = Path.Combine(brandingDir, ".appearance-content-seeded");
    }

    public async Task TrySeedOnceAsync(CancellationToken ct = default)
    {
        if (File.Exists(_markerPath))
            return;

        var defaults = AppAppearanceDefaults.Create();
        var raw = await _appearance.ReadRawSettingsAsync(ct);
        AppAppearanceSettings settings;
        if (raw == null)
        {
            settings = defaults;
        }
        else
        {
            settings = raw;
            if (string.IsNullOrWhiteSpace(settings.AppVersion))
                settings.AppVersion = defaults.AppVersion;
            if (string.IsNullOrWhiteSpace(settings.LoginWelcomeHtml))
                settings.LoginWelcomeHtml = defaults.LoginWelcomeHtml;
            if (string.IsNullOrWhiteSpace(settings.AboutHtml))
                settings.AboutHtml = defaults.AboutHtml;
            if (string.IsNullOrWhiteSpace(settings.HelpHtml))
                settings.HelpHtml = defaults.HelpHtml;
            if (string.IsNullOrWhiteSpace(settings.ChangelogHtml))
                settings.ChangelogHtml = defaults.ChangelogHtml;
            if (string.IsNullOrWhiteSpace(settings.SplashHtml))
                settings.SplashHtml = defaults.SplashHtml;
            if (string.IsNullOrWhiteSpace(settings.SplashCss))
                settings.SplashCss = defaults.SplashCss;
        }

        await _appearance.SaveAsync(settings, ct);
        await File.WriteAllTextAsync(_markerPath, DateTime.UtcNow.ToString("O"), ct);
    }
}
