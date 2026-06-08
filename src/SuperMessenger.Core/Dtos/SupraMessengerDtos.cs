namespace SuperMessenger.Core.Dtos;

public sealed class SupraChatDto
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string type { get; set; } = "";
    public string? avatar { get; set; }
    public string? contactUserId { get; set; }
    public string? contactStatusText { get; set; }
    public DateTime? contactLastSeenAt { get; set; }
    public string lastMessage { get; set; } = "";
    public DateTime? lastMessageTime { get; set; }
    public int unreadCount { get; set; }
    public bool requiresCustomGroupPassword { get; set; }
    public bool hasGroupAutoKey { get; set; }
}

public sealed class SupraContactDto
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string? avatar { get; set; }
}

public sealed class SupraCurrentUserDto
{
    public string id { get; set; } = "";
    public string login { get; set; } = "";
    public string name { get; set; } = "";
    public string? avatar { get; set; }
    public string colorSeed { get; set; } = "";
    public string userType { get; set; } = "User";
    public string statusText { get; set; } = "";
    public bool encryptionConfigured { get; set; }
}

public sealed class SupraChatMessageDto
{
    public string id { get; set; } = "";
    public string senderId { get; set; } = "";
    public string senderName { get; set; } = "";
    public string? senderAvatar { get; set; }
    public DateTime timestamp { get; set; }
    public string text { get; set; } = "";
    public string status { get; set; } = "";
    public bool isOwn { get; set; }
    public string? replyToMessageId { get; set; }
    public string? replyToSenderName { get; set; }
    public string? replyToTextPreview { get; set; }
    public string? forwardedFromSenderName { get; set; }
    public DateTime? editedOn { get; set; }
    public bool deletedForEveryone { get; set; }
    public string encryptionTier { get; set; } = "basic";
}

public sealed class SupraGetCurrentUserResponse
{
    public bool success { get; set; }
    public SupraCurrentUserDto? user { get; set; }
    public string? error { get; set; }
}

public sealed class SupraGetChatsResponse
{
    public bool success { get; set; }
    public List<SupraChatDto> chats { get; set; } = [];
    public string? error { get; set; }
}

public sealed class SupraGetContactsResponse
{
    public bool success { get; set; }
    public List<SupraContactDto> contacts { get; set; } = [];
    public string? error { get; set; }
    public int page { get; set; }
    public int rowCount { get; set; }
}

public sealed class SupraGetMessagesResponse
{
    public bool success { get; set; }
    public List<SupraChatMessageDto> messages { get; set; } = [];
    public string? error { get; set; }
}

public sealed class SupraGetMessagesAroundResponse
{
    public bool success { get; set; }
    public List<SupraChatMessageDto> messages { get; set; } = [];
    public bool hasMoreBefore { get; set; }
    public bool hasMoreAfter { get; set; }
    public string? error { get; set; }
}

/// <summary>Лёгкая запись для синхронизации порядка сообщений (id + время с сервера).</summary>
public sealed class SupraMessageSyncEntryDto
{
    public string id { get; set; } = "";
    public DateTime timestamp { get; set; }
}

public sealed class SupraGetMessageSyncIndexResponse
{
    public bool success { get; set; }
    public List<SupraMessageSyncEntryDto> entries { get; set; } = [];
    public string? error { get; set; }
}

public sealed class SupraSendMessageResponse
{
    public bool success { get; set; }
    public string? messageId { get; set; }
    public string? status { get; set; }
    public string? error { get; set; }
    /// <summary>Диагностика Web Push — только для отправителя с ролью Admin.</summary>
    public object? pushDebug { get; set; }
}

public sealed class SupraMarkReadResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class SupraCreateChatResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? chatName { get; set; }
    public string? error { get; set; }
}

public sealed class SupraGetOrCreateChatByIdResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? chatName { get; set; }
    public string? error { get; set; }
}

