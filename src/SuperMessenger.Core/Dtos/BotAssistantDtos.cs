namespace SuperMessenger.Core.Dtos;

public sealed class BotAssistantForwardedMessageDto
{
    public string text { get; set; } = "";
    public string? senderName { get; set; }
    public string? originalMessageId { get; set; }
    public List<string> attachmentFileIds { get; set; } = [];
}

public sealed class BotAssistantSessionDto
{
    public string sessionId { get; set; } = "";
    public string command { get; set; } = "";
    public List<BotAssistantForwardedMessageDto> forwardedMessages { get; set; } = [];
}

public sealed class BotAssistantReplyMetaDto
{
    public string sessionId { get; set; } = "";
    public string sourceChatId { get; set; } = "";
    public string? sourceChatName { get; set; }
    public string botUserId { get; set; } = "";
    public string botName { get; set; } = "";
}

public sealed class BotApiAssistantReplyResponse
{
    public bool success { get; set; }
    public string? messageId { get; set; }
    public string? chatId { get; set; }
    public string? sessionId { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiGetAssistantMenuResponse
{
    public bool success { get; set; }
    public BotApiMenuDto? menu { get; set; }
    public string? chatId { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiSetAssistantMenuResponse
{
    public bool success { get; set; }
    public BotApiMenuDto? menu { get; set; }
    public string? chatId { get; set; }
    public string? error { get; set; }
}

public sealed class SupraAssistantInvokeMessageDto
{
    public string text { get; set; } = "";
    public string? senderName { get; set; }
    public string? originalMessageId { get; set; }
    public List<string> attachmentFileIds { get; set; } = [];
}

public sealed class SupraAddBotAssistantResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class SupraRemoveBotAssistantResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class SupraBotAssistantListItemDto
{
    public string botUserId { get; set; } = "";
    public string name { get; set; } = "";
    public string slug { get; set; } = "";
    public string? avatar { get; set; }
    public BotApiMenuDto? assistantMenu { get; set; }
    public string? botChatId { get; set; }
}

public sealed class SupraGetBotAssistantsResponse
{
    public bool success { get; set; }
    public List<SupraBotAssistantListItemDto> assistants { get; set; } = [];
    public string? error { get; set; }
}

public sealed class SupraInvokeBotAssistantResponse
{
    public bool success { get; set; }
    public string? sessionId { get; set; }
    public string? botChatId { get; set; }
    public SupraWsNewMessagePayload? message { get; set; }
    public string? error { get; set; }
}

public sealed class SupraConfirmAssistantReplyResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class SupraDismissAssistantReplyResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class SupraPendingAssistantReplyDto
{
    public string sessionId { get; set; } = "";
    public string sourceChatId { get; set; } = "";
    public string? sourceChatName { get; set; }
    public string botUserId { get; set; } = "";
    public string botName { get; set; } = "";
    public string botMessageId { get; set; } = "";
    public string text { get; set; } = "";
    public List<string> attachmentFileIds { get; set; } = [];
    public DateTime repliedOn { get; set; }
}

public sealed class SupraGetPendingAssistantRepliesResponse
{
    public bool success { get; set; }
    public List<SupraPendingAssistantReplyDto> replies { get; set; } = [];
    public string? error { get; set; }
}

public sealed class SupraWsAssistantReplyPendingPayload
{
    public string type { get; set; } = "SupraAssistantReplyPending";
    public string sessionId { get; set; } = "";
    public string sourceChatId { get; set; } = "";
    public string? sourceChatName { get; set; }
    public string botUserId { get; set; } = "";
    public string botName { get; set; } = "";
    public string botMessageId { get; set; } = "";
    public string text { get; set; } = "";
    public List<string> attachmentFileIds { get; set; } = [];
    public DateTime repliedOn { get; set; }
}

public sealed class SupraWsBotAssistantUpdatedPayload
{
    public string type { get; set; } = "SupraBotAssistantUpdated";
    public string botUserId { get; set; } = "";
    public BotApiMenuDto? assistantMenu { get; set; }
    public string? chatId { get; set; }
}
