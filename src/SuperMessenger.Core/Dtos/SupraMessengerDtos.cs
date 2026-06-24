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
    /// <summary>Последнее сообщение по всем веткам группы (для строки родителя и сортировки).</summary>
    public string aggregatedLastMessage { get; set; } = "";
    public DateTime? aggregatedLastMessageTime { get; set; }
    public int unreadCount { get; set; }
    public bool requiresCustomGroupPassword { get; set; }
    /// <summary>Пер-групповой переключатель шифрования включён для этой группы.</summary>
    public bool encryptionEnabled { get; set; }
    public bool hasGroupAutoKey { get; set; }
    public string? channelSlug { get; set; }
    public bool isBotContact { get; set; }
    /// <summary>Бот-контакт опубликовал публичный ключ → личный чат можно шифровать.</summary>
    public bool botSupportsEncryption { get; set; }
    public string? botSlug { get; set; }
    public bool botEngaged { get; set; }
    public bool isAdmin { get; set; }
    public bool isGroupCreator { get; set; }
    public string? parentChatId { get; set; }
    public string? branchSlug { get; set; }
    public int branchOrder { get; set; }
    public List<SupraGroupBranchDto>? branches { get; set; }
}

public sealed class SupraGroupBranchDto
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string slug { get; set; } = "";
    public string? avatar { get; set; }
    public string lastMessage { get; set; } = "";
    public DateTime? lastMessageTime { get; set; }
    public int unreadCount { get; set; }
    public int order { get; set; }
}

public sealed class SupraContactDto
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string? avatar { get; set; }
    public bool isBot { get; set; }
    public string? login { get; set; }
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
    /// <summary>Канонический монотонный порядковый номер в рамках чата.</summary>
    public long seq { get; set; }
    /// <summary>Версия изменения в рамках чата (для дельта-синхронизации).</summary>
    public long rev { get; set; }
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
    public List<BotMessageButtonDto>? buttons { get; set; }
    public bool invisible { get; set; }
    public string? targetUserId { get; set; }
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

/// <summary>Публичный профиль контакта для синхронизации (без приватных полей).</summary>
public sealed class SupraPublicProfileDto
{
    public string id { get; set; } = "";
    public string login { get; set; } = "";
    public string displayName { get; set; } = "";
    public string? avatar { get; set; }
    public string statusText { get; set; } = "";
    public string aboutText { get; set; } = "";
    public DateTime? lastSeenAt { get; set; }
    public string? onlineStatus { get; set; }
    public bool canWrite { get; set; }
}

public sealed class SupraSyncEncryptionKeyDto
{
    public bool found { get; set; }
    public string? wrappedAutoPassword { get; set; }
}

public sealed class SupraRequestSyncRequest
{
  /// <summary>Устаревший курсор по messageId (используется как fallback, если нет rev-курсора).</summary>
  public Dictionary<string, string?>? chatCursors { get; set; }
  /// <summary>Дельта-курсор по rev на чат: вернуть все изменения с rev больше указанного.</summary>
  public Dictionary<string, long?>? chatRevCursors { get; set; }
  public bool includeProfiles { get; set; } = true;
  public bool includeEncryptionKeys { get; set; } = true;
  /// <summary>
  /// Если задан — ключи шифрования возвращаются только для перечисленных чатов
  /// (клиент запрашивает лишь те, по которым ещё не получил ключ). null = все чаты (обратная совместимость).
  /// </summary>
  public List<string>? encryptionKeyChatIds { get; set; }
  public int messageLimit { get; set; } = 50;
}

public sealed class SupraRequestSyncResponse
{
    public bool success { get; set; }
    public List<SupraChatDto> chats { get; set; } = [];
    public Dictionary<string, List<SupraChatMessageDto>> messagesByChat { get; set; } = new();
    /// <summary>Идентификаторы сообщений, удалённых/ставших невидимыми с момента rev-курсора (тумбстоны).</summary>
    public Dictionary<string, List<string>> deletedByChat { get; set; } = new();
    /// <summary>Новый rev-курсор на чат, который клиент должен сохранить после применения дельты.</summary>
    public Dictionary<string, long> chatRev { get; set; } = new();
    public Dictionary<string, SupraPublicProfileDto> profiles { get; set; } = new();
    public Dictionary<string, SupraSyncEncryptionKeyDto> encryptionKeys { get; set; } = new();
    public string? error { get; set; }
}

