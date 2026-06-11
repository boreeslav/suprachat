using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Storage;

public sealed class FileDataStore : IDataStore
{
    private readonly JsonFileCollectionStore<UserRecord> _users;
    private readonly JsonFileCollectionStore<InvitationRecord> _invitations;
    private readonly JsonFileCollectionStore<SupraChatRecord> _chats;
    private readonly JsonFileCollectionStore<SupraChatParticipantRecord> _participants;
    private readonly JsonFileCollectionStore<SupraChatMessageRecord> _messages;
    private readonly JsonFileCollectionStore<SupraFileRecord> _files;
    private readonly JsonFileCollectionStore<SupraChatFolderRecord> _folders;
    private readonly JsonFileCollectionStore<SupraChatFolderMemberRecord> _folderMembers;
    private readonly JsonFileCollectionStore<SupraUserBlockRecord> _userBlocks;
    private readonly JsonFileCollectionStore<SupraChatRestrictionRecord> _chatRestrictions;
    private readonly JsonFileCollectionStore<SupraMessageUserDeletionRecord> _messageUserDeletions;
    private readonly JsonFileCollectionStore<SupraMessageReadReceiptRecord> _messageReadReceipts;
    private readonly JsonFileCollectionStore<SupraChatMemberKeyRecord> _chatMemberKeys;
    private readonly JsonFileCollectionStore<LoginChangeRecord> _loginChanges;

    public FileDataStore(string dataRoot)
    {
        Directory.CreateDirectory(dataRoot);
        _users = new(Path.Combine(dataRoot, "users.json"));
        _invitations = new(Path.Combine(dataRoot, "invitations.json"));
        _chats = new(Path.Combine(dataRoot, "chats.json"));
        _participants = new(Path.Combine(dataRoot, "participants.json"));
        _messages = new(Path.Combine(dataRoot, "messages.json"));
        _messageUserDeletions = new(Path.Combine(dataRoot, "message-user-deletions.json"));
        _messageReadReceipts = new(Path.Combine(dataRoot, "message-read-receipts.json"));
        _files = new(Path.Combine(dataRoot, "files.json"));
        _folders = new(Path.Combine(dataRoot, "folders.json"));
        _folderMembers = new(Path.Combine(dataRoot, "folder-members.json"));
        _userBlocks = new(Path.Combine(dataRoot, "user-blocks.json"));
        _chatRestrictions = new(Path.Combine(dataRoot, "chat-restrictions.json"));
        _chatMemberKeys = new(Path.Combine(dataRoot, "chat-member-keys.json"));
        _loginChanges = new(Path.Combine(dataRoot, "login-changes.json"));
    }

    public async Task<IReadOnlyList<UserRecord>> GetUsersAsync(CancellationToken ct = default)
        => await _users.ReadAllAsync(ct);

    public async Task<UserRecord?> GetUserByIdAsync(Guid id, CancellationToken ct = default)
        => (await _users.ReadAllAsync(ct)).FirstOrDefault(u => u.Id == id);

    public async Task<UserRecord?> GetUserByLoginAsync(string login, CancellationToken ct = default)
    {
        var norm = login.Trim();
        return (await _users.ReadAllAsync(ct)).FirstOrDefault(u => UserLoginMatches(u, norm));
    }

    public async Task<bool> IsLoginTakenAsync(string login, Guid? excludeUserId = null, CancellationToken ct = default)
    {
        var norm = login.Trim();
        return (await _users.ReadAllAsync(ct)).Any(u =>
            (excludeUserId == null || u.Id != excludeUserId) && UserLoginMatches(u, norm));
    }

    static bool UserLoginMatches(UserRecord user, string login) =>
        string.Equals(user.Login, login, StringComparison.OrdinalIgnoreCase)
        || (user.PreviousLogins?.Any(p => string.Equals(p, login, StringComparison.OrdinalIgnoreCase)) ?? false);

    public async Task SaveUserAsync(UserRecord user, CancellationToken ct = default)
    {
        var list = await _users.ReadAllAsync(ct);
        var idx = list.FindIndex(u => u.Id == user.Id);
        if (idx >= 0) list[idx] = user;
        else list.Add(user);
        await _users.WriteAllAsync(list, ct);
    }

    public async Task DeleteUserAsync(Guid id, CancellationToken ct = default)
    {
        var list = await _users.ReadAllAsync(ct);
        list.RemoveAll(u => u.Id == id);
        await _users.WriteAllAsync(list, ct);
    }

