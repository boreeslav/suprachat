namespace SuperMessenger.Core.Dtos;

public sealed class BotMiniAppFileDto
{
    public string path { get; set; } = "";
    public string fileId { get; set; } = "";
}

public sealed class BotMiniAppManifestDto
{
    public string title { get; set; } = "";
    public string entry { get; set; } = "index.html";
    public List<BotMiniAppFileDto> files { get; set; } = [];
    public string? bundleHash { get; set; }
    public object? initData { get; set; }
    public bool autoOpen { get; set; }
    public bool reusable { get; set; } = true;
    /// <summary>null / пусто — основной домен мессенджера.</summary>
    public string? baseOrigin { get; set; }
}

public sealed class BotApiSendMiniAppResponse
{
    public bool success { get; set; }
    public string? messageId { get; set; }
    public string? chatId { get; set; }
    public string? error { get; set; }
}

public sealed class BotWebAppDataDto
{
    public string sourceMessageId { get; set; } = "";
    public string miniAppMessageId { get; set; } = "";
    /// <summary>Токен активной сессии mini app — для ответа через sendWebAppData.</summary>
    public string? sessionToken { get; set; }
    public string? payloadJson { get; set; }
}

public sealed class BotApiSendWebAppDataResponse
{
    public bool success { get; set; }
    public long seq { get; set; }
    public string? error { get; set; }
}

public sealed class MiniAppChannelMessageDto
{
    public long seq { get; set; }
    public string payloadJson { get; set; } = "";
    public string timestamp { get; set; } = "";
}

public sealed class MiniAppPollResponseDto
{
    public bool success { get; set; }
    public List<MiniAppChannelMessageDto> messages { get; set; } = [];
    public long lastSeq { get; set; }
    public string? error { get; set; }
}

public sealed class MiniAppSessionRequestDto
{
    public string? messageId { get; set; }
}

public sealed class MiniAppSessionResponseDto
{
    public bool success { get; set; }
    public string? token { get; set; }
    public string? expiresAt { get; set; }
    public string? title { get; set; }
    public string? baseOrigin { get; set; }
    public string? error { get; set; }
}

public sealed class MiniAppDataRequestDto
{
    public string? token { get; set; }
    public object? payload { get; set; }
}

public sealed class MiniAppDataResponseDto
{
    public bool success { get; set; }
    public string? error { get; set; }
}
