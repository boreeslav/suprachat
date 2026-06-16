using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class SupraMessengerService
{
    sealed class ChatListSnapshot
    {
        public required List<SupraChatDto> Chats { get; init; }
        public required Dictionary<Guid, List<SupraChatMessageRecord>> VisibleMessagesByChat { get; init; }
        public required Dictionary<Guid, string?> AvatarByUser { get; init; }
    }

    async Task<ChatListSnapshot?> BuildChatListSnapshotAsync(Guid userId, CancellationToken ct)
    {
        var myParticipants = await _store.GetParticipantsByUserAsync(userId, ct);
        var chatIds = myParticipants.Select(p => p.ChatId).Distinct().ToList();
        if (chatIds.Count == 0)
            return new ChatListSnapshot
            {
                Chats = [],
                VisibleMessagesByChat = new Dictionary<Guid, List<SupraChatMessageRecord>>(),
                AvatarByUser = new Dictionary<Guid, string?>(),
            };

        var chatIdSet = chatIds.ToHashSet();
        var allChats = await _store.GetChatsAsync(ct);
        var allUsers = await _store.GetUsersAsync(ct);
        var avatarByUser = allUsers.ToDictionary(u => u.Id, AvatarUrl);
        var usersById = allUsers.ToDictionary(u => u.Id);
        var allParticipants = await _store.GetAllParticipantsAsync(ct);
        var participantsByChat = allParticipants
            .Where(p => chatIdSet.Contains(p.ChatId))
            .GroupBy(p => p.ChatId)
            .ToDictionary(g => g.Key, g => g.ToList());
        var allMemberKeys = await _store.GetAllChatMemberKeysAsync(ct);
        var memberKeyByChat = allMemberKeys
            .Where(k => k.UserId == userId && chatIdSet.Contains(k.ChatId))
            .ToDictionary(k => k.ChatId, k => k);
        var hiddenIds = await GetDeletedMessageIdsForUserAsync(userId, ct);
        var allMessages = await _store.GetAllMessagesAsync(ct);
        var visibleByChat = allMessages
            .Where(m => chatIdSet.Contains(m.ChatId) && !hiddenIds.Contains(m.Id) && !m.DeletedForEveryone)
            .GroupBy(m => m.ChatId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(m => m.CreatedOn).ThenBy(m => m.Id).ToList());

        var result = new List<SupraChatDto>();
        var branchDtoById = new Dictionary<Guid, SupraChatDto>();
        foreach (var chatId in chatIds)
        {
            var chat = allChats.FirstOrDefault(c => c.Id == chatId);
            if (chat == null) continue;
            if (await ShouldHideChatAsync(userId, chat, ct)) continue;

            var name = chat.Name;
            string? avatar = null;
            string? contactUserId = null;
            string? contactStatusText = null;
            DateTime? contactLastSeenAt = null;
            bool isBotContact = false;
            string? botSlug = null;
            bool botEngaged = false;
            if (string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
            {
                participantsByChat.TryGetValue(chatId, out var parts);
                var otherId = parts?.FirstOrDefault(p => p.UserId != userId)?.UserId;
                if (otherId.HasValue && usersById.TryGetValue(otherId.Value, out var other))
                {
                    name = other.DisplayName;
                    avatar = AvatarUrl(other);
                    contactUserId = other.Id.ToString();
                    contactStatusText = other.StatusText ?? "";
                    if (IsBotUser(other))
                    {
                        isBotContact = true;
                        var bot = await _store.GetBotByUserIdAsync(other.Id, ct);
                        botSlug = bot?.Slug;
                        botEngaged = await IsBotChatEngagedAsync(userId, other.Id, chatId, ct);
                    }
                    else if (await CanSeeOnlineStatusAsync(userId, other.Id, ct))
                        contactLastSeenAt = other.LastSeenAt;
                }
            }
            else if (IsGroupChat(chat))
            {
                avatar = GroupAvatarUrl(chat);
            }
            else if (IsChannelChat(chat))
            {
                avatar = ChannelAvatarUrl(chat);
            }

            visibleByChat.TryGetValue(chatId, out var chatMsgs);
            chatMsgs ??= [];
            var last = chatMsgs.LastOrDefault();
            var unread = IsChannelChat(chat)
                ? 0
                : chatMsgs.Count(m => m.SenderUserId != userId && m.Status != "read");
            memberKeyByChat.TryGetValue(chatId, out var memberKey);
            var isGroupCreator = IsGroupChat(chat) && chat.CreatorUserId == userId;
            var isAdmin = isGroupCreator || (IsGroupChat(chat)
                && participantsByChat.TryGetValue(chatId, out var groupParts)
                && groupParts.FirstOrDefault(p => p.UserId == userId)?.IsAdmin == true);

            var dto = new SupraChatDto
            {
                id = chatId.ToString(),
                name = name,
                type = chat.Type,
                avatar = avatar,
                contactUserId = contactUserId,
                contactStatusText = contactStatusText,
                contactLastSeenAt = contactLastSeenAt,
                lastMessage = last?.Text ?? "",
                lastMessageTime = last?.CreatedOn,
                aggregatedLastMessage = last?.Text ?? "",
                aggregatedLastMessageTime = last?.CreatedOn,
                unreadCount = unread,
                requiresCustomGroupPassword = chat.RequiresCustomGroupPassword,
                hasGroupAutoKey = memberKey != null,
                channelSlug = IsChannelChat(chat) ? chat.Slug : null,
                isBotContact = isBotContact,
                botSlug = botSlug,
                botEngaged = botEngaged,
                isAdmin = isAdmin,
                isGroupCreator = isGroupCreator,
                parentChatId = chat.ParentChatId?.ToString(),
                branchSlug = chat.BranchSlug,
                branchOrder = chat.BranchOrder,
            };

            if (IsGroupBranchChat(chat))
            {
                branchDtoById[chatId] = dto;
                continue;
            }

            result.Add(dto);
        }

        foreach (var dto in result)
        {
            if (!Guid.TryParse(dto.id, out var rootGuid)) continue;
            var rootChat = allChats.FirstOrDefault(c => c.Id == rootGuid);
            if (rootChat == null || !IsRootGroupChat(rootChat)) continue;

            var branches = await BuildBranchDtosForRootAsync(rootGuid, userId, visibleByChat, ct);
            dto.branches = branches;

            foreach (var branch in branches)
            {
                dto.unreadCount += branch.unreadCount;
                if (branch.lastMessageTime.HasValue &&
                    (!dto.aggregatedLastMessageTime.HasValue || branch.lastMessageTime > dto.aggregatedLastMessageTime))
                {
                    dto.aggregatedLastMessageTime = branch.lastMessageTime;
                    dto.aggregatedLastMessage = branch.lastMessage;
                }
            }
        }

        foreach (var branchDto in branchDtoById.Values)
            result.Add(branchDto);

        result = result.OrderByDescending(c => c.aggregatedLastMessageTime ?? c.lastMessageTime ?? DateTime.MinValue).ToList();
        return new ChatListSnapshot
        {
            Chats = result,
            VisibleMessagesByChat = visibleByChat,
            AvatarByUser = avatarByUser,
        };
    }

    static List<SupraChatMessageRecord> SliceMessagesAfterId(
        List<SupraChatMessageRecord> ordered,
        string? afterMessageId,
        int limit)
    {
        if (ordered.Count == 0) return [];
        List<SupraChatMessageRecord> tail;
        if (!string.IsNullOrWhiteSpace(afterMessageId) && Guid.TryParse(afterMessageId, out var afterGuid))
        {
            var anchor = ordered.FirstOrDefault(m => m.Id == afterGuid);
            tail = SliceAfterMessageId(ordered, afterGuid, anchor, ordered[0].ChatId);
        }
        else
        {
            tail = ordered;
        }

        return tail.Take(Math.Max(1, limit)).ToList();
    }

    public async Task<SupraGetChatsResponse> GetChatsAsync(Guid userId, CancellationToken ct = default)
    {
        try
        {
            var snapshot = await BuildChatListSnapshotAsync(userId, ct);
            if (snapshot == null)
                return new SupraGetChatsResponse { success = true, chats = [] };
            return new SupraGetChatsResponse { success = true, chats = snapshot.Chats };
        }
        catch (Exception ex)
        {
            return new SupraGetChatsResponse { success = false, chats = [], error = ex.Message };
        }
    }

    public async Task<SupraRequestSyncResponse> RequestSyncAsync(
        Guid userId,
        SupraRequestSyncRequest request,
        Func<Guid, Guid, CancellationToken, Task<SupraPublicProfileDto?>>? profileBuilder,
        Func<Guid, Guid, CancellationToken, Task<SupraSyncEncryptionKeyDto>>? encryptionKeyBuilder,
        CancellationToken ct = default)
    {
        try
        {
            var snapshot = await BuildChatListSnapshotAsync(userId, ct);
            if (snapshot == null)
                return new SupraRequestSyncResponse { success = true, chats = [] };

            var response = new SupraRequestSyncResponse
            {
                success = true,
                chats = snapshot.Chats,
            };

            var cursors = request.chatCursors ?? new Dictionary<string, string?>();
            var limit = Math.Clamp(request.messageLimit, 1, 100);

            foreach (var chat in snapshot.Chats)
            {
                if (!Guid.TryParse(chat.id, out var chatGuid)) continue;
                cursors.TryGetValue(chat.id, out var cursor);
                if (string.IsNullOrWhiteSpace(cursor)) continue;
                if (!snapshot.VisibleMessagesByChat.TryGetValue(chatGuid, out var ordered)) continue;

                var slice = SliceMessagesAfterId(ordered, cursor, limit);
                if (slice.Count == 0) continue;
                SupraChatRecord? chatRecord = string.Equals(chat.type, "channel", StringComparison.OrdinalIgnoreCase)
                    ? new SupraChatRecord { Type = "channel" }
                    : null;
                response.messagesByChat[chat.id] = slice
                    .Select(m => MapMessageDto(m, userId, snapshot.AvatarByUser, chatRecord))
                    .ToList();
            }

            if (request.includeProfiles && profileBuilder != null)
            {
                var contactIds = snapshot.Chats
                    .Select(c => c.contactUserId)
                    .Where(id => !string.IsNullOrEmpty(id))
                    .Select(id => Guid.Parse(id!))
                    .Distinct();
                foreach (var contactId in contactIds)
                {
                    var profile = await profileBuilder(userId, contactId, ct);
                    if (profile != null)
                        response.profiles[contactId.ToString()] = profile;
                }
            }

            if (request.includeEncryptionKeys && encryptionKeyBuilder != null)
            {
                foreach (var chat in snapshot.Chats)
                {
                    if (!Guid.TryParse(chat.id, out var chatGuid)) continue;
                    response.encryptionKeys[chat.id] = await encryptionKeyBuilder(userId, chatGuid, ct);
                }
            }

            return response;
        }
        catch (Exception ex)
        {
            return new SupraRequestSyncResponse { success = false, error = ex.Message };
        }
    }
}
