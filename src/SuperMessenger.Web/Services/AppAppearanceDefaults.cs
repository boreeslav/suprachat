using SuperMessenger.Core.Entities;

namespace SuperMessenger.Web.Services;

public static class AppAppearanceDefaults
{
    public const string SplashHtml =
        "<div class=\"sm-splash-inner\">" +
        "<img class=\"sm-splash-logo\" data-app-logo alt=\"\" hidden/>" +
        "<div class=\"sm-splash-logo-fallback\" data-app-name></div>" +
        "<div class=\"sm-splash-app-name\" data-app-name></div>" +
        "</div>";

    /// <summary>Splash HTML before rev 5 (hardcoded SuperMessenger placeholder text).</summary>
    public const string LegacySplashHtmlRev4 =
        "<div class=\"sm-splash-inner\">" +
        "<img class=\"sm-splash-logo\" data-app-logo alt=\"\" hidden/>" +
        "<div class=\"sm-splash-logo-fallback\" data-app-name>SuperMessenger</div>" +
        "<div class=\"sm-splash-app-name\" data-app-name>SuperMessenger</div>" +
        "</div>";

    /// <summary>Splash HTML before rev 4 (no app name caption under logo).</summary>
    public const string LegacySplashHtmlRev3 =
        "<div class=\"sm-splash-inner\">" +
        "<img class=\"sm-splash-logo\" data-app-logo alt=\"\" hidden/>" +
        "<div class=\"sm-splash-logo-fallback\" data-app-name>SuperMessenger</div>" +
        "</div>";

    /// <summary>Splash HTML before rev 3 (preset logo src triggered early 404 / blank img).</summary>
    public const string LegacySplashHtml =
        "<div class=\"sm-splash-inner\">" +
        "<img class=\"sm-splash-logo\" data-app-logo src=\"/api/app/logo\" alt=\"\" hidden/>" +
        "<div class=\"sm-splash-logo-fallback\" data-app-name>SuperMessenger</div>" +
        "</div>";

    public const string SplashCss = """
        .sm-splash-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483646;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
          touch-action: none;
        }
        .sm-splash-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
          padding: 24px;
        }
        .sm-splash-logo {
          display: block;
          width: min(50vw, 240px);
          height: auto;
          object-fit: contain;
        }
        .sm-splash-overlay.sm-splash-animate .sm-splash-logo {
          animation: sm-splash-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sm-splash-logo[hidden] {
          display: none !important;
        }
        .sm-splash-logo-fallback {
          font-size: 28px;
          font-weight: 700;
          color: #1c1c1e;
          letter-spacing: -0.02em;
        }
        .sm-splash-overlay.sm-splash-animate .sm-splash-logo-fallback {
          animation: sm-splash-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sm-splash-logo.sm-splash-logo-ready + .sm-splash-logo-fallback { display: none; }
        .sm-splash-app-name {
          display: none;
          font-size: 20px;
          font-weight: 600;
          color: #1c1c1e;
          letter-spacing: -0.01em;
        }
        .sm-splash-overlay.sm-splash-animate .sm-splash-app-name {
          animation: sm-splash-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sm-splash-inner:has(.sm-splash-logo.sm-splash-logo-ready) .sm-splash-app-name {
          display: block;
        }
        @keyframes sm-splash-rise {
          from { transform: translateY(120vh); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .sm-splash-overlay.sm-splash-hiding {
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
        }
        """;

    /// <summary>Splash CSS shipped in rev 3 (logo ready class, no app name caption).</summary>
    public const string LegacySplashCssRev3 = """
        .sm-splash-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483646;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
          touch-action: none;
        }
        .sm-splash-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
          padding: 24px;
        }
        .sm-splash-logo {
          display: block;
          width: min(50vw, 240px);
          height: auto;
          object-fit: contain;
          animation: sm-splash-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sm-splash-logo[hidden] {
          display: none !important;
        }
        .sm-splash-logo-fallback {
          font-size: 28px;
          font-weight: 700;
          color: #1c1c1e;
          letter-spacing: -0.02em;
          animation: sm-splash-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sm-splash-logo.sm-splash-logo-ready + .sm-splash-logo-fallback { display: none; }
        @keyframes sm-splash-rise {
          from { transform: translateY(120vh); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .sm-splash-overlay.sm-splash-hiding {
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
        }
        """;

