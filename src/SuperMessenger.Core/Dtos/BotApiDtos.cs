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
    /// <summary>Сообщение из зашифрованной группы (пер-групповой переключатель включён).</summary>
    public bool encryptionEnabled { get; set; }
    /// <summary>text | image | photo_album | file</summary>
    public string contentType { get; set; } = "text";
    public string? caption { get; set; }
    public List<BotApiFileAttachmentDto> attachments { get; set; } = [];
    public DateTime timestamp { get; set; }
    public string? replyToMessageId { get; set; }
    public string? replyToSenderName { get; set; }
    public string? replyToTextPreview { get; set; }
    public BotMessageButtonPressDto? buttonPress { get; set; }
    public BotAssistantSessionDto? assistantSession { get; set; }
    public BotWebAppDataDto? webAppData { get; set; }
}

public sealed class BotApiFileAttachmentDto
{
    public string fileId { get; set; } = "";
    public string fileName { get; set; } = "";
    public long fileSize { get; set; }
    public string mimeType { get; set; } = "";
}

public sealed class BotApiMediaInfoDto
{
    public string contentType { get; set; } = "";
    public string? caption { get; set; }
    public List<BotApiFileAttachmentDto> attachments { get; set; } = [];
}

public sealed class BotApiUploadFileResponse
{
    public bool success { get; set; }
    public string? fileId { get; set; }
    public string? fileName { get; set; }
    public string? mimeType { get; set; }
    public long size { get; set; }
    public string? chatId { get; set; }
    public string? error { get; set; }
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
    public BotApiMenuDto? menu { get; set; }
    public string? error { get; set; }
}

/// <summary>Состояние шифрования бота (для воспроизведения детерминированной RSA-пары на стороне бота).</summary>
public sealed class BotApiEncryptionStatusResponse
{
    public bool success { get; set; }
    public bool configured { get; set; }
    public string? salt { get; set; }
    public string? publicKey { get; set; }
    public string? privateKeyBlob { get; set; }
    public string? error { get; set; }
}

/// <summary>Результат публикации ключей шифрования бота.</summary>
public sealed class BotApiEncryptionSetupResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

/// <summary>Обёрнутый под публичный ключ бота автопароль чата (для вывода ключа шифрования).</summary>
public sealed class BotApiGroupKeyResponse
{
    public bool success { get; set; }
    public bool found { get; set; }
    public string? wrappedAutoPassword { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiSendActivityResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiGetActivityResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public List<BotApiActivityDto> activities { get; set; } = [];
    public string? error { get; set; }
}

public sealed class BotApiActivityDto
{
    public string activityType { get; set; } = "";
    public string? activityMessage { get; set; }
    public bool active { get; set; }
    public string? expiresAt { get; set; }
}

public sealed class BotApiEditMessageResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? messageId { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiDeleteMessageResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? messageId { get; set; }
    /// <summary>everyone — удалено у всех участников; self — только у вызывающего (бота).</summary>
    public string? deleteScope { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiWsEnvelope
{
    public string type { get; set; } = "";
    public BotApiMessageDto? update { get; set; }
    public BotApiGroupChatEventDto? groupChat { get; set; }
    public string? botUserId { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiSimpleResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiGetChatInfoResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? chatType { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? description { get; set; }
    public string? avatar { get; set; }
    public string? parentChatId { get; set; }
    public string? branchSlug { get; set; }
    public bool isBranch { get; set; }
    public bool isAdmin { get; set; }
    public bool isCreator { get; set; }
    public bool canEdit { get; set; }
    public bool canPost { get; set; }
    public bool canManageMembers { get; set; }
    public string? myRole { get; set; }
    public bool allowJoinByLink { get; set; }
    /// <summary>Пер-групповой переключатель шифрования включён для этой группы.</summary>
    public bool encryptionEnabled { get; set; }
    public List<BotApiGroupMemberDto> members { get; set; } = [];
    public List<BotApiGroupBranchDto> branches { get; set; } = [];
    public string? error { get; set; }
}

public sealed class BotApiGroupMemberDto
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string login { get; set; } = "";
    public string? avatar { get; set; }
    public bool isAdmin { get; set; }
    public bool isCreator { get; set; }
    public string? role { get; set; }
}

public sealed class BotApiGroupBranchDto
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string slug { get; set; } = "";
    public string? avatar { get; set; }
    public int order { get; set; }
    public bool isMain { get; set; }
}

public sealed class BotApiUpdateGroupResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? name { get; set; }
    public string? description { get; set; }
    public string? avatar { get; set; }
    public bool allowJoinByLink { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiUpdateChannelResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? description { get; set; }
    public string? avatar { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiCreateGroupBranchResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? parentChatId { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? avatar { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiGetChannelSubscribersResponse
{
    public bool success { get; set; }
    public List<BotApiGroupMemberDto> subscribers { get; set; } = [];
    public bool hasMore { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiGroupChatEventDto
{
    public string? eventType { get; set; }
    public string? chatId { get; set; }
    public string? chatType { get; set; }
    public string? chatName { get; set; }
    public string? parentChatId { get; set; }
    public bool isAdmin { get; set; }
}