public sealed class SupraSendActivityResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class SupraWsNewMessagePayload
{
    public string type { get; set; } = "SupraNewChatMessage";
    public string chatId { get; set; } = "";
    public string messageId { get; set; } = "";
    public string senderId { get; set; } = "";
    public string senderName { get; set; } = "";
    public string? senderAvatar { get; set; }
    public string text { get; set; } = "";
    public DateTime timestamp { get; set; }
    public string status { get; set; } = "";
    public bool isOwn { get; set; }
    public string? replyToMessageId { get; set; }
    public string? replyToSenderName { get; set; }
    public string? replyToTextPreview { get; set; }
    public string? forwardedFromSenderName { get; set; }
    public DateTime? editedOn { get; set; }
    public bool deletedForEveryone { get; set; }
    public string encryptionTier { get; set; } = "basic";
}

public sealed class SupraEditMessageResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class SupraDeleteMessageResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class SupraForwardMessageResponse
{
    public bool success { get; set; }
    public List<string> sentChatIds { get; set; } = [];
    public string? error { get; set; }
}

public sealed class SupraWsMessageUpdatedPayload
{
    public string type { get; set; } = "SupraMessageUpdated";
    public string chatId { get; set; } = "";
    public string messageId { get; set; } = "";
    public string text { get; set; } = "";
    public DateTime? editedOn { get; set; }
    public string? replyToMessageId { get; set; }
    public string? replyToSenderName { get; set; }
    public string? replyToTextPreview { get; set; }
    public string? forwardedFromSenderName { get; set; }
    public bool deletedForEveryone { get; set; }
}

public sealed class SupraWsDeleteMessagePayload
{
    public string type { get; set; } = "SupraDeleteMessage";
    public string chatId { get; set; } = "";
    public string messageId { get; set; } = "";
    public string deleteScope { get; set; } = "me";
}

public sealed class SupraWsStatusPayload
{
    public string type { get; set; } = "SupraMessageStatusUpdate";
    public string chatId { get; set; } = "";
    public string messageId { get; set; } = "";
    public string status { get; set; } = "";
}

/// <summary>Синхронизация «прочитано» на всех клиентах того же пользователя.</summary>
public sealed class SupraWsChatReadPayload
{
    public string type { get; set; } = "SupraChatRead";
    public string chatId { get; set; } = "";
}

public sealed class SupraWsNewChatPayload
{
    public string type { get; set; } = "SupraNewChat";
    public string chatId { get; set; } = "";
    public string chatName { get; set; } = "";
    public string chatType { get; set; } = "";
    public string? chatAvatar { get; set; }
}

public sealed class SupraWsUserActivityPayload
{
    public string type { get; set; } = "SupraUserActivity";
    public string chatId { get; set; } = "";
    public string userId { get; set; } = "";
    public string userName { get; set; } = "";
    public string activityType { get; set; } = "";
    public bool active { get; set; }
}

public sealed class SupraWsChatHistoryClearedPayload
{
    public string type { get; set; } = "SupraChatHistoryCleared";
    public string chatId { get; set; } = "";
}

public sealed class SupraWsPresencePayload
{
    public string type { get; set; } = "SupraPresenceUpdate";
    public string userId { get; set; } = "";
    public string status { get; set; } = "offline";
}

public sealed class SupraWsProfileUpdatedPayload
{
    public string type { get; set; } = "SupraProfileUpdated";
    public string userId { get; set; } = "";
    public string statusText { get; set; } = "";
    public string aboutText { get; set; } = "";
    public string? displayName { get; set; }
    public string? avatar { get; set; }
}

public sealed class SupraWsLoginChangedPayload
{
    public string type { get; set; } = "SupraLoginChanged";
    public string userId { get; set; } = "";
    public string oldLogin { get; set; } = "";
    public string newLogin { get; set; } = "";
    public string? displayName { get; set; }
    public string? avatar { get; set; }
}

public sealed class SupraFolderDto
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string icon { get; set; } = "";
    public int order { get; set; }
    public bool isArchive { get; set; }
}