    /// <summary>Splash CSS shipped in rev 2 (50vw logo, fallback hidden before load).</summary>
    public const string LegacySplashCssRev2 = """
        .sm-splash-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483646;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
          touch-action: none;
        }
        .sm-splash-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
          padding: 24px;
        }
        .sm-splash-logo {
          width: 50vw;
          max-width: 240px;
          height: auto;
          object-fit: contain;
          animation: sm-splash-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sm-splash-logo-fallback {
          font-size: 28px;
          font-weight: 700;
          color: #1c1c1e;
          letter-spacing: -0.02em;
          animation: sm-splash-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sm-splash-logo:not([hidden]) + .sm-splash-logo-fallback { display: none; }
        @keyframes sm-splash-rise {
          from { transform: translateY(120vh); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .sm-splash-overlay.sm-splash-hiding {
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
        }
        """;

    /// <summary>Splash CSS shipped before rev 2 (gray background, fixed 96px logo).</summary>
    public const string LegacySplashCssRev1 = """
        .sm-splash-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483646;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f2f5;
          overflow: hidden;
          touch-action: none;
        }
        .sm-splash-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
          padding: 24px;
        }
        .sm-splash-logo {
          width: 96px;
          height: 96px;
          object-fit: contain;
          animation: sm-splash-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sm-splash-logo-fallback {
          font-size: 28px;
          font-weight: 700;
          color: #1c1c1e;
          letter-spacing: -0.02em;
          animation: sm-splash-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sm-splash-logo:not([hidden]) + .sm-splash-logo-fallback { display: none; }
        @keyframes sm-splash-rise {
          from { transform: translateY(120vh); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .sm-splash-overlay.sm-splash-hiding {
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
        }
        """;

    public static AppAppearanceSettings Create() => new()
    {
        AppName = "Supra Messenger",
        AppDescription = "Защищённый корпоративный мессенджер для личной и групповой переписки.",
        AppTagline = "Безопасное общение в одном месте",
        RegisterWelcome = "Добро пожаловать! Заполните форму, чтобы создать учётную запись.",
        AppVersion = "1.0",
        LoginWelcomeHtml = "<p>Добро пожаловать в <strong>{{appName}}</strong>. " +
            "Для доступа к зашифрованным сообщениям введите мастер-пароль шифрования.</p>",
        AboutHtml = "<p><strong>{{appName}}</strong> — защищённый корпоративный мессенджер для личной и групповой переписки.</p>" +
            "<p>Сообщения шифруются на вашем устройстве (end-to-end). Поддерживаются файлы, папки чатов, статус «в сети», push-уведомления и установка как приложение (PWA).</p>" +
            "<p>Номер версии: базовая линия <strong>1.1</strong>, каждый деплой увеличивает патч — <strong>1.1.1</strong>, <strong>1.1.2</strong> и т.д. Нажмите на версию, чтобы открыть историю изменений.</p>",
        HelpHtml = "<p>Нужна помощь? Напишите администратору сервиса или в службу поддержки вашей организации.</p>",
        ChangelogHtml = "<h3>1.0</h3><ul><li>Первый релиз мессенджера</li><li>Шифрование личных и групповых чатов</li><li>Темы оформления и брендинг</li></ul>",
        SplashHtml = SplashHtml,
        SplashCss = SplashCss,
        LogoClickScript = """
            if (clickCount === 5) {
              showNotice('Вы нашли пасхалку! Спасибо, что пользуетесь нашим мессенджером.', 'Отлично!');
            }
            """,
        DefaultThemeName = "Светлая",
        Base = new AppBaseColors(),
        Themes =
        [
            Theme("Светлая", "#e8eaed", "#ffffff", "#f0f2f5", "#4a7fc1", "#ffffff", "#ffffff", "#1c1c1e", "#4a7fc1",
                "#ffffff", "#f0f2f5", "rgba(0,0,0,.1)", "#1c1c1e", "#aaaaaa", "#1c1c1e", "#8e8e93",
                "rgba(0,0,0,.08)", "rgba(0,0,0,.07)", "rgba(0,0,0,.15)", "#4a7fc1", "#ffffff", "#1c1c1e",
                "rgba(0,0,0,.1)", "rgba(0,0,0,.05)", "#555"),
            Theme("Зелёная", "#dde8e0", "#f4faf6", "#e4ede7", "#2d8a60", "#ffffff", "#ffffff", "#1a2e24", "#2d8a60",
                "#f4faf6", "#e4ede7", "rgba(0,0,0,.1)", "#1a2e24", "#8aab97", "#1a2e24", "#6a9b80",
                "rgba(0,0,0,.07)", "rgba(0,0,0,.06)", "rgba(0,0,0,.12)", "#2d8a60", "#ffffff", "#1a2e24",
                "rgba(0,0,0,.1)", "rgba(0,0,0,.05)", "#555"),
            Theme("Сиреневая", "#ddd8ea", "#f8f6ff", "#ede9f8", "#7c5cbf", "#ffffff", "#ffffff", "#1e1a2e", "#7c5cbf",
                "#f8f6ff", "#ede9f8", "rgba(0,0,0,.1)", "#1e1a2e", "#9d8fbf", "#1e1a2e", "#8a7aaa",
                "rgba(0,0,0,.07)", "rgba(0,0,0,.06)", "rgba(0,0,0,.12)", "#7c5cbf", "#ffffff", "#1e1a2e",
                "rgba(0,0,0,.1)", "rgba(0,0,0,.05)", "#555"),
            Theme("Тёмная", "#18191c", "#242526", "#18191c", "#3a7bd5", "#ffffff", "#2e2f33", "#e4e6eb", "#3a7bd5",
                "#242526", "#3a3b3c", "rgba(255,255,255,.08)", "#e4e6eb", "#6b6c6f", "#e4e6eb", "#6b6c6f",
                "rgba(255,255,255,.06)", "rgba(255,255,255,.06)", "rgba(255,255,255,.12)", "#5b9bd5", "#2e2f33", "#e4e6eb",
                "rgba(255,255,255,.1)", "rgba(255,255,255,.07)", "#aaa"),
            Theme("Тёмно-зелёная", "#111a14", "#1a2620", "#111a14", "#1f8c5a", "#ffffff", "#1e2d25", "#cde8d8", "#1f8c5a",
                "#1a2620", "#243328", "rgba(255,255,255,.07)", "#cde8d8", "#4d7a5e", "#cde8d8", "#4d7a5e",
                "rgba(255,255,255,.05)", "rgba(255,255,255,.05)", "rgba(255,255,255,.1)", "#3ec87a", "#1e2d25", "#cde8d8",
                "rgba(255,255,255,.08)", "rgba(255,255,255,.07)", "#8ab8a0"),
            Theme("Тёмно-фиолетовая", "#12101a", "#1c1828", "#12101a", "#6b4fcf", "#ffffff", "#201d30", "#d8d0f0", "#6b4fcf",
                "#1c1828", "#28223c", "rgba(255,255,255,.07)", "#d8d0f0", "#6a5e8a", "#d8d0f0", "#6a5e8a",
                "rgba(255,255,255,.05)", "rgba(255,255,255,.05)", "rgba(255,255,255,.1)", "#a07aff", "#201d30", "#d8d0f0",
                "rgba(255,255,255,.08)", "rgba(255,255,255,.07)", "#a090cc"),
            Theme("Тёмно-синяя", "#0d1117", "#161b22", "#0d1117", "#1f6feb", "#ffffff", "#21262d", "#c9d1d9", "#1f6feb",
                "#161b22", "#21262d", "rgba(255,255,255,.08)", "#c9d1d9", "#484f58", "#c9d1d9", "#484f58",
                "rgba(255,255,255,.06)", "rgba(255,255,255,.06)", "rgba(255,255,255,.1)", "#58a6ff", "#21262d", "#c9d1d9",
                "rgba(255,255,255,.1)", "rgba(255,255,255,.07)", "#8b949e"),
        ],
    };