public sealed class SupraWsSyncHintPayload
{
    public string type { get; set; } = "SupraSyncHint";
    public string reason { get; set; } = "connected";
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

public sealed class SupraChatActivityDto
{
    public string userId { get; set; } = "";
    public string userName { get; set; } = "";
    public string activityType { get; set; } = "";
    public string? activityMessage { get; set; }
    public DateTime? expiresAt { get; set; }
}

/// <summary>Единый ответ для открытия/синхронизации панели чата: сообщения, индекс reconcile и прочтение.</summary>
public sealed class SupraSyncChatPanelResponse
{
    public bool success { get; set; }
    public List<SupraChatMessageDto> messages { get; set; } = [];
    /// <summary>
    /// Полный индекс reconcile. Заполняется только по явному запросу (includeSyncIndex),
    /// иначе клиенту отдаётся лёгкая сводка (syncIndexCount + syncIndexChecksum).
    /// </summary>
    public List<SupraMessageSyncEntryDto> syncIndex { get; set; } = [];
    /// <summary>Количество видимых сообщений в окне индекса (от indexFromMessageId до конца чата).</summary>
    public int syncIndexCount { get; set; }
    /// <summary>Порядконезависимая XOR-контрольная сумма id сообщений в окне индекса (hex). Клиент сверяет со своим кешем.</summary>
    public string syncIndexChecksum { get; set; } = "";
    public List<SupraChatActivityDto> activities { get; set; } = [];
    public bool markedRead { get; set; }
    public string? error { get; set; }
}

public sealed class SupraSendMessageResponse
{
    public bool success { get; set; }
    public string? messageId { get; set; }
    public string? status { get; set; }
    /// <summary>Серверный порядковый номер созданного сообщения (для немедленной корректной сортировки optimistic).</summary>
    public long seq { get; set; }
    /// <summary>Серверное время создания (UTC) — клиент заменяет им своё локальное.</summary>
    public DateTime? timestamp { get; set; }
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
    public bool isBotContact { get; set; }
    public bool botSupportsEncryption { get; set; }
    public string? botSlug { get; set; }
    public bool botEngaged { get; set; }
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
    /// <summary>Канонический монотонный порядковый номер в рамках чата.</summary>
    public long seq { get; set; }
    /// <summary>Версия изменения в рамках чата (для дельта-синхронизации).</summary>
    public long rev { get; set; }
    public string status { get; set; } = "";
    public bool isOwn { get; set; }
    public string? replyToMessageId { get; set; }
    public string? replyToSenderName { get; set; }
    public string? replyToTextPreview { get; set; }
    public string? forwardedFromSenderName { get; set; }
    public DateTime? editedOn { get; set; }
    public bool deletedForEveryone { get; set; }
    public string encryptionTier { get; set; } = "basic";
    public List<BotMessageButtonDto>? buttons { get; set; }
    public BotAssistantReplyMetaDto? assistantReply { get; set; }
    public bool invisible { get; set; }
    public string? targetUserId { get; set; }
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

public sealed class SupraBatchForwardItem
{
    public string targetChatId { get; set; } = "";
    public string sourceMessageId { get; set; } = "";
    public string text { get; set; } = "";
    public string? forwardedFromSenderName { get; set; }
    public string encryptionTier { get; set; } = "basic";
    public List<string> attachmentFileIds { get; set; } = [];
}

public sealed class SupraBatchItemResult
{
    public string messageId { get; set; } = "";
    public string? targetChatId { get; set; }
    public string? newMessageId { get; set; }
    public object? data { get; set; }
    public bool success { get; set; }
    public string? error { get; set; }
}

public sealed class SupraBatchResponse
{
    public bool success { get; set; }
    public string? error { get; set; }
    public List<string> sentChatIds { get; set; } = [];
    public List<SupraBatchItemResult> results { get; set; } = [];
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
    public List<BotMessageButtonDto>? buttons { get; set; }
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
    public string? contactUserId { get; set; }
    public bool isBotContact { get; set; }
    public string? botSlug { get; set; }
    public string? parentChatId { get; set; }
    public string? branchSlug { get; set; }
    public bool encryptionEnabled { get; set; }
    public bool requiresCustomGroupPassword { get; set; }
}

public sealed class SupraWsUserActivityPayload
{
    public string type { get; set; } = "SupraUserActivity";
    public string chatId { get; set; } = "";
    public string userId { get; set; } = "";
    public string userName { get; set; } = "";
    public string activityType { get; set; } = "";
    public bool active { get; set; }
    public string? activityMessage { get; set; }
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

public sealed class SupraWsAppearanceUpdatedPayload
{
    public string type { get; set; } = "SupraAppearanceUpdated";
    /// <summary>e.g. themeChatBg, themes</summary>
    public string reason { get; set; } = "";
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

public sealed class SupraGroupBotMenuDto
{
    public string botUserId { get; set; } = "";
    public string name { get; set; } = "";
    public string? avatar { get; set; }
    public BotApiMenuDto? menu { get; set; }
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
    /// <summary>Пер-групповой переключатель шифрования включён для этой группы.</summary>
    public bool encryptionEnabled { get; set; }
    public bool hasGroupAutoKey { get; set; }
    public string? parentChatId { get; set; }
    public string? branchSlug { get; set; }
    public bool isBranch { get; set; }
    public string? description { get; set; }
    public List<SupraGroupBranchDto> branches { get; set; } = [];
    public List<SupraGroupBotMenuDto> groupBotMenus { get; set; } = [];
    /// <summary>Устаревшее: первый бот из groupBotMenus (для совместимости).</summary>
    public SupraGroupBotMenuDto? groupBotMenu { get; set; }
    public string? error { get; set; }
}

public sealed class SupraReorderGroupBranchesRequest
{
    public string parentChatId { get; set; } = "";
    public List<string> branchIds { get; set; } = [];
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
    public string? description { get; set; }
    public string? error { get; set; }
}

public sealed class SupraSetGroupEncryptionResponse
{
    public bool success { get; set; }
    public bool encryptionEnabled { get; set; }
    /// <summary>Ветки группы, которым каскадом изменили флаг шифрования (для рассылки обновлений).</summary>
    public List<string> affectedBranchChatIds { get; set; } = [];
    public string? error { get; set; }
}

public sealed class SupraCreateGroupBranchResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? avatar { get; set; }
    public string? parentChatId { get; set; }
    public bool encryptionEnabled { get; set; }
    public bool requiresCustomGroupPassword { get; set; }
    public string? error { get; set; }
}

public sealed class SupraGetGroupBranchLinkPreviewResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? parentChatId { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? avatar { get; set; }
    public bool isMember { get; set; }
    public string? error { get; set; }
}

public sealed class SupraWsGroupUpdatedPayload
{
    public string type { get; set; } = "SupraGroupUpdated";
    public string chatId { get; set; } = "";
    public string chatName { get; set; } = "";
    public string? chatAvatar { get; set; }
    public bool requiresCustomGroupPassword { get; set; }
    /// <summary>Пер-групповой переключатель шифрования включён для этой группы.</summary>
    public bool encryptionEnabled { get; set; }
}

/// <summary>
/// Участник зашифрованной группы без ключа просит выдать ему ключ. Рассылается тем
/// участникам, у кого ключ уже есть и кто сейчас онлайн — они выполняют раздачу.
/// </summary>
public sealed class SupraWsGroupKeyRequestedPayload
{
    public string type { get; set; } = "SupraGroupKeyRequested";
    public string chatId { get; set; } = "";
    public string requesterUserId { get; set; } = "";
}

/// <summary>
/// Ключи группы для участника обновлены на сервере (кто-то выполнил раздачу).
/// Получатель должен перечитать свой обёрнутый ключ и расшифровать сообщения.
/// </summary>
public sealed class SupraWsGroupKeysUpdatedPayload
{
    public string type { get; set; } = "SupraGroupKeysUpdated";
    public string chatId { get; set; } = "";
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

public sealed class SupraChannelMemberDto
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string login { get; set; } = "";
    public string? avatar { get; set; }
    public string role { get; set; } = "";
    public bool isOwner { get; set; }
}

public sealed class SupraGetChannelInfoResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? description { get; set; }
    public string? avatar { get; set; }
    public string? creatorUserId { get; set; }
    public List<SupraChannelMemberDto> members { get; set; } = [];
    public bool canEdit { get; set; }
    public bool canEditSlug { get; set; }
    public bool canPost { get; set; }
    public bool canManageMembers { get; set; }
    public bool isOwner { get; set; }
    public bool isSubscribed { get; set; }
    public string? myRole { get; set; }
    public int subscriberCount { get; set; }
    public bool isDeleted { get; set; }
    public bool canRestore { get; set; }
    public string? error { get; set; }
}

public sealed class SupraGetMyChannelsResponse
{
    public bool success { get; set; }
    public List<SupraChannelListItemDto> channels { get; set; } = [];
    public string? error { get; set; }
}

public sealed class SupraChannelListItemDto
{
    public string chatId { get; set; } = "";
    public string name { get; set; } = "";
    public string slug { get; set; } = "";
    public string? avatar { get; set; }
    public string myRole { get; set; } = "";
    public int subscriberCount { get; set; }
    public bool isDeleted { get; set; }
    public DateTime? deletedAt { get; set; }
}

public sealed class SupraGetChannelSubscribersResponse
{
    public bool success { get; set; }
    public List<SupraChannelMemberDto> subscribers { get; set; } = [];
    public bool hasMore { get; set; }
    public string? error { get; set; }
}

public sealed class SupraCreateChannelResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? slug { get; set; }
    public string? name { get; set; }
    public string? error { get; set; }
}

public sealed class SupraUpdateChannelResponse
{
    public bool success { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? description { get; set; }
    public string? avatar { get; set; }
    public string? error { get; set; }
}

public sealed class SupraGetChannelLinkPreviewResponse
{
    public bool success { get; set; }
    public string? chatId { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? description { get; set; }
    public string? avatar { get; set; }
    public bool isSubscribed { get; set; }
    public bool canSubscribe { get; set; }
    public int subscriberCount { get; set; }
    public string? error { get; set; }
}

public sealed class SupraWsChannelUpdatedPayload
{
    public string type { get; set; } = "SupraChannelUpdated";
    public string chatId { get; set; } = "";
    public string chatName { get; set; } = "";
    public string? chatAvatar { get; set; }
    public string? slug { get; set; }
    public string? description { get; set; }
}

public sealed class SupraPublicChannelMessageDto
{
    public string id { get; set; } = "";
    public DateTime timestamp { get; set; }
    public string text { get; set; } = "";
    public string channelName { get; set; } = "";
    public string? channelSlug { get; set; }
}

public sealed class SupraPublicChannelMessagesAroundResult
{
    public bool found { get; set; }
    public string chatId { get; set; } = "";
    public string name { get; set; } = "";
    public string slug { get; set; } = "";
    public string description { get; set; } = "";
    public string? avatar { get; set; }
    public bool hasMoreBefore { get; set; }
    public bool hasMoreAfter { get; set; }
    public List<SupraPublicChannelMessageDto> messages { get; set; } = [];
}

public sealed class SupraBotMemberDto
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string login { get; set; } = "";
    public string? avatar { get; set; }
}

public sealed class SupraGetBotInfoResponse
{
    public bool success { get; set; }
    public string? botUserId { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? description { get; set; }
    public string? avatar { get; set; }
    public string? ownerUserId { get; set; }
    public bool canEdit { get; set; }
    public bool isOwner { get; set; }
    public int userCount { get; set; }
    public bool hasToken { get; set; }
    public bool isDeleted { get; set; }
    public BotApiMenuDto? menu { get; set; }
    public BotApiMenuDto? assistantMenu { get; set; }
    public bool isAssistant { get; set; }
    public bool hasAssistantMenu { get; set; }
    public string? error { get; set; }
}

public sealed class SupraGetMyBotsResponse
{
    public bool success { get; set; }
    public List<SupraBotListItemDto> bots { get; set; } = [];
    public string? error { get; set; }
}

public sealed class SupraBotListItemDto
{
    public string botUserId { get; set; } = "";
    public string name { get; set; } = "";
    public string slug { get; set; } = "";
    public string? avatar { get; set; }
    public int userCount { get; set; }
    public bool isDeleted { get; set; }
    public DateTime? deletedAt { get; set; }
}

public sealed class SupraGetBotUsersResponse
{
    public bool success { get; set; }
    public List<SupraBotMemberDto> users { get; set; } = [];
    public bool hasMore { get; set; }
    public string? error { get; set; }
}

public sealed class SupraCreateBotResponse
{
    public bool success { get; set; }
    public string? botUserId { get; set; }
    public string? chatId { get; set; }
    public string? slug { get; set; }
    public string? name { get; set; }
    public string? avatar { get; set; }
    public string? error { get; set; }
}

public sealed class SupraUpdateBotResponse
{
    public bool success { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? description { get; set; }
    public string? avatar { get; set; }
    public string? error { get; set; }
}

public sealed class SupraGetBotLinkPreviewResponse
{
    public bool success { get; set; }
    public string? botUserId { get; set; }
    public string? name { get; set; }
    public string? slug { get; set; }
    public string? description { get; set; }
    public string? avatar { get; set; }
    public bool isStarted { get; set; }
    public string? chatId { get; set; }
    public int userCount { get; set; }
    public BotApiMenuDto? menu { get; set; }
    public string? error { get; set; }
}

public sealed class SupraGenerateBotTokenResponse
{
    public bool success { get; set; }
    public string? token { get; set; }
    public string? error { get; set; }
}

public sealed class SupraWsBotUpdatedPayload
{
    public string type { get; set; } = "SupraBotUpdated";
    public string botUserId { get; set; } = "";
    public string botName { get; set; } = "";
    public string? botAvatar { get; set; }
    public string? slug { get; set; }
    public string? description { get; set; }
    public BotApiMenuDto? menu { get; set; }
    /// <summary>Если задан — меню относится только к этому чату (per-session override).</summary>
    public string? chatId { get; set; }
}

public sealed class SupraWsBotGroupUpdatedPayload
{
    public string type { get; set; } = "SupraBotGroupUpdated";
    public string botUserId { get; set; } = "";
    public BotApiMenuDto? groupMenu { get; set; }
    /// <summary>Если задан — меню относится только к этой группе/ветке.</summary>
    public string? chatId { get; set; }
    /// <summary>Персональное меню: только этому участнику.</summary>
    public string? viewerUserId { get; set; }
}
