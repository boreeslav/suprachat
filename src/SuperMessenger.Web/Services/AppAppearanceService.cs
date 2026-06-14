using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Web.Services;

public sealed class AppAppearanceService
{
    private readonly string _settingsPath;
    private readonly string _brandingDir;
    private readonly string _iconsDir;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public AppAppearanceService(string dataRoot)
    {
        _brandingDir = Path.Combine(dataRoot, "branding");
        _iconsDir = Path.Combine(_brandingDir, "icons");
        Directory.CreateDirectory(_brandingDir);
        Directory.CreateDirectory(_iconsDir);
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
            PwaIconLogoFileName = saved.PwaIconLogoFileName,
            PwaIconBgColor = string.IsNullOrWhiteSpace(saved.PwaIconBgColor)
                ? defaults.Base.Accent
                : saved.PwaIconBgColor.Trim(),
            PwaIconBgImageFileName = saved.PwaIconBgImageFileName,
            LogoSvgColor = NormalizeOptionalColor(saved.LogoSvgColor),
            PwaIconSvgColor = NormalizeOptionalColor(saved.PwaIconSvgColor),
            IncomingMessageSoundFileName = saved.IncomingMessageSoundFileName,
            OutgoingMessageSoundFileName = saved.OutgoingMessageSoundFileName,
            DefaultThemeName = string.IsNullOrWhiteSpace(saved.DefaultThemeName)
                ? defaults.DefaultThemeName
                : saved.DefaultThemeName.Trim(),
            UseThemeChatBg = saved.UseThemeChatBg ?? true,
            EnableGroupEncryption = saved.EnableGroupEncryption ?? false,
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

    public async Task SaveLogoAsync(Stream stream, string extension, string? pwaIconBgColor, CancellationToken ct = default)
    {
        extension = NormalizeLogoExtension(extension);
        if (extension != ".svg")
            throw new InvalidOperationException("Логотип должен быть SVG");

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
            if (!string.IsNullOrWhiteSpace(pwaIconBgColor))
                settings.PwaIconBgColor = PwaIconGenerator.NormalizeBgColor(pwaIconBgColor, settings.Base.Accent);
            var json = JsonSerializer.Serialize(settings, JsonOptions);
            await File.WriteAllTextAsync(_settingsPath, json, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<(bool ok, string? error)> SavePwaIconsAsync(
        IEnumerable<IFormFile> files,
        string? pwaIconBgColor,
        string? pwaIconSvgColor = null,
        CancellationToken ct = default)
    {
        var fileList = files.Where(f => f.Length > 0).ToList();
        if (fileList.Count == 0)
            return (false, "Иконки PWA не получены");

        Directory.CreateDirectory(_iconsDir);
        var byName = new Dictionary<string, IFormFile>(StringComparer.OrdinalIgnoreCase);
        foreach (var file in fileList)
        {
            if (file.Length == 0) continue;
            var name = ResolvePwaIconUploadName(file);
            if (name == null) continue;
            byName[name] = file;
        }

        foreach (var iconName in PwaIconFiles.All)
        {
            if (!byName.TryGetValue(iconName, out var file))
                return (false, $"Не хватает иконки {iconName}");

            var (valid, error) = await ValidatePwaIconUploadAsync(file, iconName, ct);
            if (!valid)
                return (false, error);
        }

        await _lock.WaitAsync(ct);
        try
        {
            foreach (var iconName in PwaIconFiles.All)
            {
                var file = byName[iconName];
                var dest = Path.Combine(_iconsDir, iconName);
                await using var input = file.OpenReadStream();
                await using var output = File.Create(dest);
                await input.CopyToAsync(output, ct);
            }

            var settings = await ReadRawUnlockedAsync(ct) ?? AppAppearanceDefaults.Create();
            if (!string.IsNullOrWhiteSpace(pwaIconBgColor))
            {
                settings.PwaIconBgColor = PwaIconGenerator.NormalizeBgColor(
                    pwaIconBgColor,
                    settings.Base.Accent);
            }
            settings.PwaIconSvgColor = NormalizeOptionalColor(pwaIconSvgColor);
            var json = JsonSerializer.Serialize(settings, JsonOptions);
            await File.WriteAllTextAsync(_settingsPath, json, ct);
        }
        finally
        {
            _lock.Release();
        }

        return (true, null);
    }

    static async Task<(bool ok, string? error)> ValidatePwaIconUploadAsync(
        IFormFile file,
        string expectedName,
        CancellationToken ct)
    {
        if (file.Length > 800_000)
            return (false, $"{expectedName}: файл слишком большой");

        await using var stream = file.OpenReadStream();
        await using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        ms.Position = 0;
        try
        {
            var info = await SixLabors.ImageSharp.Image.IdentifyAsync(ms, ct);
            if (info == null)
                return (false, $"{expectedName}: не PNG");
            if (!string.Equals(info.Metadata.DecodedImageFormat?.Name, "PNG", StringComparison.OrdinalIgnoreCase))
                return (false, $"{expectedName}: нужен PNG");
        }
        catch
        {
            return (false, $"{expectedName}: некорректный PNG");
        }

        return (true, null);
    }

    static string? ResolvePwaIconUploadName(IFormFile file)
    {
        var fromField = (file.Name ?? "").Trim();
        if (PwaIconFiles.All.Contains(fromField, StringComparer.OrdinalIgnoreCase))
        {
            return PwaIconFiles.All.First(n => string.Equals(n, fromField, StringComparison.OrdinalIgnoreCase));
        }

        var fromFileName = Path.GetFileName(file.FileName);
        if (!string.IsNullOrEmpty(fromFileName)
            && PwaIconFiles.All.Contains(fromFileName, StringComparer.OrdinalIgnoreCase))
        {
            return PwaIconFiles.All.First(n => string.Equals(n, fromFileName, StringComparison.OrdinalIgnoreCase));
        }

        return null;
    }

    public async Task SavePwaIconLogoAsync(Stream stream, CancellationToken ct = default)
    {
        const string fileName = "icon-logo.svg";
        var path = Path.Combine(_brandingDir, fileName);
        await _lock.WaitAsync(ct);
        try
        {
            foreach (var old in Directory.EnumerateFiles(_brandingDir, "icon-logo.*"))
            {
                if (!string.Equals(old, path, StringComparison.OrdinalIgnoreCase))
                    File.Delete(old);
            }
            await using var fs = File.Create(path);
            await stream.CopyToAsync(fs, ct);
            var settings = await ReadRawUnlockedAsync(ct) ?? AppAppearanceDefaults.Create();
            settings.PwaIconLogoFileName = fileName;
            var json = JsonSerializer.Serialize(settings, JsonOptions);
            await File.WriteAllTextAsync(_settingsPath, json, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task ClearPwaIconLogoAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            foreach (var old in Directory.EnumerateFiles(_brandingDir, "icon-logo.*"))
                File.Delete(old);

            var settings = await ReadRawUnlockedAsync(ct);
            if (settings != null)
            {
                settings.PwaIconLogoFileName = null;
                var json = JsonSerializer.Serialize(settings, JsonOptions);
                await File.WriteAllTextAsync(_settingsPath, json, ct);
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<string?> GetPwaIconBgImagePhysicalPathAsync(CancellationToken ct = default)
    {
        var settings = await ReadRawAsync(ct);
        if (settings?.PwaIconBgImageFileName == null) return null;
        var path = Path.Combine(_brandingDir, settings.PwaIconBgImageFileName);
        return File.Exists(path) ? path : null;
    }

    public async Task SavePwaIconBgImageAsync(Stream stream, string extension, CancellationToken ct = default)
    {
        extension = extension.ToLowerInvariant() switch
        {
            ".jpeg" => ".jpg",
            ".png" or ".jpg" => extension,
            _ => ".png",
        };
        var fileName = "pwa-icon-bg" + extension;
        var path = Path.Combine(_brandingDir, fileName);
        await _lock.WaitAsync(ct);
        try
        {
            foreach (var old in Directory.EnumerateFiles(_brandingDir, "pwa-icon-bg.*"))
            {
                if (!string.Equals(old, path, StringComparison.OrdinalIgnoreCase))
                    File.Delete(old);
            }
            await using var fs = File.Create(path);
            await stream.CopyToAsync(fs, ct);
            var settings = await ReadRawUnlockedAsync(ct) ?? AppAppearanceDefaults.Create();
            settings.PwaIconBgImageFileName = fileName;
            var json = JsonSerializer.Serialize(settings, JsonOptions);
            await File.WriteAllTextAsync(_settingsPath, json, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task ClearPwaIconBgImageAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            foreach (var old in Directory.EnumerateFiles(_brandingDir, "pwa-icon-bg.*"))
                File.Delete(old);

            var settings = await ReadRawUnlockedAsync(ct);
            if (settings != null)
            {
                settings.PwaIconBgImageFileName = null;
                var json = JsonSerializer.Serialize(settings, JsonOptions);
                await File.WriteAllTextAsync(_settingsPath, json, ct);
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<string?> GetThemeChatBgImagePhysicalPathAsync(string themeName, CancellationToken ct = default)
    {
        var settings = await ReadRawAsync(ct);
        var theme = FindTheme(settings?.Themes, themeName);
        if (theme?.ChatBgImageFileName == null) return null;
        return ResolveThemeChatBgImagePhysicalPath(theme.ChatBgImageFileName, settings);
    }

    public async Task<string?> GetThemeChatBgImagePhysicalPathByFileNameAsync(
        string fileName,
        CancellationToken ct = default)
    {
        var settings = await ReadRawAsync(ct);
        return ResolveThemeChatBgImagePhysicalPath(fileName, settings);
    }

    string? ResolveThemeChatBgImagePhysicalPath(string? fileName, AppAppearanceSettings? settings)
    {
        if (string.IsNullOrWhiteSpace(fileName)
            || fileName.Contains('/') || fileName.Contains('\\')
            || !fileName.StartsWith("chat-bg-", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (settings?.Themes == null
            || !settings.Themes.Any(t =>
                string.Equals(t.ChatBgImageFileName, fileName, StringComparison.OrdinalIgnoreCase)))
        {
            return null;
        }

        var path = Path.Combine(_brandingDir, fileName);
        return File.Exists(path) ? path : null;
    }

    public async Task<(bool ok, string? error)> SaveThemeChatBgImageAsync(
        string themeName,
        Stream stream,
        string extension,
        CancellationToken ct = default)
    {
        themeName = (themeName ?? "").Trim();
        if (string.IsNullOrEmpty(themeName))
            return (false, "Укажите тему");

        extension = extension.ToLowerInvariant() switch
        {
            ".jpeg" => ".jpg",
            ".png" or ".jpg" => extension,
            _ => ".png",
        };

        await _lock.WaitAsync(ct);
        try
        {
            var settings = await ReadRawUnlockedAsync(ct) ?? AppAppearanceDefaults.Create();
            var theme = FindTheme(settings.Themes, themeName);
            if (theme == null)
                return (false, "Тема не найдена");

            var fileName = $"chat-bg-{ThemeChatBgSlug(themeName)}{extension}";
            var path = Path.Combine(_brandingDir, fileName);

            if (!string.IsNullOrEmpty(theme.ChatBgImageFileName))
                DeleteBrandingFileIfExists(theme.ChatBgImageFileName);

            foreach (var old in Directory.EnumerateFiles(_brandingDir, $"chat-bg-{ThemeChatBgSlug(themeName)}.*"))
            {
                if (!string.Equals(old, path, StringComparison.OrdinalIgnoreCase))
                    File.Delete(old);
            }

            await using var fs = File.Create(path);
            await stream.CopyToAsync(fs, ct);
            theme.ChatBgImageFileName = fileName;
            var json = JsonSerializer.Serialize(settings, JsonOptions);
            await File.WriteAllTextAsync(_settingsPath, json, ct);
            return (true, null);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<(bool ok, string? error)> ClearThemeChatBgImageAsync(string themeName, CancellationToken ct = default)
    {
        themeName = (themeName ?? "").Trim();
        if (string.IsNullOrEmpty(themeName))
            return (false, "Укажите тему");

        await _lock.WaitAsync(ct);
        try
        {
            var settings = await ReadRawUnlockedAsync(ct);
            if (settings == null) return (true, null);

            var theme = FindTheme(settings.Themes, themeName);
            if (theme == null)
                return (false, "Тема не найдена");

            if (!string.IsNullOrEmpty(theme.ChatBgImageFileName))
            {
                DeleteBrandingFileIfExists(theme.ChatBgImageFileName);
                theme.ChatBgImageFileName = null;
                var json = JsonSerializer.Serialize(settings, JsonOptions);
                await File.WriteAllTextAsync(_settingsPath, json, ct);
            }

            return (true, null);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<string?> GetPwaIconLogoPhysicalPathAsync(CancellationToken ct = default)
    {
        var settings = await ReadRawAsync(ct);
        if (settings?.PwaIconLogoFileName == null) return null;
        var path = Path.Combine(_brandingDir, settings.PwaIconLogoFileName);
        return File.Exists(path) ? path : null;
    }

    public string? GetCustomPwaIconPhysicalPath(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains('/') || fileName.Contains('\\'))
            return null;
        var path = Path.Combine(_iconsDir, fileName);
        return File.Exists(path) ? path : null;
    }

    public bool HasCustomPwaIcons() =>
        PwaIconFiles.All.All(f => File.Exists(Path.Combine(_iconsDir, f)));

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
        defaults.PwaIconLogoFileName = current?.PwaIconLogoFileName;
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
        defaults.PwaIconBgColor = current?.PwaIconBgColor;
        defaults.PwaIconBgImageFileName = current?.PwaIconBgImageFileName;
        defaults.LogoSvgColor = current?.LogoSvgColor;
        defaults.PwaIconSvgColor = current?.PwaIconSvgColor;
        ClearAllThemeChatBgImages(current);
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
        logoSvgColor = NormalizeOptionalColor(s.LogoSvgColor),
        pwaIconLogoUrl = string.IsNullOrEmpty(s.PwaIconLogoFileName) ? null : "/api/app/pwa-icon-logo",
        pwaIconBgColor = PwaIconGenerator.NormalizeBgColor(s.PwaIconBgColor, s.Base.Accent),
        pwaIconBgImageUrl = string.IsNullOrEmpty(s.PwaIconBgImageFileName)
            ? null
            : "/api/app/pwa-icon-bg-image",
        pwaIconSvgColor = NormalizeOptionalColor(s.PwaIconSvgColor),
        pwaIcons = BuildPwaIconsDto(s),
        incomingMessageSoundUrl = string.IsNullOrEmpty(s.IncomingMessageSoundFileName)
            ? null
            : "/api/app/sound/incoming",
        outgoingMessageSoundUrl = string.IsNullOrEmpty(s.OutgoingMessageSoundFileName)
            ? null
            : "/api/app/sound/outgoing",
        defaultThemeName = s.DefaultThemeName,
        useThemeChatBg = s.UseThemeChatBg ?? true,
        enableGroupEncryption = s.EnableGroupEncryption ?? false,
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
        themes = s.Themes.Select(t => ToThemeDto(t)).ToList(),
    };
    }

    public object ToThemeDto(AppThemeSettings t)
    {
        string? chatBgImageUrl = null;
        if (!string.IsNullOrEmpty(t.ChatBgImageFileName))
        {
            var path = Path.Combine(_brandingDir, t.ChatBgImageFileName);
            chatBgImageUrl = BuildThemeChatBgImageUrl(t.ChatBgImageFileName, path);
        }

        return new
    {
        name = t.Name,
        bodyBg = t.BodyBg,
        headerBg = t.HeaderBg,
        chatBg = t.ChatBg,
        chatBgImageFileName = t.ChatBgImageFileName,
        chatBgImageUrl,
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
    }

    public static string BuildThemeChatBgImageUrl(string fileName, string? physicalPath = null)
    {
        var url = $"/api/app/theme-chat-bg-image?f={Uri.EscapeDataString(fileName)}";
        if (!string.IsNullOrEmpty(physicalPath) && File.Exists(physicalPath))
            url += $"&r={File.GetLastWriteTimeUtc(physicalPath).Ticks}";
        return url;
    }

    public static bool IsSvgLogoFile(string? logoFileName) =>
        !string.IsNullOrEmpty(logoFileName)
        && logoFileName.EndsWith(".svg", StringComparison.OrdinalIgnoreCase);

    object? BuildPwaIconsDto(AppAppearanceSettings s)
    {
        if (!HasCustomPwaIcons()) return null;
        return new
        {
            icon192 = PwaIconFiles.ApiUrl(PwaIconFiles.Icon192),
            icon512 = PwaIconFiles.ApiUrl(PwaIconFiles.Icon512),
            iconMaskable512 = PwaIconFiles.ApiUrl(PwaIconFiles.IconMaskable512),
            appleTouch180 = PwaIconFiles.ApiUrl(PwaIconFiles.AppleTouch180),
            badge72 = PwaIconFiles.ApiUrl(PwaIconFiles.Badge72),
        };
    }

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

    public static string? NormalizeOptionalColor(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = PwaIconGenerator.NormalizeBgColor(value, "#000000");
        return System.Text.RegularExpressions.Regex.IsMatch(normalized, "^#[0-9a-f]{6}$")
            ? normalized
            : null;
    }

    /// <summary>Фон активной темы для PWA status bar (meta theme-color / manifest).</summary>
    public static string ResolvePwaStatusBarColor(AppAppearanceSettings s, string fallback = "#e8eaed")
    {
        var defaultName = (s.DefaultThemeName ?? "").Trim();
        var theme = s.Themes?.FirstOrDefault(t =>
            string.Equals(t.Name, defaultName, StringComparison.Ordinal))
            ?? s.Themes?.FirstOrDefault();
        var color = theme?.BodyBg;
        if (string.IsNullOrWhiteSpace(color))
            color = theme?.HeaderBg;
        if (string.IsNullOrWhiteSpace(color))
            color = s.Base.ContentBg;
        var v = (color ?? "").Trim();
        return string.IsNullOrEmpty(v) ? fallback : v;
    }

    static string NormalizeLogoExtension(string ext)
    {
        ext = (ext ?? "").Trim().ToLowerInvariant();
        return ext == ".svg" ? ext : ".svg";
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

    static AppThemeSettings? FindTheme(List<AppThemeSettings>? themes, string themeName)
    {
        if (themes == null || string.IsNullOrWhiteSpace(themeName)) return null;
        return themes.FirstOrDefault(t =>
            string.Equals(t.Name, themeName.Trim(), StringComparison.Ordinal));
    }

    static string ThemeChatBgSlug(string themeName)
    {
        var bytes = Encoding.UTF8.GetBytes(themeName.Trim());
        return Convert.ToHexString(SHA256.HashData(bytes))[..16].ToLowerInvariant();
    }

    void DeleteBrandingFileIfExists(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)
            || fileName.Contains('/') || fileName.Contains('\\'))
            return;
        var path = Path.Combine(_brandingDir, fileName);
        if (File.Exists(path))
            File.Delete(path);
    }

    void ClearAllThemeChatBgImages(AppAppearanceSettings? settings)
    {
        if (settings?.Themes == null) return;
        foreach (var theme in settings.Themes)
        {
            if (!string.IsNullOrEmpty(theme.ChatBgImageFileName))
                DeleteBrandingFileIfExists(theme.ChatBgImageFileName);
        }
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
    public string? PwaIconBgColor { get; set; }
    public string? LogoSvgColor { get; set; }
    public string? PwaIconSvgColor { get; set; }
    public string? DefaultThemeName { get; set; }
    public bool? UseThemeChatBg { get; set; }
    public bool? EnableGroupEncryption { get; set; }
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
