using System.Text;
using System.Text.Json;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Применяет deploy-branding.json один раз после деплоя: версия 1.N и новая запись в истории изменений.
/// Название приложения и «О приложении» не трогаем — их задаёт админка на сервере.
/// </summary>
public static class DeployBrandingBootstrap
{
    static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public static async Task ApplyIfPresentAsync(
        AppAppearanceService appearance,
        IWebHostEnvironment env,
        ILogger logger,
        CancellationToken ct = default)
    {
        var path = Path.Combine(env.ContentRootPath, "deploy-branding.json");
        if (!File.Exists(path))
            return;

        DeployBrandingPayload? payload;
        try
        {
            var json = await File.ReadAllTextAsync(path, ct);
            payload = JsonSerializer.Deserialize<DeployBrandingPayload>(json, JsonOptions);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to read deploy-branding.json");
            TryDelete(path, logger);
            return;
        }

        if (payload == null)
        {
            TryDelete(path, logger);
            return;
        }

        var settings = await appearance.ReadRawSettingsAsync(ct) ?? AppAppearanceDefaults.Create();
        var changed = false;

        if (!string.IsNullOrWhiteSpace(payload.AppVersion))
        {
            settings.AppVersion = payload.AppVersion.Trim();
            changed = true;
        }

        if (payload.ChangelogEntry?.Items is { Count: > 0 } entryItems)
        {
            var meaningful = entryItems
                .Select(i => i?.Trim())
                .Where(i => !string.IsNullOrEmpty(i) && !BrandingTextHelper.IsGenericChangelogLine(i))
                .ToList();

            if (meaningful.Count > 0)
            {
                var entry = payload.ChangelogEntry;
                var version = string.IsNullOrWhiteSpace(entry.Version) ? settings.AppVersion : entry.Version.Trim();
                if (!ChangelogStartsWithVersion(settings.ChangelogHtml, version))
                {
                    var dateSuffix = string.IsNullOrWhiteSpace(entry.Date) ? "" : $" <small>({entry.Date.Trim()})</small>";
                    var sb = new StringBuilder();
                    sb.Append("<h3>").Append(Escape(version)).Append(dateSuffix).Append("</h3><ul>");
                    foreach (var line in meaningful)
                        sb.Append("<li>").Append(Escape(line!)).Append("</li>");
                    sb.Append("</ul>");
                    var existing = (settings.ChangelogHtml ?? "").Trim();
                    settings.ChangelogHtml = existing.Length == 0
                        ? sb.ToString()
                        : sb + "\n" + existing;
                    changed = true;
                }
            }
        }

        var repairedAbout = BrandingTextHelper.SubstituteAppName(settings.AboutHtml, settings.AppName);
        if (!string.Equals(repairedAbout, settings.AboutHtml, StringComparison.Ordinal))
        {
            settings.AboutHtml = repairedAbout;
            changed = true;
        }

        var compacted = BrandingTextHelper.CompactGenericChangelog(settings.ChangelogHtml);
        if (!string.Equals(compacted, settings.ChangelogHtml, StringComparison.Ordinal))
        {
            settings.ChangelogHtml = compacted;
            changed = true;
        }

        if (changed)
        {
            await appearance.SaveAsync(settings, ct);
            logger.LogInformation(
                "Applied deploy branding: version {Version}, app {AppName}",
                settings.AppVersion,
                settings.AppName);
        }
        else
        {
            logger.LogInformation("Deploy branding file present; no settings changes needed");
        }

        TryDelete(path, logger);
    }

    static bool ChangelogStartsWithVersion(string? html, string version)
    {
        if (string.IsNullOrWhiteSpace(html) || string.IsNullOrWhiteSpace(version))
            return false;
        var head = html.TrimStart();
        return head.StartsWith("<h3>" + version, StringComparison.OrdinalIgnoreCase)
            || head.StartsWith("<h3>" + Escape(version), StringComparison.OrdinalIgnoreCase);
    }

    static string Escape(string value) =>
        value.Replace("&", "&amp;", StringComparison.Ordinal)
            .Replace("<", "&lt;", StringComparison.Ordinal)
            .Replace(">", "&gt;", StringComparison.Ordinal);

    static void TryDelete(string path, ILogger logger)
    {
        try { File.Delete(path); }
        catch (Exception ex) { logger.LogWarning(ex, "Could not delete deploy-branding.json"); }
    }

    sealed class DeployBrandingPayload
    {
        public string? AppName { get; set; }
        public string? AppVersion { get; set; }
        public string? AboutHtml { get; set; }
        public DeployChangelogEntry? ChangelogEntry { get; set; }
    }

    sealed class DeployChangelogEntry
    {
        public string? Version { get; set; }
        public string? Date { get; set; }
        public List<string>? Items { get; set; }
    }
}
