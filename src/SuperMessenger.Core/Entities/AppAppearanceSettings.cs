namespace SuperMessenger.Core.Entities;

/// <summary>
/// Global app branding and theme customization (admin-editable).
/// </summary>
public sealed class AppAppearanceSettings
{
    public string AppName { get; set; } = "SuperMessenger";
    public string AppDescription { get; set; } = "Корпоративный мессенджер для обмена сообщениями и файлами.";
    public string AppTagline { get; set; } = "Безопасное общение в одном месте";
    public string RegisterWelcome { get; set; } = "Добро пожаловать! Заполните форму, чтобы создать учётную запись.";
    public string AppVersion { get; set; } = "1.0.0";
    /// <summary>HTML shown on master-password screen after login.</summary>
    public string LoginWelcomeHtml { get; set; } = "";
    /// <summary>HTML for Settings → About.</summary>
    public string AboutHtml { get; set; } = "";
    /// <summary>HTML for Settings → Help.</summary>
    public string HelpHtml { get; set; } = "";
    /// <summary>HTML changelog opened from version link in About.</summary>
    public string ChangelogHtml { get; set; } = "";
    /// <summary>HTML for startup splash screen (index.html).</summary>
    public string SplashHtml { get; set; } = "";
    /// <summary>CSS for startup splash screen.</summary>
    public string SplashCss { get; set; } = "";
    /// <summary>JavaScript function body run on sidebar logo click; receives clickCount and showNotice.</summary>
    public string LogoClickScript { get; set; } = "";
    public string? LogoFileName { get; set; }
    /// <summary>Optional separate SVG for PWA icons; falls back to LogoFileName.</summary>
    public string? PwaIconLogoFileName { get; set; }
    /// <summary>Background color for PWA icons when no background image is set.</summary>
    public string? PwaIconBgColor { get; set; }
    /// <summary>Optional PNG/JPEG background for PWA icons (under branding dir).</summary>
    public string? PwaIconBgImageFileName { get; set; }
    /// <summary>Override fill color for main SVG logo in UI (empty = original).</summary>
    public string? LogoSvgColor { get; set; }
    /// <summary>Override fill color for SVG on PWA icons (empty = original).</summary>
    public string? PwaIconSvgColor { get; set; }
    /// <summary>Uploaded file name for incoming message sound (under branding dir).</summary>
    public string? IncomingMessageSoundFileName { get; set; }
    /// <summary>Uploaded file name for outgoing message sound (under branding dir).</summary>
    public string? OutgoingMessageSoundFileName { get; set; }
    public string DefaultThemeName { get; set; } = "Светлая";
    /// <summary>When false, chat area does not use theme chatBg color or wallpaper.</summary>
    public bool? UseThemeChatBg { get; set; } = true;
    /// <summary>When true, group chats use E2E encryption (auto keys, extra password UI). Default on.</summary>
    public bool? EnableGroupEncryption { get; set; } = true;
    public AppBaseColors Base { get; set; } = new();
    public List<AppThemeSettings> Themes { get; set; } = [];
}

public sealed class AppBaseColors
{
    public string Accent { get; set; } = "#4a7fc1";
    public string SidebarBg { get; set; } = "#ffffff";
    public string ContentBg { get; set; } = "#f0f2f5";
    public string Text { get; set; } = "#1c1c1e";
    public string SubText { get; set; } = "#8e8e93";
    public string Border { get; set; } = "rgba(0,0,0,.08)";
    public string Hover { get; set; } = "rgba(0,0,0,.05)";
}

public sealed class AppThemeSettings
{
    public string Name { get; set; } = "";
    public string BodyBg { get; set; } = "#e8eaed";
    public string HeaderBg { get; set; } = "#ffffff";
    public string ChatBg { get; set; } = "#f0f2f5";
    /// <summary>Optional PNG/JPEG wallpaper for the chat messages area (under branding dir).</summary>
    public string? ChatBgImageFileName { get; set; }
    public string MyBubbleBg { get; set; } = "#4a7fc1";
    public string MyBubbleText { get; set; } = "#ffffff";
    public string OtherBubbleBg { get; set; } = "#ffffff";
    public string OtherBubbleText { get; set; } = "#1c1c1e";
    public string Accent { get; set; } = "#4a7fc1";
    public string InputBg { get; set; } = "#ffffff";
    public string InputFieldBg { get; set; } = "#f0f2f5";
    public string InputFieldBorder { get; set; } = "rgba(0,0,0,.1)";
    public string InputText { get; set; } = "#1c1c1e";
    public string InputPlaceholder { get; set; } = "#aaaaaa";
    public string HeaderText { get; set; } = "#1c1c1e";
    public string HeaderSubText { get; set; } = "#8e8e93";
    public string HeaderBorder { get; set; } = "rgba(0,0,0,.08)";
    public string InputAreaBorder { get; set; } = "rgba(0,0,0,.07)";
    public string ScrollThumb { get; set; } = "rgba(0,0,0,.15)";
    public string SenderName { get; set; } = "#4a7fc1";
    public string MenuBg { get; set; } = "#ffffff";
    public string MenuText { get; set; } = "#1c1c1e";
    public string MenuBorder { get; set; } = "rgba(0,0,0,.1)";
    public string MenuHover { get; set; } = "rgba(0,0,0,.05)";
    public string DotsColor { get; set; } = "#555555";
}
