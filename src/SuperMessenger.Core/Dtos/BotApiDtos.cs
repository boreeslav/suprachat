namespace SuperMessenger.Core.Dtos;

public sealed class BotApiMessageDto
{
    public string id { get; set; } = "";
    public string messageId { get; set; } = "";
    public string chatId { get; set; } = "";
    public string chatType { get; set; } = "";
    public string? chatName { get; set; }
    public string senderId { get; set; } = "";
    public string senderLogin { get; set; } = "";
    public string senderName { get; set; } = "";
    public string text { get; set; } = "";
    public DateTime timestamp { get; set; }
}

public sealed class BotApiSendMessageResponse
{
    public bool success { get; set; }
    public string? messageId { get; set; }
    public string? chatId { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiGetMessagesResponse
{
    public bool success { get; set; }
    public List<BotApiMessageDto> messages { get; set; } = [];
    public string? error { get; set; }
}

public sealed class BotApiMeResponse
{
    public bool success { get; set; }
    public string? botUserId { get; set; }
    public string? login { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiWsEnvelope
{
    public string type { get; set; } = "";
    public BotApiMessageDto? update { get; set; }
    public string? botUserId { get; set; }
    public string? error { get; set; }
}