    public async Task<IReadOnlyList<InvitationRecord>> GetInvitationsAsync(CancellationToken ct = default)
        => await _invitations.ReadAllAsync(ct);

    public async Task<InvitationRecord?> GetInvitationByTokenAsync(string token, CancellationToken ct = default)
        => (await _invitations.ReadAllAsync(ct)).FirstOrDefault(i =>
            string.Equals(i.Token, token, StringComparison.Ordinal));

    public async Task SaveInvitationAsync(InvitationRecord invitation, CancellationToken ct = default)
    {
        var list = await _invitations.ReadAllAsync(ct);
        var idx = list.FindIndex(i => i.Id == invitation.Id);
        if (idx >= 0) list[idx] = invitation;
        else list.Add(invitation);
        await _invitations.WriteAllAsync(list, ct);
    }

    public async Task DeleteInvitationAsync(Guid id, CancellationToken ct = default)
    {
        var list = await _invitations.ReadAllAsync(ct);
        list.RemoveAll(i => i.Id == id);
        await _invitations.WriteAllAsync(list, ct);
    }

    public async Task<IReadOnlyList<SupraChatRecord>> GetChatsAsync(CancellationToken ct = default)
        => await _chats.ReadAllAsync(ct);

    public async Task<SupraChatRecord?> GetChatByIdAsync(Guid id, CancellationToken ct = default)
        => (await _chats.ReadAllAsync(ct)).FirstOrDefault(c => c.Id == id);

