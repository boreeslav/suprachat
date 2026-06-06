using System.Text.Json;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Web.Services;

public sealed class AppAppearanceService
{
    private readonly string _settingsPath;
    private readonly string _brandingDir;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public AppAppearanceService(string dataRoot)
    {
        _brandingDir = Path.Combine(dataRoot, "branding");
        Directory.CreateDirectory(_brandingDir);
        _settingsPath = Path.Combine(_brandingDir, "app-appearance.json");
    }

    public async Task<AppAppearanceSettings?> ReadRawSettingsAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            return await ReadRawUnlockedAsync(ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<AppAppearanceSettings> GetEffectiveAsync(CancellationToken ct = default)
    {
        var saved = await ReadRawAsync(ct);
        var defaults = AppAppearanceDefaults.Create();
        if (saved == null)
            return defaults;

        var merged = new AppAppearanceSettings
        {
            AppName = string.IsNullOrWhiteSpace(saved.AppName) ? defaults.AppName : saved.AppName.Trim(),
            AppDescription = Or(saved.AppDescription, defaults.AppDescription),
            AppTagline = Or(saved.AppTagline, defaults.AppTagline),
            RegisterWelcome = Or(saved.RegisterWelcome, defaults.RegisterWelcome),
            AppVersion = string.IsNullOrWhiteSpace(saved.AppVersion) ? defaults.AppVersion : saved.AppVersion.Trim(),
            LoginWelcomeHtml = Or(saved.LoginWelcomeHtml, defaults.LoginWelcomeHtml),
            AboutHtml = Or(saved.AboutHtml, defaults.AboutHtml),
            HelpHtml = Or(saved.HelpHtml, defaults.HelpHtml),
            ChangelogHtml = Or(saved.ChangelogHtml, defaults.ChangelogHtml),
            SplashHtml = Or(saved.SplashHtml, defaults.SplashHtml),
            SplashCss = Or(saved.SplashCss, defaults.SplashCss),
            LogoClickScript = Or(saved.LogoClickScript, defaults.LogoClickScript),
            LogoFileName = saved.LogoFileName,
            IncomingMessageSoundFileName = saved.IncomingMessageSoundFileName,
            OutgoingMessageSoundFileName = saved.OutgoingMessageSoundFileName,
            DefaultThemeName = string.IsNullOrWhiteSpace(saved.DefaultThemeName)
                ? defaults.DefaultThemeName
                : saved.DefaultThemeName.Trim(),
            Base = MergeBase(saved.Base, defaults.Base),
            Themes = MergeThemes(saved.Themes, defaults.Themes),
        };
        return merged;
    }

    public async Task SaveAsync(AppAppearanceSettings settings, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var json = JsonSerializer.Serialize(settings, JsonOptions);
            var temp = _settingsPath + ".tmp";
            await File.WriteAllTextAsync(temp, json, ct);
            File.Move(temp, _settingsPath, true);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task SaveLogoAsync(Stream stream, string extension, CancellationToken ct = default)
    {
        extension = NormalizeLogoExtension(extension);
        var fileName = "logo" + extension;
        var path = Path.Combine(_brandingDir, fileName);
        await _lock.WaitAsync(ct);
        try
        {
            foreach (var old in Directory.EnumerateFiles(_brandingDir, "logo.*"))
            {
                if (!string.Equals(old, path, StringComparison.OrdinalIgnoreCase))
                    File.Delete(old);
            }
            await using var fs = File.Create(path);
            await stream.CopyToAsync(fs, ct);
            var settings = await ReadRawUnlockedAsync(ct) ?? AppAppearanceDefaults.Create();
            settings.LogoFileName = fileName;
            var json = JsonSerializer.Serialize(settings, JsonOptions);
            await File.WriteAllTextAsync(_settingsPath, json, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<string?> GetLogoPhysicalPathAsync(CancellationToken ct = default)
    {
        var settings = await ReadRawAsync(ct);
        if (settings?.LogoFileName == null) return null;
        var path = Path.Combine(_brandingDir, settings.LogoFileName);
        return File.Exists(path) ? path : null;
    }

    public async Task SaveMessageSoundAsync(string kind, Stream stream, string extension, CancellationToken ct = default)
    {
        var prefix = NormalizeMessageSoundKind(kind);
        extension = NormalizeMessageSoundExtension(extension);
        var fileName = prefix + extension;
        var path = Path.Combine(_brandingDir, fileName);
        var propName = prefix == "message-sound-incoming"
            ? nameof(AppAppearanceSettings.IncomingMessageSoundFileName)
            : nameof(AppAppearanceSettings.OutgoingMessageSoundFileName);

        await _lock.WaitAsync(ct);
        try
        {
            foreach (var old in Directory.EnumerateFiles(_brandingDir, prefix + ".*"))
            {
                if (!string.Equals(old, path, StringComparison.OrdinalIgnoreCase))
                    File.Delete(old);
            }
            await using var fs = File.Create(path);
            await stream.CopyToAsync(fs, ct);
            var settings = await ReadRawUnlockedAsync(ct) ?? AppAppearanceDefaults.Create();
            if (propName == nameof(AppAppearanceSettings.IncomingMessageSoundFileName))
                settings.IncomingMessageSoundFileName = fileName;
            else
                settings.OutgoingMessageSoundFileName = fileName;
            var json = JsonSerializer.Serialize(settings, JsonOptions);
            await File.WriteAllTextAsync(_settingsPath, json, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<string?> GetMessageSoundPhysicalPathAsync(string kind, CancellationToken ct = default)
    {
        var settings = await ReadRawAsync(ct);
        if (settings == null) return null;
        var prefix = NormalizeMessageSoundKind(kind);
        var fileName = prefix == "message-sound-incoming"
            ? settings.IncomingMessageSoundFileName
            : settings.OutgoingMessageSoundFileName;
        if (string.IsNullOrEmpty(fileName)) return null;
        var path = Path.Combine(_brandingDir, fileName);
        return File.Exists(path) ? path : null;
    }

    public async Task ResetToDefaultsAsync(CancellationToken ct = default)
    {
        var current = await ReadRawAsync(ct);
        var defaults = AppAppearanceDefaults.Create();
        defaults.LogoFileName = current?.LogoFileName;
        defaults.IncomingMessageSoundFileName = current?.IncomingMessageSoundFileName;
        defaults.OutgoingMessageSoundFileName = current?.OutgoingMessageSoundFileName;
        if (!string.IsNullOrWhiteSpace(current?.AppName))
            defaults.AppName = current.AppName.Trim();
        if (!string.IsNullOrWhiteSpace(current?.AppDescription))
            defaults.AppDescription = current.AppDescription.Trim();
        if (!string.IsNullOrWhiteSpace(current?.AppTagline))
            defaults.AppTagline = current.AppTagline.Trim();
        if (!string.IsNullOrWhiteSpace(current?.RegisterWelcome))
            defaults.RegisterWelcome = current.RegisterWelcome.Trim();
        defaults.AppVersion = current?.AppVersion?.Trim() ?? defaults.AppVersion;
        defaults.LoginWelcomeHtml = current?.LoginWelcomeHtml ?? defaults.LoginWelcomeHtml;
        defaults.AboutHtml = current?.AboutHtml ?? defaults.AboutHtml;
        defaults.HelpHtml = current?.HelpHtml ?? defaults.HelpHtml;
        defaults.ChangelogHtml = current?.ChangelogHtml ?? defaults.ChangelogHtml;
        defaults.SplashHtml = current?.SplashHtml ?? defaults.SplashHtml;
        defaults.SplashCss = current?.SplashCss ?? defaults.SplashCss;
        defaults.LogoClickScript = current?.LogoClickScript ?? defaults.LogoClickScript;
        await SaveAsync(defaults, ct);
    }

    public object ToPublicDto(AppAppearanceSettings s)
    {
        var appName = s.AppName ?? "";
        var changelog = BrandingTextHelper.CompactGenericChangelog(s.ChangelogHtml);
        return new
    {
        appName = s.AppName,
        appDescription = s.AppDescription,
        appTagline = s.AppTagline,
        registerWelcome = s.RegisterWelcome,
        appVersion = s.AppVersion,
        loginWelcomeHtml = BrandingTextHelper.SubstituteAppName(s.LoginWelcomeHtml, appName),
        aboutHtml = BrandingTextHelper.SubstituteAppName(s.AboutHtml, appName),
        helpHtml = BrandingTextHelper.SubstituteAppName(s.HelpHtml, appName),
        changelogHtml = changelog,
        splashHtml = s.SplashHtml,
        splashCss = s.SplashCss,
        logoClickScript = s.LogoClickScript,
        logoUrl = string.IsNullOrEmpty(s.LogoFileName) ? null : "/api/app/logo",
        logoSvg = IsSvgLogoFile(s.LogoFileName),
        incomingMessageSoundUrl = string.IsNullOrEmpty(s.IncomingMessageSoundFileName)
            ? null
            : "/api/app/sound/incoming",
        outgoingMessageSoundUrl = string.IsNullOrEmpty(s.OutgoingMessageSoundFileName)
            ? null
            : "/api/app/sound/outgoing",
        defaultThemeName = s.DefaultThemeName,
        @base = new
        {
            accent = s.Base.Accent,
            sidebarBg = s.Base.SidebarBg,
            contentBg = s.Base.ContentBg,
            text = s.Base.Text,
            subText = s.Base.SubText,
            border = s.Base.Border,
            hover = s.Base.Hover,
        },
        themes = s.Themes.Select(ToThemeDto).ToList(),
    };
    }

    public static object ToThemeDto(AppThemeSettings t) => new
    {
        name = t.Name,
        bodyBg = t.BodyBg,
        headerBg = t.HeaderBg,
        chatBg = t.ChatBg,
        myBubbleBg = t.MyBubbleBg,
        myBubbleText = t.MyBubbleText,
        otherBubbleBg = t.OtherBubbleBg,
        otherBubbleText = t.OtherBubbleText,
        accent = t.Accent,
        inputBg = t.InputBg,
        inputFieldBg = t.InputFieldBg,
        inputFieldBorder = t.InputFieldBorder,
        inputText = t.InputText,
        inputPlaceholder = t.InputPlaceholder,
        headerText = t.HeaderText,
        headerSubText = t.HeaderSubText,
        headerBorder = t.HeaderBorder,
        inputAreaBorder = t.InputAreaBorder,
        scrollThumb = t.ScrollThumb,
        senderName = t.SenderName,
        menuBg = t.MenuBg,
        menuText = t.MenuText,
        menuBorder = t.MenuBorder,
        menuHover = t.MenuHover,
        dotsColor = t.DotsColor,
    };

    public static bool IsSvgLogoFile(string? logoFileName) =>
        !string.IsNullOrEmpty(logoFileName)
        && logoFileName.EndsWith(".svg", StringComparison.OrdinalIgnoreCase);

    public static AppThemeSettings ThemeFromDto(AppThemeSettingsDto dto)
    {
        var t = new AppThemeSettings { Name = dto.Name?.Trim() ?? "" };
        if (!string.IsNullOrEmpty(dto.BodyBg)) t.BodyBg = dto.BodyBg;
        if (!string.IsNullOrEmpty(dto.HeaderBg)) t.HeaderBg = dto.HeaderBg;
        if (!string.IsNullOrEmpty(dto.ChatBg)) t.ChatBg = dto.ChatBg;
        if (!string.IsNullOrEmpty(dto.MyBubbleBg)) t.MyBubbleBg = dto.MyBubbleBg;
        if (!string.IsNullOrEmpty(dto.MyBubbleText)) t.MyBubbleText = dto.MyBubbleText;
        if (!string.IsNullOrEmpty(dto.OtherBubbleBg)) t.OtherBubbleBg = dto.OtherBubbleBg;
        if (!string.IsNullOrEmpty(dto.OtherBubbleText)) t.OtherBubbleText = dto.OtherBubbleText;
        if (!string.IsNullOrEmpty(dto.Accent)) t.Accent = dto.Accent;
        if (!string.IsNullOrEmpty(dto.InputBg)) t.InputBg = dto.InputBg;
        if (!string.IsNullOrEmpty(dto.InputFieldBg)) t.InputFieldBg = dto.InputFieldBg;
        if (!string.IsNullOrEmpty(dto.InputFieldBorder)) t.InputFieldBorder = dto.InputFieldBorder;
        if (!string.IsNullOrEmpty(dto.InputText)) t.InputText = dto.InputText;
        if (!string.IsNullOrEmpty(dto.InputPlaceholder)) t.InputPlaceholder = dto.InputPlaceholder;
        if (!string.IsNullOrEmpty(dto.HeaderText)) t.HeaderText = dto.HeaderText;
        if (!string.IsNullOrEmpty(dto.HeaderSubText)) t.HeaderSubText = dto.HeaderSubText;
        if (!string.IsNullOrEmpty(dto.HeaderBorder)) t.HeaderBorder = dto.HeaderBorder;
        if (!string.IsNullOrEmpty(dto.InputAreaBorder)) t.InputAreaBorder = dto.InputAreaBorder;
        if (!string.IsNullOrEmpty(dto.ScrollThumb)) t.ScrollThumb = dto.ScrollThumb;
        if (!string.IsNullOrEmpty(dto.SenderName)) t.SenderName = dto.SenderName;
        if (!string.IsNullOrEmpty(dto.MenuBg)) t.MenuBg = dto.MenuBg;
        if (!string.IsNullOrEmpty(dto.MenuText)) t.MenuText = dto.MenuText;
        if (!string.IsNullOrEmpty(dto.MenuBorder)) t.MenuBorder = dto.MenuBorder;
        if (!string.IsNullOrEmpty(dto.MenuHover)) t.MenuHover = dto.MenuHover;
        if (!string.IsNullOrEmpty(dto.DotsColor)) t.DotsColor = dto.DotsColor;
        return t;
    }

    static AppBaseColors MergeBase(AppBaseColors? saved, AppBaseColors defaults)
    {
        if (saved == null) return defaults;
        return new AppBaseColors
        {
            Accent = Or(saved.Accent, defaults.Accent),
            SidebarBg = Or(saved.SidebarBg, defaults.SidebarBg),
            ContentBg = Or(saved.ContentBg, defaults.ContentBg),
            Text = Or(saved.Text, defaults.Text),
            SubText = Or(saved.SubText, defaults.SubText),
            Border = Or(saved.Border, defaults.Border),
            Hover = Or(saved.Hover, defaults.Hover),
        };
    }

    static List<AppThemeSettings> MergeThemes(List<AppThemeSettings>? saved, List<AppThemeSettings> defaults)
    {
        if (saved == null || saved.Count == 0) return defaults;
        var byName = defaults.ToDictionary(t => t.Name, StringComparer.Ordinal);
        foreach (var t in saved)
        {
            if (string.IsNullOrWhiteSpace(t.Name)) continue;
            byName[t.Name.Trim()] = t;
        }
        return defaults.Select(d => byName.TryGetValue(d.Name, out var m) ? m : d).ToList();
    }

    static string Or(string? value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

    static string NormalizeLogoExtension(string ext)
    {
        ext = (ext ?? "").Trim().ToLowerInvariant();
        return ext switch
        {
            ".jpeg" => ".jpg",
            ".png" or ".jpg" or ".webp" or ".gif" or ".svg" => ext,
            _ => ".png",
        };
    }

    static string NormalizeMessageSoundKind(string kind)
    {
        if (string.Equals(kind, "outgoing", StringComparison.OrdinalIgnoreCase))
            return "message-sound-outgoing";
        return "message-sound-incoming";
    }

    static string NormalizeMessageSoundExtension(string ext)
    {
        ext = (ext ?? "").Trim().ToLowerInvariant();
        return ext switch
        {
            ".mp3" or ".ogg" or ".wav" or ".webm" or ".m4a" => ext,
            _ => ".mp3",
        };
    }

    async Task<AppAppearanceSettings?> ReadRawAsync(CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            return await ReadRawUnlockedAsync(ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    async Task<AppAppearanceSettings?> ReadRawUnlockedAsync(CancellationToken ct)
    {
        if (!File.Exists(_settingsPath)) return null;
        var json = await File.ReadAllTextAsync(_settingsPath, ct);
        return JsonSerializer.Deserialize<AppAppearanceSettings>(json, JsonOptions);
    }
}

public sealed class AppAppearanceSaveRequest
{
    public string? AppName { get; set; }
    public string? AppDescription { get; set; }
    public string? AppTagline { get; set; }
    public string? RegisterWelcome { get; set; }
    public string? AppVersion { get; set; }
    public string? LoginWelcomeHtml { get; set; }
    public string? AboutHtml { get; set; }
    public string? HelpHtml { get; set; }
    public string? ChangelogHtml { get; set; }
    public string? SplashHtml { get; set; }
    public string? SplashCss { get; set; }
    public string? LogoClickScript { get; set; }
    public string? DefaultThemeName { get; set; }
    public AppBaseColorsDto? Base { get; set; }
    public List<AppThemeSettingsDto>? Themes { get; set; }
}

public sealed class AppBaseColorsDto
{
    public string? Accent { get; set; }
    public string? SidebarBg { get; set; }
    public string? ContentBg { get; set; }
    public string? Text { get; set; }
    public string? SubText { get; set; }
    public string? Border { get; set; }
    public string? Hover { get; set; }
}

public sealed class AppThemeSettingsDto
{
    public string? Name { get; set; }
    public string? BodyBg { get; set; }
    public string? HeaderBg { get; set; }
    public string? ChatBg { get; set; }
    public string? MyBubbleBg { get; set; }
    public string? MyBubbleText { get; set; }
    public string? OtherBubbleBg { get; set; }
    public string? OtherBubbleText { get; set; }
    public string? Accent { get; set; }
    public string? InputBg { get; set; }
    public string? InputFieldBg { get; set; }
    public string? InputFieldBorder { get; set; }
    public string? InputText { get; set; }
    public string? InputPlaceholder { get; set; }
    public string? HeaderText { get; set; }
    public string? HeaderSubText { get; set; }
    public string? HeaderBorder { get; set; }
    public string? InputAreaBorder { get; set; }
    public string? ScrollThumb { get; set; }
    public string? SenderName { get; set; }
    public string? MenuBg { get; set; }
    public string? MenuText { get; set; }
    public string? MenuBorder { get; set; }
    public string? MenuHover { get; set; }
    public string? DotsColor { get; set; }
}