    static AppThemeSettings Theme(
        string name,
        string bodyBg, string headerBg, string chatBg,
        string myBubbleBg, string myBubbleText, string otherBubbleBg, string otherBubbleText, string accent,
        string inputBg, string inputFieldBg, string inputFieldBorder, string inputText, string inputPlaceholder,
        string headerText, string headerSubText, string headerBorder, string inputAreaBorder, string scrollThumb,
        string senderName, string menuBg, string menuText, string menuBorder, string menuHover, string dotsColor) =>
        new()
        {
            Name = name,
            BodyBg = bodyBg,
            HeaderBg = headerBg,
            ChatBg = chatBg,
            MyBubbleBg = myBubbleBg,
            MyBubbleText = myBubbleText,
            OtherBubbleBg = otherBubbleBg,
            OtherBubbleText = otherBubbleText,
            Accent = accent,
            InputBg = inputBg,
            InputFieldBg = inputFieldBg,
            InputFieldBorder = inputFieldBorder,
            InputText = inputText,
            InputPlaceholder = inputPlaceholder,
            HeaderText = headerText,
            HeaderSubText = headerSubText,
            HeaderBorder = headerBorder,
            InputAreaBorder = inputAreaBorder,
            ScrollThumb = scrollThumb,
            SenderName = senderName,
            MenuBg = menuBg,
            MenuText = menuText,
            MenuBorder = menuBorder,
            MenuHover = menuHover,
            DotsColor = dotsColor,
        };
}
