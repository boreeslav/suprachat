namespace SuperMessenger.Core.Dtos;

public sealed class BotMessageButtonDto
{
    public string? id { get; set; }
    public string text { get; set; } = "";
    public string action { get; set; } = "";
    public string? color { get; set; }
}

public sealed class BotMessageButtonPressDto
{
    public string sourceMessageId { get; set; } = "";
    public string buttonId { get; set; } = "";
    public string action { get; set; } = "";
}

public sealed class SupraPressMessageButtonResponse
{
    public bool success { get; set; }
    public string? messageId { get; set; }
    public string? text { get; set; }
    public string? replyToMessageId { get; set; }
    public string? replyToSenderName { get; set; }
    public string? replyToTextPreview { get; set; }
    public string? status { get; set; }
    public string? error { get; set; }
}