    public async Task<SupraChatRecord?> GetChannelBySlugAsync(string slug, CancellationToken ct = default)
    {
        var norm = (slug ?? "").Trim();
        if (norm.Length < 4) return null;
        return (await _chats.ReadAllAsync(ct)).FirstOrDefault(c =>
            string.Equals(c.Type, "channel", StringComparison.OrdinalIgnoreCase) &&
            c.DeletedOn == null &&
            c.Slug != null &&
            string.Equals(c.Slug, norm, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<bool> IsChannelSlugTakenAsync(string slug, Guid? excludeChatId = null, CancellationToken ct = default)
    {
        var norm = (slug ?? "").Trim();
        if (norm.Length < 4) return false;
        return (await _chats.ReadAllAsync(ct)).Any(c =>
            string.Equals(c.Type, "channel", StringComparison.OrdinalIgnoreCase) &&
            c.Slug != null &&
            string.Equals(c.Slug, norm, StringComparison.OrdinalIgnoreCase) &&
            (excludeChatId == null || c.Id != excludeChatId));
    }

    public async Task SaveChatAsync(SupraChatRecord chat, CancellationToken ct = default)
    {
        var list = await _chats.ReadAllAsync(ct);
        var idx = list.FindIndex(c => c.Id == chat.Id);
        if (idx >= 0) list[idx] = chat;
        else list.Add(chat);
        await _chats.WriteAllAsync(list, ct);
    }

    public async Task<IReadOnlyList<SupraChatParticipantRecord>> GetAllParticipantsAsync(CancellationToken ct = default)
        => await _participants.ReadAllAsync(ct);

    public async Task<IReadOnlyList<SupraChatParticipantRecord>> GetParticipantsByChatAsync(Guid chatId, CancellationToken ct = default)
        => (await _participants.ReadAllAsync(ct)).Where(p => p.ChatId == chatId).ToList();

    public async Task<IReadOnlyList<SupraChatParticipantRecord>> GetParticipantsByUserAsync(Guid userId, CancellationToken ct = default)
        => (await _participants.ReadAllAsync(ct)).Where(p => p.UserId == userId).ToList();

    public async Task SaveParticipantAsync(SupraChatParticipantRecord participant, CancellationToken ct = default)
    {
        var list = await _participants.ReadAllAsync(ct);
        var idx = list.FindIndex(p => p.ChatId == participant.ChatId && p.UserId == participant.UserId);
        if (idx >= 0)
            list[idx] = participant;
        else
            list.Add(participant);
        await _participants.WriteAllAsync(list, ct);
    }

    public async Task<bool> IsParticipantAsync(Guid chatId, Guid userId, CancellationToken ct = default)
        => (await _participants.ReadAllAsync(ct)).Any(p => p.ChatId == chatId && p.UserId == userId);

    public async Task<IReadOnlyList<SupraChatMessageRecord>> GetAllMessagesAsync(CancellationToken ct = default)
        => await _messages.ReadAllAsync(ct);

    public async Task<IReadOnlyList<SupraChatMessageRecord>> GetMessagesByChatAsync(Guid chatId, CancellationToken ct = default)
        => (await _messages.ReadAllAsync(ct)).Where(m => m.ChatId == chatId).ToList();

    public async Task<SupraChatMessageRecord?> GetMessageByIdAsync(Guid messageId, CancellationToken ct = default)
        => (await _messages.ReadAllAsync(ct)).FirstOrDefault(m => m.Id == messageId);

    public async Task<SupraChatMessageRecord?> GetMessageByClientLocalIdAsync(
        Guid chatId, Guid senderUserId, string clientLocalId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(clientLocalId)) return null;
        var key = clientLocalId.Trim();
        return (await _messages.ReadAllAsync(ct)).FirstOrDefault(m =>
            m.ChatId == chatId &&
            m.SenderUserId == senderUserId &&
            string.Equals(m.ClientLocalId, key, StringComparison.Ordinal));
    }

    public async Task SaveMessageAsync(SupraChatMessageRecord message, CancellationToken ct = default)
    {
        var list = await _messages.ReadAllAsync(ct);
        list.Add(message);
        await _messages.WriteAllAsync(list, ct);
    }

    public async Task UpdateMessageAsync(SupraChatMessageRecord message, CancellationToken ct = default)
    {
        var list = await _messages.ReadAllAsync(ct);
        var idx = list.FindIndex(m => m.Id == message.Id);
        if (idx < 0) return;
        list[idx] = message;
        await _messages.WriteAllAsync(list, ct);
    }

    public async Task<IReadOnlyList<SupraMessageUserDeletionRecord>> GetMessageUserDeletionsByUserAsync(
        Guid userId, CancellationToken ct = default)
        => (await _messageUserDeletions.ReadAllAsync(ct)).Where(d => d.UserId == userId).ToList();

    public async Task SaveMessageUserDeletionAsync(SupraMessageUserDeletionRecord deletion, CancellationToken ct = default)
        => await SaveMessageUserDeletionsAsync([deletion], ct);

    public async Task SaveMessageUserDeletionsAsync(IReadOnlyList<SupraMessageUserDeletionRecord> deletions, CancellationToken ct = default)
    {
        if (deletions.Count == 0) return;
        var list = await _messageUserDeletions.ReadAllAsync(ct);
        var changed = false;
        foreach (var deletion in deletions)
        {
            if (list.Any(d => d.MessageId == deletion.MessageId && d.UserId == deletion.UserId))
                continue;
            list.Add(deletion);
            changed = true;
        }
        if (changed)
            await _messageUserDeletions.WriteAllAsync(list, ct);
    }

    public async Task<bool> IsMessageDeletedForUserAsync(Guid messageId, Guid userId, CancellationToken ct = default)
        => (await _messageUserDeletions.ReadAllAsync(ct))
            .Any(d => d.MessageId == messageId && d.UserId == userId);

    public async Task<IReadOnlyList<SupraMessageReadReceiptRecord>> GetReadReceiptsByMessageAsync(
        Guid messageId, CancellationToken ct = default)
        => (await _messageReadReceipts.ReadAllAsync(ct))
            .Where(r => r.MessageId == messageId)
            .ToList();

    public async Task UpsertMessageReadReceiptAsync(SupraMessageReadReceiptRecord receipt, CancellationToken ct = default)
    {
        var list = await _messageReadReceipts.ReadAllAsync(ct);
        if (list.Any(r => r.MessageId == receipt.MessageId && r.UserId == receipt.UserId))
            return;
        list.Add(receipt);
        await _messageReadReceipts.WriteAllAsync(list, ct);
    }

    public async Task UpdateMessagesStatusAsync(Guid chatId, Guid readerUserId, string status, CancellationToken ct = default)
    {
        var list = await _messages.ReadAllAsync(ct);
        var changed = false;
        foreach (var m in list)
        {
            if (m.ChatId == chatId && m.SenderUserId != readerUserId && m.Status != status)
            {
                m.Status = status;
                changed = true;
            }
        }
        if (changed)
            await _messages.WriteAllAsync(list, ct);
    }

    public async Task DeleteMessagesByChatAsync(Guid chatId, CancellationToken ct = default)
    {
        var list = await _messages.ReadAllAsync(ct);
        list.RemoveAll(m => m.ChatId == chatId);
        await _messages.WriteAllAsync(list, ct);
    }

    public async Task DeleteParticipantAsync(Guid chatId, Guid userId, CancellationToken ct = default)
    {
        var list = await _participants.ReadAllAsync(ct);
        list.RemoveAll(p => p.ChatId == chatId && p.UserId == userId);
        await _participants.WriteAllAsync(list, ct);
    }

    public async Task DeleteChatAsync(Guid chatId, CancellationToken ct = default)
    {
        var chats = await _chats.ReadAllAsync(ct);
        chats.RemoveAll(c => c.Id == chatId);
        await _chats.WriteAllAsync(chats, ct);

        var parts = await _participants.ReadAllAsync(ct);
        parts.RemoveAll(p => p.ChatId == chatId);
        await _participants.WriteAllAsync(parts, ct);

        var msgs = await _messages.ReadAllAsync(ct);
        msgs.RemoveAll(m => m.ChatId == chatId);
        await _messages.WriteAllAsync(msgs, ct);

        await DeleteChatMemberKeysByChatAsync(chatId, ct);
    }

    public async Task<IReadOnlyList<SupraChatFolderRecord>> GetFoldersByUserAsync(Guid userId, CancellationToken ct = default)
        => (await _folders.ReadAllAsync(ct)).Where(f => f.UserId == userId).OrderBy(f => f.Order).ToList();

    public async Task SaveFolderAsync(SupraChatFolderRecord folder, CancellationToken ct = default)
    {
        var list = await _folders.ReadAllAsync(ct);
        var idx = list.FindIndex(f => f.Id == folder.Id);
        if (idx >= 0) list[idx] = folder;
        else list.Add(folder);
        await _folders.WriteAllAsync(list, ct);
    }

    public async Task DeleteFolderAsync(Guid folderId, CancellationToken ct = default)
    {
        var list = await _folders.ReadAllAsync(ct);
        list.RemoveAll(f => f.Id == folderId);
        await _folders.WriteAllAsync(list, ct);

        var members = await _folderMembers.ReadAllAsync(ct);
        members.RemoveAll(m => m.FolderId == folderId);
        await _folderMembers.WriteAllAsync(members, ct);
    }

    public async Task<IReadOnlyList<SupraChatFolderMemberRecord>> GetFolderMembersByUserAsync(Guid userId, CancellationToken ct = default)
        => (await _folderMembers.ReadAllAsync(ct)).Where(m => m.UserId == userId).ToList();

    public async Task SaveFolderMemberAsync(SupraChatFolderMemberRecord member, CancellationToken ct = default)
    {
        var list = await _folderMembers.ReadAllAsync(ct);
        if (list.Any(m => m.FolderId == member.FolderId && m.ChatId == member.ChatId && m.UserId == member.UserId))
            return;
        list.Add(member);
        await _folderMembers.WriteAllAsync(list, ct);
    }

    public async Task DeleteFolderMemberAsync(Guid folderId, Guid chatId, CancellationToken ct = default)
    {
        var list = await _folderMembers.ReadAllAsync(ct);
        list.RemoveAll(m => m.FolderId == folderId && m.ChatId == chatId);
        await _folderMembers.WriteAllAsync(list, ct);
    }

    public async Task DeleteFolderMembersByFolderAsync(Guid folderId, CancellationToken ct = default)
    {
        var list = await _folderMembers.ReadAllAsync(ct);
        list.RemoveAll(m => m.FolderId == folderId);
        await _folderMembers.WriteAllAsync(list, ct);
    }

    public async Task DeleteFolderMembersByChatAsync(Guid userId, Guid chatId, CancellationToken ct = default)
    {
        var list = await _folderMembers.ReadAllAsync(ct);
        list.RemoveAll(m => m.UserId == userId && m.ChatId == chatId);
        await _folderMembers.WriteAllAsync(list, ct);
    }

    public async Task<SupraFileRecord?> GetFileByIdAsync(Guid id, CancellationToken ct = default)
        => (await _files.ReadAllAsync(ct)).FirstOrDefault(f => f.Id == id);

    public async Task SaveFileAsync(SupraFileRecord file, CancellationToken ct = default)
    {
        var list = await _files.ReadAllAsync(ct);
        var idx = list.FindIndex(f => f.Id == file.Id);
        if (idx >= 0) list[idx] = file;
        else list.Add(file);
        await _files.WriteAllAsync(list, ct);
    }

    public async Task<IReadOnlyList<SupraUserBlockRecord>> GetUserBlocksAsync(CancellationToken ct = default)
        => await _userBlocks.ReadAllAsync(ct);

    public async Task SaveUserBlockAsync(SupraUserBlockRecord block, CancellationToken ct = default)
    {
        var list = await _userBlocks.ReadAllAsync(ct);
        list.RemoveAll(b => b.BlockerUserId == block.BlockerUserId && b.BlockedUserId == block.BlockedUserId);
        list.Add(block);
        await _userBlocks.WriteAllAsync(list, ct);
    }

    public async Task DeleteUserBlockAsync(Guid blockerUserId, Guid blockedUserId, CancellationToken ct = default)
    {
        var list = await _userBlocks.ReadAllAsync(ct);
        list.RemoveAll(b => b.BlockerUserId == blockerUserId && b.BlockedUserId == blockedUserId);
        await _userBlocks.WriteAllAsync(list, ct);
    }

    public async Task<IReadOnlyList<SupraChatRestrictionRecord>> GetChatRestrictionsAsync(CancellationToken ct = default)
        => await _chatRestrictions.ReadAllAsync(ct);

    public async Task SaveChatRestrictionAsync(SupraChatRestrictionRecord restriction, CancellationToken ct = default)
    {
        var list = await _chatRestrictions.ReadAllAsync(ct);
        list.RemoveAll(r => r.ChatId == restriction.ChatId && r.UserId == restriction.UserId);
        list.Add(restriction);
        await _chatRestrictions.WriteAllAsync(list, ct);
    }

    public async Task DeleteChatRestrictionAsync(Guid chatId, Guid userId, CancellationToken ct = default)
    {
        var list = await _chatRestrictions.ReadAllAsync(ct);
        list.RemoveAll(r => r.ChatId == chatId && r.UserId == userId);
        await _chatRestrictions.WriteAllAsync(list, ct);
    }

    public async Task<IReadOnlyList<SupraChatMemberKeyRecord>> GetAllChatMemberKeysAsync(CancellationToken ct = default)
        => await _chatMemberKeys.ReadAllAsync(ct);

    public async Task<IReadOnlyList<SupraChatMemberKeyRecord>> GetChatMemberKeysByChatAsync(Guid chatId, CancellationToken ct = default)
        => (await _chatMemberKeys.ReadAllAsync(ct)).Where(k => k.ChatId == chatId).ToList();

    public async Task<SupraChatMemberKeyRecord?> GetChatMemberKeyAsync(Guid chatId, Guid userId, CancellationToken ct = default)
        => (await _chatMemberKeys.ReadAllAsync(ct)).FirstOrDefault(k => k.ChatId == chatId && k.UserId == userId);

    public async Task SaveChatMemberKeyAsync(SupraChatMemberKeyRecord record, CancellationToken ct = default)
    {
        var list = await _chatMemberKeys.ReadAllAsync(ct);
        var idx = list.FindIndex(k => k.ChatId == record.ChatId && k.UserId == record.UserId);
        if (idx >= 0) list[idx] = record;
        else list.Add(record);
        await _chatMemberKeys.WriteAllAsync(list, ct);
    }

    public async Task DeleteChatMemberKeysByChatAsync(Guid chatId, CancellationToken ct = default)
    {
        var list = await _chatMemberKeys.ReadAllAsync(ct);
        list.RemoveAll(k => k.ChatId == chatId);
        await _chatMemberKeys.WriteAllAsync(list, ct);
    }

    public async Task DeleteChatMemberKeyAsync(Guid chatId, Guid userId, CancellationToken ct = default)
    {
        var list = await _chatMemberKeys.ReadAllAsync(ct);
        list.RemoveAll(k => k.ChatId == chatId && k.UserId == userId);
        await _chatMemberKeys.WriteAllAsync(list, ct);
    }

    public async Task DeleteChatMemberKeysForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var list = await _chatMemberKeys.ReadAllAsync(ct);
        list.RemoveAll(k => k.UserId == userId);
        await _chatMemberKeys.WriteAllAsync(list, ct);
    }

    public async Task SaveLoginChangeAsync(LoginChangeRecord record, CancellationToken ct = default)
    {
        var list = await _loginChanges.ReadAllAsync(ct);
        list.Add(record);
        await _loginChanges.WriteAllAsync(list, ct);
    }

    public async Task<IReadOnlyList<LoginChangeRecord>> GetLoginChangesForUsersAsync(
        IEnumerable<Guid> userIds, DateTime since, CancellationToken ct = default)
    {
        var ids = userIds.ToHashSet();
        if (ids.Count == 0) return [];
        return (await _loginChanges.ReadAllAsync(ct))
            .Where(c => ids.Contains(c.UserId) && c.ChangedOn >= since)
            .OrderBy(c => c.ChangedOn)
            .ToList();
    }
}