public sealed class SupraFolderMemberDto
{
    public string folderId { get; set; } = "";
    public string chatId { get; set; } = "";
}

public sealed class SupraGetFoldersResponse
{
    public bool success { get; set; }
    public List<SupraFolderDto> folders { get; set; } = [];
    public List<SupraFolderMemberDto> members { get; set; } = [];
    public string? error { get; set; }
}

public sealed class SupraSaveFolderResponse
{
    public bool success { get; set; }
    public string? folderId { get; set; }
    public string? error { get; set; }
}

public sealed class SupraSimpleResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class SupraGroupMemberDto
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string login { get; set; } = "";
    public string? avatar { get; set; }
    public bool isAdmin { get; set; }
    public bool isCreator { get; set; }
}

public sealed class SupraGetGroupInfoResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? name { get; set; }
    public string? avatar { get; set; }
    public string? creatorUserId { get; set; }
    public List<SupraGroupMemberDto> members { get; set; } = [];
    public bool canEdit { get; set; }
    public bool isAdmin { get; set; }
    public bool isCreator { get; set; }
    public bool allowJoinByLink { get; set; }
    public bool requiresCustomGroupPassword { get; set; }
    public bool hasGroupAutoKey { get; set; }
    public string? error { get; set; }
}

public sealed class SupraGetGroupLinkPreviewResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? name { get; set; }
    public string? avatar { get; set; }
    public bool allowJoinByLink { get; set; }
    public bool isMember { get; set; }
    public bool canJoin { get; set; }
    public bool excludedFromGroup { get; set; }
    public string? error { get; set; }
}

public sealed class SupraUpdateGroupResponse
{
    public bool success { get; set; }
    public string? name { get; set; }
    public string? avatar { get; set; }
    public bool allowJoinByLink { get; set; }
    public bool requiresCustomGroupPassword { get; set; }
    public string? error { get; set; }
}

public sealed class SupraWsGroupUpdatedPayload
{
    public string type { get; set; } = "SupraGroupUpdated";
    public string chatId { get; set; } = "";
    public string chatName { get; set; } = "";
    public string? chatAvatar { get; set; }
    public bool requiresCustomGroupPassword { get; set; }
}

/// <summary>Chat is no longer available to this user (left, removed from group, or chat deleted).</summary>
public sealed class SupraWsChatRemovedPayload
{
    public string type { get; set; } = "SupraChatRemoved";
    public string chatId { get; set; } = "";
}

public sealed class SupraGetMessageInfoResponse
{
    public bool success { get; set; }
    public SupraMessageInfoDto? info { get; set; }
    public string? error { get; set; }
}

public sealed class SupraMessageInfoDto
{
    public string messageId { get; set; } = "";
    public string chatId { get; set; } = "";
    public string chatName { get; set; } = "";
    public string chatType { get; set; } = "";
    public string senderId { get; set; } = "";
    public string senderName { get; set; } = "";
    public DateTime sentAt { get; set; }
    public DateTime? editedAt { get; set; }
    public string status { get; set; } = "";
    public bool deletedForEveryone { get; set; }
    public string encryptionTier { get; set; } = "basic";
    public string? replyToMessageId { get; set; }
    public string? replyToSenderName { get; set; }
    public string? forwardedFromSenderName { get; set; }
    public List<SupraMessageReadReceiptDto> readBy { get; set; } = [];
    public List<SupraMessageDeliveryEventDto> events { get; set; } = [];
    public object? pushDebug { get; set; }
}

public sealed class SupraMessageReadReceiptDto
{
    public string userId { get; set; } = "";
    public string displayName { get; set; } = "";
    public DateTime? readAt { get; set; }
    public bool read { get; set; }
    public bool legacy { get; set; }
}

public sealed class SupraMessageDeliveryEventDto
{
    public string kind { get; set; } = "";
    public DateTime? at { get; set; }
    public string? userId { get; set; }
    public string? userName { get; set; }
    public string? detail { get; set; }
}
