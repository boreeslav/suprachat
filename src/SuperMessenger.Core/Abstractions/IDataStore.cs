using SuperMessenger.Core.Entities;

namespace SuperMessenger.Core.Abstractions;

public interface IDataStore
{
    Task<IReadOnlyList<UserRecord>> GetUsersAsync(CancellationToken ct = default);
    Task<UserRecord?> GetUserByIdAsync(Guid id, CancellationToken ct = default);
    Task<UserRecord?> GetUserByLoginAsync(string login, CancellationToken ct = default);
    Task<bool> IsLoginTakenAsync(string login, Guid? excludeUserId = null, CancellationToken ct = default);
    Task SaveUserAsync(UserRecord user, CancellationToken ct = default);
    Task DeleteUserAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<InvitationRecord>> GetInvitationsAsync(CancellationToken ct = default);
    Task<InvitationRecord?> GetInvitationByTokenAsync(string token, CancellationToken ct = default);
    Task SaveInvitationAsync(InvitationRecord invitation, CancellationToken ct = default);
    Task DeleteInvitationAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<SupraChatRecord>> GetChatsAsync(CancellationToken ct = default);
    Task<SupraChatRecord?> GetChatByIdAsync(Guid id, CancellationToken ct = default);
    Task<SupraChatRecord?> GetChannelBySlugAsync(string slug, CancellationToken ct = default);
    Task<bool> IsChannelSlugTakenAsync(string slug, Guid? excludeChatId = null, CancellationToken ct = default);
    Task SaveChatAsync(SupraChatRecord chat, CancellationToken ct = default);

    Task<IReadOnlyList<SupraChatParticipantRecord>> GetAllParticipantsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<SupraChatParticipantRecord>> GetParticipantsByChatAsync(Guid chatId, CancellationToken ct = default);
    Task<IReadOnlyList<SupraChatParticipantRecord>> GetParticipantsByUserAsync(Guid userId, CancellationToken ct = default);
    Task SaveParticipantAsync(SupraChatParticipantRecord participant, CancellationToken ct = default);
    Task<bool> IsParticipantAsync(Guid chatId, Guid userId, CancellationToken ct = default);

    Task<IReadOnlyList<SupraChatMessageRecord>> GetAllMessagesAsync(CancellationToken ct = default);
    Task<IReadOnlyList<SupraChatMessageRecord>> GetMessagesByChatAsync(Guid chatId, CancellationToken ct = default);
    Task<SupraChatMessageRecord?> GetMessageByIdAsync(Guid messageId, CancellationToken ct = default);
    Task<SupraChatMessageRecord?> GetMessageByClientLocalIdAsync(
        Guid chatId, Guid senderUserId, string clientLocalId, CancellationToken ct = default);
    Task SaveMessageAsync(SupraChatMessageRecord message, CancellationToken ct = default);
    Task UpdateMessageAsync(SupraChatMessageRecord message, CancellationToken ct = default);
    Task UpdateMessagesStatusAsync(Guid chatId, Guid readerUserId, string status, CancellationToken ct = default);
    Task DeleteMessagesByChatAsync(Guid chatId, CancellationToken ct = default);

    Task<IReadOnlyList<SupraMessageUserDeletionRecord>> GetMessageUserDeletionsByUserAsync(Guid userId, CancellationToken ct = default);
    Task SaveMessageUserDeletionAsync(SupraMessageUserDeletionRecord deletion, CancellationToken ct = default);
    Task SaveMessageUserDeletionsAsync(IReadOnlyList<SupraMessageUserDeletionRecord> deletions, CancellationToken ct = default);
    Task<bool> IsMessageDeletedForUserAsync(Guid messageId, Guid userId, CancellationToken ct = default);

    Task<IReadOnlyList<SupraMessageReadReceiptRecord>> GetReadReceiptsByMessageAsync(Guid messageId, CancellationToken ct = default);
    Task UpsertMessageReadReceiptAsync(SupraMessageReadReceiptRecord receipt, CancellationToken ct = default);

    Task DeleteParticipantAsync(Guid chatId, Guid userId, CancellationToken ct = default);
    Task DeleteChatAsync(Guid chatId, CancellationToken ct = default);

    Task<IReadOnlyList<SupraChatFolderRecord>> GetFoldersByUserAsync(Guid userId, CancellationToken ct = default);
    Task SaveFolderAsync(SupraChatFolderRecord folder, CancellationToken ct = default);
    Task DeleteFolderAsync(Guid folderId, CancellationToken ct = default);

    Task<IReadOnlyList<SupraChatFolderMemberRecord>> GetFolderMembersByUserAsync(Guid userId, CancellationToken ct = default);
    Task SaveFolderMemberAsync(SupraChatFolderMemberRecord member, CancellationToken ct = default);
    Task DeleteFolderMemberAsync(Guid folderId, Guid chatId, CancellationToken ct = default);
    Task DeleteFolderMembersByFolderAsync(Guid folderId, CancellationToken ct = default);
    Task DeleteFolderMembersByChatAsync(Guid userId, Guid chatId, CancellationToken ct = default);

    Task<SupraFileRecord?> GetFileByIdAsync(Guid id, CancellationToken ct = default);
    Task SaveFileAsync(SupraFileRecord file, CancellationToken ct = default);

    Task<IReadOnlyList<SupraUserBlockRecord>> GetUserBlocksAsync(CancellationToken ct = default);
    Task SaveUserBlockAsync(SupraUserBlockRecord block, CancellationToken ct = default);
    Task DeleteUserBlockAsync(Guid blockerUserId, Guid blockedUserId, CancellationToken ct = default);

    Task<IReadOnlyList<SupraChatRestrictionRecord>> GetChatRestrictionsAsync(CancellationToken ct = default);
    Task SaveChatRestrictionAsync(SupraChatRestrictionRecord restriction, CancellationToken ct = default);
    Task DeleteChatRestrictionAsync(Guid chatId, Guid userId, CancellationToken ct = default);

    Task<IReadOnlyList<SupraChatMemberKeyRecord>> GetAllChatMemberKeysAsync(CancellationToken ct = default);
    Task<IReadOnlyList<SupraChatMemberKeyRecord>> GetChatMemberKeysByChatAsync(Guid chatId, CancellationToken ct = default);
    Task<SupraChatMemberKeyRecord?> GetChatMemberKeyAsync(Guid chatId, Guid userId, CancellationToken ct = default);
    Task SaveChatMemberKeyAsync(SupraChatMemberKeyRecord record, CancellationToken ct = default);
    Task DeleteChatMemberKeysByChatAsync(Guid chatId, CancellationToken ct = default);
    Task DeleteChatMemberKeyAsync(Guid chatId, Guid userId, CancellationToken ct = default);
    Task DeleteChatMemberKeysForUserAsync(Guid userId, CancellationToken ct = default);

    Task SaveLoginChangeAsync(LoginChangeRecord record, CancellationToken ct = default);
    Task<IReadOnlyList<LoginChangeRecord>> GetLoginChangesForUsersAsync(
        IEnumerable<Guid> userIds, DateTime since, CancellationToken ct = default);
}
