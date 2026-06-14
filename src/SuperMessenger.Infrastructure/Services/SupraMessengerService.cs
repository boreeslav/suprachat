using System.Text.Json;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class SupraMessengerService
{
    private readonly IDataStore _store;
    private readonly ChatFileService _files;
    private readonly ChatActivityTracker _activities;

    public SupraMessengerService(IDataStore store, ChatFileService files, ChatActivityTracker activities)
    {
        _store = store;
        _files = files;
        _activities = activities;
    }

    private static string? AvatarUrl(UserRecord? user) => AvatarUrlHelper.ForUser(user);

    const string McContentTag = "mc-content";
    const string SystemEventType = "system_event";

    private static string? GroupAvatarUrl(SupraChatRecord? chat) => AvatarUrlHelper.ForGroup(chat);

    public async Task<SupraWsNewMessagePayload?> InsertGroupSystemEventAsync(
        SupraChatRecord chat,
        UserRecord actor,
        string kind,
        IReadOnlyDictionary<string, string?> data,
        CancellationToken ct = default)
    {
        var payloadObj = new Dictionary<string, object?> { ["kind"] = kind };
        foreach (var kv in data)
            payloadObj[kv.Key] = kv.Value;
        var json = JsonSerializer.Serialize(payloadObj);
        var text = $"<{McContentTag} type=\"{SystemEventType}\">{json}</{McContentTag}>";

        var msgGuid = Guid.NewGuid();
        var now = DateTime.UtcNow;
        await _store.SaveMessageAsync(new SupraChatMessageRecord
        {
            Id = msgGuid,
            ChatId = chat.Id,
            SenderUserId = actor.Id,
            SenderName = "",
            Text = text,
            Status = "read",
            CreatedOn = now,
        }, ct);

        return new SupraWsNewMessagePayload
        {
            chatId = chat.Id.ToString(),
            messageId = msgGuid.ToString(),
            senderId = actor.Id.ToString(),
            senderName = "",
            senderAvatar = null,
            text = text,
            timestamp = now,
            status = "read",
            isOwn = false,
        };
    }

    public static bool IsGroupChat(SupraChatRecord chat) =>
        string.Equals(chat.Type, "group", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(chat.Type, "public_group", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(chat.Type, "group_branch", StringComparison.OrdinalIgnoreCase);

    async Task<bool> IsGroupModeratorAsync(Guid userId, SupraChatRecord? chat, CancellationToken ct)
    {
        if (chat == null || !IsGroupChat(chat)) return false;
        if (chat.CreatorUserId == userId) return true;
        var me = (await _store.GetParticipantsByChatAsync(chat.Id, ct))
            .FirstOrDefault(p => p.UserId == userId);
        return me?.IsAdmin == true;
    }

    async Task<bool> CanDeleteMessageForEveryoneAsync(
        Guid userId, SupraChatRecord? chat, Guid senderUserId, CancellationToken ct)
    {
        if (senderUserId == userId) return true;
        if (await IsGroupModeratorAsync(userId, chat, ct)) return true;

        if (chat != null && IsChannelChat(chat))
        {
            var me = (await _store.GetParticipantsByChatAsync(chat.Id, ct))
                .FirstOrDefault(p => p.UserId == userId);
            if (me != null)
            {
                var role = ResolveParticipantRole(me, chat);
                if (ChannelRoles.CanManageMembers(role))
                    return true;
            }
        }

        if (chat != null && string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
        {
            var deleter = await _store.GetUserByIdAsync(userId, ct);
            if (IsBotUser(deleter))
            {
                var parts = await _store.GetParticipantsByChatAsync(chat.Id, ct);
                var otherId = parts.FirstOrDefault(p => p.UserId != userId)?.UserId;
                if (otherId == senderUserId) return true;
            }
        }

        return false;
    }

    /// <summary>Инфо о чате для пуш-уведомления: групповой ли и его название (для групп).</summary>
    public async Task<(bool isGroup, string name)?> GetChatNotificationInfoAsync(Guid chatId, CancellationToken ct = default)
    {
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        if (chat == null) return null;
        return (IsGroupChat(chat) || IsChannelChat(chat), chat.Name ?? "");
    }

    public async Task<SupraGetCurrentUserResponse> GetCurrentUserAsync(UserRecord user, CancellationToken ct = default)
    {
        try
        {
            uint hash = 0;
            foreach (var c in user.Id.ToString("N"))
                hash = hash * 31 + c;
            return new SupraGetCurrentUserResponse
            {
                success = true,
                user = new SupraCurrentUserDto
                {
                    id = user.Id.ToString(),
                    login = user.Login,
                    name = user.DisplayName,
                    avatar = AvatarUrlHelper.ForUser(user),
                    colorSeed = (hash % 10000).ToString(),
                    userType = user.Type.ToString(),
                    statusText = user.StatusText ?? "",
                    encryptionConfigured = !string.IsNullOrEmpty(user.EncryptionSalt)
                        && !string.IsNullOrEmpty(user.EncryptionVerifier)
                        && !string.IsNullOrEmpty(user.EncryptionPublicKey),
                },
            };
        }
        catch (Exception ex)
        {
            return new SupraGetCurrentUserResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraGetContactsResponse> GetContactsAsync(
        Guid userId, int page, int rowCount, string searchQuery, CancellationToken ct = default)
    {
        try
        {
            var query = searchQuery?.Trim() ?? "";
            if (query.Length == 0)
            {
                return new SupraGetContactsResponse
                {
                    success = true,
                    contacts = [],
                    page = page,
                    rowCount = rowCount,
                };
            }
            if (query.Length < 4)
            {
                return new SupraGetContactsResponse
                {
                    success = true,
                    contacts = [],
                    page = page,
                    rowCount = rowCount,
                };
            }

            var users = (await _store.GetUsersAsync(ct))
                .Where(u => u.IsActive && u.Id != userId && u.Type != UserType.Admin && u.Type != UserType.Bot)
                .Where(u =>
                    (u.SearchableByLogin && u.Login.Contains(query, StringComparison.OrdinalIgnoreCase)) ||
                    (u.SearchableByName && u.DisplayName.Contains(query, StringComparison.OrdinalIgnoreCase)));

            var filtered = new List<UserRecord>();
            foreach (var u in users)
            {
                if (await IsUserVisibleInContactsAsync(userId, u.Id, ct))
                    filtered.Add(u);
            }

            foreach (var bot in await FindBotsMatchingSearchAsync(userId, query, ct))
            {
                if (filtered.All(u => u.Id != bot.Id))
                    filtered.Add(bot);
            }

            var list = filtered.OrderBy(u => u.DisplayName)
                .Skip((page - 1) * rowCount)
                .Take(rowCount)
                .Select(u => MapContactDto(u, AvatarUrl(u)))
                .ToList();

            return new SupraGetContactsResponse
            {
                success = true,
                contacts = list,
                page = page,
                rowCount = rowCount,
            };
        }
        catch (Exception ex)
        {
            return new SupraGetContactsResponse { success = false, contacts = [], error = ex.Message };
        }
    }

    public async Task<(SupraMarkReadResponse response, List<(SupraWsStatusPayload payload, Guid senderUserId)> updates)> MarkMessagesReadAsync(
        Guid userId, string chatId, CancellationToken ct = default)
    {
        try
        {
            var chatGuid = Guid.Parse(chatId);
            if (!await _store.IsParticipantAsync(chatGuid, userId, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat != null && IsChannelChat(chat))
                return (new SupraMarkReadResponse { success = true }, []);

            var messages = (await _store.GetMessagesByChatAsync(chatGuid, ct))
                .Where(m => m.SenderUserId != userId && m.Status != "read")
                .ToList();

            var readAt = DateTime.UtcNow;
            foreach (var m in messages)
            {
                await _store.UpsertMessageReadReceiptAsync(new SupraMessageReadReceiptRecord
                {
                    MessageId = m.Id,
                    UserId = userId,
                    ReadAt = readAt,
                }, ct);
            }

            await _store.UpdateMessagesStatusAsync(chatGuid, userId, "read", ct);

            var updates = messages.Select(m => (
                new SupraWsStatusPayload
                {
                    chatId = chatGuid.ToString(),
                    messageId = m.Id.ToString(),
                    status = "read",
                },
                m.SenderUserId)).ToList();

            return (new SupraMarkReadResponse { success = true }, updates);
        }
        catch (Exception ex)
        {
            return (new SupraMarkReadResponse { success = false, error = ex.Message }, []);
        }
    }

    public async Task<(SupraCreateChatResponse response, SupraWsNewChatPayload? notify)> CreateDirectChatAsync(
        UserRecord user, string contactId, CancellationToken ct = default)
    {
        try
        {
            var targetId = Guid.Parse(contactId);
            if (targetId == user.Id)
                return (new SupraCreateChatResponse { success = false, error = "Нельзя создать чат с самим собой" }, null);

            var target = await _store.GetUserByIdAsync(targetId, ct);
            if (target == null)
                return (new SupraCreateChatResponse { success = false, error = "Контакт не найден" }, null);

            if (IsBotUser(target))
            {
                var bot = await _store.GetBotByUserIdAsync(targetId, ct);
                if (bot == null || IsBotDeleted(bot))
                    return (new SupraCreateChatResponse { success = false, error = "Бот недоступен" }, null);
            }

            if (await HasUserBlockAsync(targetId, user.Id, ct))
                return (new SupraCreateChatResponse { success = false, error = "Пользователь вас заблокировал" }, null);

            if (!await CanWriteAsync(user.Id, targetId, ct))
                return (new SupraCreateChatResponse { success = false, error = "Пользователь ограничил входящие сообщения" }, null);

            if (await HasUserBlockAsync(user.Id, targetId, ct))
                await _store.DeleteUserBlockAsync(user.Id, targetId, ct);

            var myChats = await _store.GetParticipantsByUserAsync(user.Id, ct);
            foreach (var p in myChats)
            {
                var chat = await _store.GetChatByIdAsync(p.ChatId, ct);
                if (chat == null || !string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
                    continue;
                var parts = await _store.GetParticipantsByChatAsync(p.ChatId, ct);
                if (parts.Any(x => x.UserId == targetId))
                {
                    var existingBotEngaged = IsBotUser(target)
                        ? await IsBotChatEngagedAsync(user.Id, targetId, p.ChatId, ct)
                        : false;
                    return (new SupraCreateChatResponse
                    {
                        success = true,
                        chatId = p.ChatId.ToString(),
                        chatName = target.DisplayName,
                        isBotContact = IsBotUser(target),
                        botSlug = IsBotUser(target)
                            ? (await _store.GetBotByUserIdAsync(targetId, ct))?.Slug
                            : null,
                        botEngaged = existingBotEngaged,
                    }, null);
                }
            }

            var chatGuid = Guid.NewGuid();
            await _store.SaveChatAsync(new SupraChatRecord
            {
                Id = chatGuid,
                Name = target.DisplayName,
                Type = "direct",
            }, ct);
            await _store.SaveParticipantAsync(new SupraChatParticipantRecord
            {
                Id = Guid.NewGuid(),
                ChatId = chatGuid,
                UserId = user.Id,
            }, ct);
            await _store.SaveParticipantAsync(new SupraChatParticipantRecord
            {
                Id = Guid.NewGuid(),
                ChatId = chatGuid,
                UserId = targetId,
            }, ct);

            string? botSlug = null;
            if (IsBotUser(target))
                botSlug = (await _store.GetBotByUserIdAsync(targetId, ct))?.Slug;

            return (new SupraCreateChatResponse
            {
                success = true,
                chatId = chatGuid.ToString(),
                chatName = target.DisplayName,
                isBotContact = IsBotUser(target),
                botSlug = botSlug,
                botEngaged = false,
            }, new SupraWsNewChatPayload
            {
                chatId = chatGuid.ToString(),
                chatName = user.DisplayName,
                chatType = "direct",
                chatAvatar = AvatarUrl(user),
            });
        }
        catch (Exception ex)
        {
            return (new SupraCreateChatResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<SupraWsNewChatPayload?> EnsureDirectChatAfterRegistrationAsync(
        UserRecord newUser, UserRecord inviter, CancellationToken ct = default)
    {
        if (newUser.Id == inviter.Id)
            return null;

        var myChats = await _store.GetParticipantsByUserAsync(newUser.Id, ct);
        foreach (var p in myChats)
        {
            var chat = await _store.GetChatByIdAsync(p.ChatId, ct);
            if (chat == null || !string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
                continue;
            var parts = await _store.GetParticipantsByChatAsync(p.ChatId, ct);
            if (parts.Any(x => x.UserId == inviter.Id))
                return null;
        }

        var chatGuid = Guid.NewGuid();
        await _store.SaveChatAsync(new SupraChatRecord
        {
            Id = chatGuid,
            Name = inviter.DisplayName,
            Type = "direct",
            CreatorUserId = newUser.Id,
        }, ct);
        await _store.SaveParticipantAsync(new SupraChatParticipantRecord
        {
            Id = Guid.NewGuid(),
            ChatId = chatGuid,
            UserId = newUser.Id,
        }, ct);
        await _store.SaveParticipantAsync(new SupraChatParticipantRecord
        {
            Id = Guid.NewGuid(),
            ChatId = chatGuid,
            UserId = inviter.Id,
        }, ct);

        return new SupraWsNewChatPayload
        {
            chatId = chatGuid.ToString(),
            chatName = newUser.DisplayName,
            chatType = "direct",
            chatAvatar = AvatarUrl(newUser),
        };
    }

    public async Task<(SupraCreateChatResponse response, List<SupraWsNewChatPayload> notifies)> CreateGroupAsync(
        UserRecord user, string name, List<string> participantIds, CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(name))
                return (new SupraCreateChatResponse { success = false, error = "Название группы не указано" }, []);

            var chatGuid = Guid.NewGuid();
            await _store.SaveChatAsync(new SupraChatRecord
            {
                Id = chatGuid,
                Name = name,
                Type = "group",
                CreatorUserId = user.Id,
            }, ct);
            await _store.SaveParticipantAsync(new SupraChatParticipantRecord
            {
                Id = Guid.NewGuid(),
                ChatId = chatGuid,
                UserId = user.Id,
                IsAdmin = true,
            }, ct);

            var notifies = new List<SupraWsNewChatPayload>();
            foreach (var idStr in participantIds)
            {
                if (!Guid.TryParse(idStr, out var pid) || pid == user.Id) continue;
                await _store.SaveParticipantAsync(new SupraChatParticipantRecord
                {
                    Id = Guid.NewGuid(),
                    ChatId = chatGuid,
                    UserId = pid,
                }, ct);
                notifies.Add(new SupraWsNewChatPayload
                {
                    chatId = chatGuid.ToString(),
                    chatName = name,
                    chatType = "group",
                });
            }

            return (new SupraCreateChatResponse
            {
                success = true,
                chatId = chatGuid.ToString(),
                chatName = name,
            }, notifies);
        }
        catch (Exception ex)
        {
            return (new SupraCreateChatResponse { success = false, error = ex.Message }, []);
        }
    }

    public async Task<SupraGetOrCreateChatByIdResponse> GetOrCreateChatByIdAsync(
        UserRecord user, string chatId, string chatName, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return new SupraGetOrCreateChatByIdResponse { success = false, error = "Некорректный chatId" };
            if (string.IsNullOrWhiteSpace(chatName))
                return new SupraGetOrCreateChatByIdResponse { success = false, error = "chatName не может быть пустым" };

            var existing = await _store.GetChatByIdAsync(chatGuid, ct);
            if (existing == null)
            {
                await _store.SaveChatAsync(new SupraChatRecord
                {
                    Id = chatGuid,
                    Name = chatName.Trim(),
                    Type = "public_group",
                }, ct);
            }
            else
            {
                chatName = existing.Name;
            }

            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
            {
                await _store.SaveParticipantAsync(new SupraChatParticipantRecord
                {
                    Id = Guid.NewGuid(),
                    ChatId = chatGuid,
                    UserId = user.Id,
                }, ct);
            }

            return new SupraGetOrCreateChatByIdResponse
            {
                success = true,
                chatId = chatGuid.ToString(),
                chatName = chatName.Trim(),
            };
        }
        catch (Exception ex)
        {
            return new SupraGetOrCreateChatByIdResponse { success = false, error = ex.Message };
        }
    }

    public (SupraSendActivityResponse response, SupraWsUserActivityPayload? broadcast) SendUserActivity(
        string chatId,
        string activityType,
        bool active,
        UserRecord user,
        string? activityMessage = null)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new SupraSendActivityResponse { success = false, error = "Некорректный chatId" }, null);
            if (string.IsNullOrWhiteSpace(activityType))
                return (new SupraSendActivityResponse { success = false, error = "activityType не может быть пустым" }, null);

            _activities.Set(chatGuid, user.Id, user.DisplayName, activityType, active, activityMessage);
            var payload = _activities.BuildPayload(
                chatGuid, user.Id, user.DisplayName, activityType, active, activityMessage);
            return (new SupraSendActivityResponse { success = true }, payload);
        }
        catch (Exception ex)
        {
            return (new SupraSendActivityResponse { success = false, error = ex.Message }, null);
        }
    }

    public List<SupraChatActivityDto> GetUserActivitiesInChat(Guid chatId, Guid userId) =>
        _activities.GetActiveForUserInChat(chatId, userId);

    public async Task<List<Guid>> GetParticipantUserIdsAsync(Guid chatId, Guid excludeUserId, CancellationToken ct = default)
    {
        var parts = await _store.GetParticipantsByChatAsync(chatId, ct);
        return parts.Where(p => p.UserId != excludeUserId).Select(p => p.UserId).ToList();
    }

    public async Task<List<Guid>> GetAllParticipantUserIdsAsync(Guid chatId, CancellationToken ct = default)
    {
        var parts = await _store.GetParticipantsByChatAsync(chatId, ct);
        return parts.Select(p => p.UserId).Distinct().ToList();
    }

    public async Task<List<Guid>> GetDirectContactUserIdsAsync(Guid userId, CancellationToken ct = default)
    {
        var myParticipants = await _store.GetParticipantsByUserAsync(userId, ct);
        var chatIds = myParticipants.Select(p => p.ChatId).Distinct().ToList();
        if (chatIds.Count == 0) return [];

        var allChats = await _store.GetChatsAsync(ct);
        var result = new List<Guid>();
        foreach (var chatId in chatIds)
        {
            var chat = allChats.FirstOrDefault(c => c.Id == chatId);
            if (chat == null || !string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
                continue;
            var parts = await _store.GetParticipantsByChatAsync(chatId, ct);
            var otherId = parts.FirstOrDefault(p => p.UserId != userId)?.UserId;
            if (otherId.HasValue) result.Add(otherId.Value);
        }
        return result.Distinct().ToList();
    }

    public async Task<List<Guid>> GetChatContactUserIdsAsync(Guid userId, CancellationToken ct = default)
    {
        var myParticipants = await _store.GetParticipantsByUserAsync(userId, ct);
        var chatIds = myParticipants.Select(p => p.ChatId).Distinct().ToList();
        if (chatIds.Count == 0) return [];

        var result = new HashSet<Guid>();
        foreach (var chatId in chatIds)
        {
            var parts = await _store.GetParticipantsByChatAsync(chatId, ct);
            foreach (var p in parts.Where(p => p.UserId != userId))
                result.Add(p.UserId);
        }
        return result.ToList();
    }

    public async Task<bool> CanSeeOnlineStatusAsync(Guid viewerId, Guid targetUserId, CancellationToken ct = default)
    {
        if (viewerId == targetUserId) return true;
        var target = await _store.GetUserByIdAsync(targetUserId, ct);
        if (target == null) return false;
        var policy = string.IsNullOrEmpty(target.ShowOnlineStatus) ? "everyone" : target.ShowOnlineStatus;
        if (string.Equals(policy, "everyone", StringComparison.OrdinalIgnoreCase)) return true;
        var contacts = await GetDirectContactUserIdsAsync(targetUserId, ct);
        return contacts.Contains(viewerId);
    }

    public async Task<SupraGetContactsResponse> GetAllContactsAsync(
        Guid userId, int page, int rowCount, string searchQuery, bool chatContactsOnly = false, CancellationToken ct = default)
    {
        try
        {
            var query = searchQuery?.Trim() ?? "";
            var users = (await _store.GetUsersAsync(ct))
                .Where(u => u.IsActive && u.Id != userId && u.Type != UserType.Admin);

            if (chatContactsOnly)
            {
                var chatContactIds = (await GetChatContactUserIdsAsync(userId, ct)).ToHashSet();
                users = users.Where(u => chatContactIds.Contains(u.Id));
                if (!string.IsNullOrEmpty(query))
                {
                    users = users.Where(u =>
                        u.DisplayName.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                        (u.SearchableByLogin && u.Login.Contains(query, StringComparison.OrdinalIgnoreCase)));
                }
            }
            else if (!string.IsNullOrEmpty(query) && query.Length >= 4)
            {
                var regularUsers = users
                    .Where(u => u.Type != UserType.Bot)
                    .Where(u =>
                        (u.SearchableByLogin && u.Login.Contains(query, StringComparison.OrdinalIgnoreCase)) ||
                        (u.SearchableByName && u.DisplayName.Contains(query, StringComparison.OrdinalIgnoreCase)));

                var searchMatches = new List<UserRecord>();
                foreach (var u in regularUsers)
                {
                    if (await IsUserVisibleInContactsAsync(userId, u.Id, ct))
                        searchMatches.Add(u);
                }

                foreach (var bot in await FindBotsMatchingSearchAsync(userId, query, ct))
                {
                    if (searchMatches.All(u => u.Id != bot.Id))
                        searchMatches.Add(bot);
                }

                users = searchMatches;
            }
            else if (!string.IsNullOrEmpty(query))
            {
                users = users.Where(_ => false);
            }
            else
            {
                var existingContactIds = (await GetChatContactUserIdsAsync(userId, ct)).ToHashSet();
                users = users.Where(u => existingContactIds.Contains(u.Id));
            }

            var visible = new List<UserRecord>();
            foreach (var u in users)
            {
                if (await IsUserVisibleInContactsAsync(userId, u.Id, ct))
                    visible.Add(u);
            }

            var list = visible.OrderBy(u => u.DisplayName)
                .Skip((page - 1) * rowCount)
                .Take(rowCount)
                .Select(u => MapContactDto(u, AvatarUrl(u)))
                .ToList();

            return new SupraGetContactsResponse { success = true, contacts = list, page = page, rowCount = rowCount };
        }
        catch (Exception ex)
        {
            return new SupraGetContactsResponse { success = false, contacts = [], error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> ClearChatHistoryAsync(
        UserRecord user, string chatId, bool alsoDeleteForOther, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return new SupraSimpleResponse { success = false, error = "Некорректный chatId" };
            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                return new SupraSimpleResponse { success = false, error = "Нет доступа" };

            if (alsoDeleteForOther)
            {
                await _files.ReleaseChatAttachmentsAsync(chatGuid, ct);
                await _store.DeleteMessagesByChatAsync(chatGuid, ct);
            }
            else
            {
                // For now clear all messages; full per-user deletion would require schema changes
                await _files.ReleaseChatAttachmentsAsync(chatGuid, ct);
                await _store.DeleteMessagesByChatAsync(chatGuid, ct);
            }
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(SupraSimpleResponse response, bool chatDeleted, List<Guid> remainingParticipants)> LeaveChatAsync(
        UserRecord user, string chatId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new SupraSimpleResponse { success = false, error = "Некорректный chatId" }, false, []);
            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                return (new SupraSimpleResponse { success = false, error = "Нет доступа" }, false, []);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat != null && IsGroupChat(chat))
            {
                var rootId = await ResolveRootGroupIdAsync(chatGuid, ct);
                chat = await _store.GetChatByIdAsync(rootId, ct);
                chatGuid = rootId;
                var family = await GetGroupFamilyChatsAsync(rootId, ct);
                var wasCreator = chat != null && chat.CreatorUserId == user.Id;

                foreach (var familyChat in family)
                {
                    await _store.DeleteParticipantAsync(familyChat.Id, user.Id, ct);
                    await _store.DeleteFolderMembersByChatAsync(user.Id, familyChat.Id, ct);
                }

                if (wasCreator && chat != null)
                    await TransferGroupCreatorAsync(chat, ct);

                var remaining = (await _store.GetParticipantsByChatAsync(chatGuid, ct))
                    .Select(p => p.UserId).ToList();

                if (remaining.Count == 0)
                {
                    foreach (var familyChat in family)
                    {
                        if (IsGroupBranchChat(familyChat))
                            await DeleteBranchChatFullyAsync(familyChat, ct);
                        else
                        {
                            await _files.ReleaseChatAttachmentsAsync(familyChat.Id, ct);
                            await _store.DeleteChatAsync(familyChat.Id, ct);
                        }
                    }
                    return (new SupraSimpleResponse { success = true }, true, []);
                }

                return (new SupraSimpleResponse { success = true }, false, remaining);
            }

            var wasCreatorLegacy = chat != null && IsGroupChat(chat) && chat.CreatorUserId == user.Id;

            await _store.DeleteParticipantAsync(chatGuid, user.Id, ct);
            await _store.DeleteFolderMembersByChatAsync(user.Id, chatGuid, ct);

            if (wasCreatorLegacy && chat != null)
                await TransferGroupCreatorAsync(chat, ct);

            var remainingLegacy = (await _store.GetParticipantsByChatAsync(chatGuid, ct))
                .Select(p => p.UserId).ToList();

            if (remainingLegacy.Count == 0)
            {
                await _files.ReleaseChatAttachmentsAsync(chatGuid, ct);
                await _store.DeleteChatAsync(chatGuid, ct);
                return (new SupraSimpleResponse { success = true }, true, []);
            }

            return (new SupraSimpleResponse { success = true }, false, remainingLegacy);
        }
        catch (Exception ex)
        {
            return (new SupraSimpleResponse { success = false, error = ex.Message }, false, []);
        }
    }

    public async Task<bool> CanWriteAsync(Guid writerId, Guid targetUserId, CancellationToken ct = default)
    {
        if (writerId == targetUserId) return true;
        var target = await _store.GetUserByIdAsync(targetUserId, ct);
        if (target == null) return false;
        var policy = string.IsNullOrEmpty(target.AllowWrite) ? "everyone" : target.AllowWrite;
        if (string.Equals(policy, "everyone", StringComparison.OrdinalIgnoreCase)) return true;
        var contacts = await GetDirectContactUserIdsAsync(targetUserId, ct);
        return contacts.Contains(writerId);
    }

    async Task<SupraChatFolderRecord> EnsureArchiveFolderAsync(Guid userId, CancellationToken ct)
    {
        var folders = await _store.GetFoldersByUserAsync(userId, ct);
        var archive = folders.FirstOrDefault(f => f.IsArchive);
        if (archive != null) return archive;

        archive = new SupraChatFolderRecord
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Archive",
            Icon = "",
            Order = 0,
            IsArchive = true,
        };
        await _store.SaveFolderAsync(archive, ct);
        return archive;
    }

    public async Task<SupraGetFoldersResponse> GetFoldersAsync(Guid userId, CancellationToken ct = default)
    {
        try
        {
            await EnsureArchiveFolderAsync(userId, ct);
            var folders = (await _store.GetFoldersByUserAsync(userId, ct))
                .OrderBy(f => f.IsArchive ? 0 : 1)
                .ThenBy(f => f.Order)
                .ToList();
            var members = await _store.GetFolderMembersByUserAsync(userId, ct);
            return new SupraGetFoldersResponse
            {
                success = true,
                folders = folders.Select(f => new SupraFolderDto
                {
                    id = f.Id.ToString(),
                    name = f.Name,
                    icon = f.Icon,
                    order = f.Order,
                    isArchive = f.IsArchive,
                }).ToList(),
                members = members.Select(m => new SupraFolderMemberDto
                {
                    folderId = m.FolderId.ToString(),
                    chatId = m.ChatId.ToString(),
                }).ToList(),
            };
        }
        catch (Exception ex)
        {
            return new SupraGetFoldersResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSaveFolderResponse> SaveFolderAsync(
        Guid userId, string? folderId, string name, string icon, CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(name))
                return new SupraSaveFolderResponse { success = false, error = "Название папки не может быть пустым" };

            var guid = Guid.TryParse(folderId, out var existingId) ? existingId : Guid.NewGuid();
            var allFolders = await _store.GetFoldersByUserAsync(userId, ct);
            var existing = allFolders.FirstOrDefault(f => f.Id == guid);
            if (existing?.IsArchive == true)
                return new SupraSaveFolderResponse { success = false, error = "Системную папку нельзя изменить" };

            var folder = existing ?? new SupraChatFolderRecord { Id = guid, UserId = userId };
            folder.Name = name.Trim()[..Math.Min(name.Trim().Length, 50)];
            folder.Icon = icon ?? "";
            if (existing == null)
                folder.Order = allFolders.Where(f => !f.IsArchive).Select(f => f.Order).DefaultIfEmpty(0).Max() + 1;
            await _store.SaveFolderAsync(folder, ct);
            return new SupraSaveFolderResponse { success = true, folderId = guid.ToString() };
        }
        catch (Exception ex)
        {
            return new SupraSaveFolderResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> DeleteFolderAsync(Guid userId, string folderId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(folderId, out var guid))
                return new SupraSimpleResponse { success = false, error = "Некорректный folderId" };
            var folder = (await _store.GetFoldersByUserAsync(userId, ct)).FirstOrDefault(f => f.Id == guid);
            if (folder == null) return new SupraSimpleResponse { success = false, error = "Папка не найдена" };
            if (folder.IsArchive)
                return new SupraSimpleResponse { success = false, error = "Системную папку нельзя удалить" };
            await _store.DeleteFolderAsync(guid, ct);
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> SetChatFolderAsync(
        Guid userId, string chatId, string folderId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return new SupraSimpleResponse { success = false, error = "Некорректный chatId" };
            if (!Guid.TryParse(folderId, out var folderGuid))
                return new SupraSimpleResponse { success = false, error = "Некорректный folderId" };
            if (!await _store.IsParticipantAsync(chatGuid, userId, ct))
                return new SupraSimpleResponse { success = false, error = "Нет доступа" };

            await _store.SaveFolderMemberAsync(new SupraChatFolderMemberRecord
            {
                Id = Guid.NewGuid(),
                FolderId = folderGuid,
                UserId = userId,
                ChatId = chatGuid,
            }, ct);
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> ReorderFoldersAsync(
        Guid userId, List<string> folderIds, CancellationToken ct = default)
    {
        try
        {
            var folders = await _store.GetFoldersByUserAsync(userId, ct);
            var archive = folders.FirstOrDefault(f => f.IsArchive);
            if (archive != null)
            {
                archive.Order = 0;
                await _store.SaveFolderAsync(archive, ct);
            }
            var order = 1;
            foreach (var idStr in folderIds)
            {
                if (!Guid.TryParse(idStr, out var id)) continue;
                var folder = folders.FirstOrDefault(f => f.Id == id);
                if (folder == null || folder.IsArchive) continue;
                folder.Order = order++;
                await _store.SaveFolderAsync(folder, ct);
            }
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> RemoveChatFromFolderAsync(
        Guid userId, string chatId, string? folderId = null, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return new SupraSimpleResponse { success = false, error = "Некорректный chatId" };
            if (!string.IsNullOrEmpty(folderId))
            {
                if (!Guid.TryParse(folderId, out var folderGuid))
                    return new SupraSimpleResponse { success = false, error = "Некорректный folderId" };
                var folders = await _store.GetFoldersByUserAsync(userId, ct);
                if (folders.All(f => f.Id != folderGuid))
                    return new SupraSimpleResponse { success = false, error = "Папка не найдена" };
                await _store.DeleteFolderMemberAsync(folderGuid, chatGuid, ct);
            }
            else
            {
                await _store.DeleteFolderMembersByChatAsync(userId, chatGuid, ct);
            }
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    async Task EnsureGroupMetadataAsync(SupraChatRecord chat, CancellationToken ct)
    {
        if (!IsGroupChat(chat)) return;
        var parts = (await _store.GetParticipantsByChatAsync(chat.Id, ct)).ToList();
        if (parts.Count == 0) return;

        var changed = false;
        if (chat.CreatorUserId == Guid.Empty)
        {
            var creatorPart = parts.FirstOrDefault(p => p.IsAdmin) ?? parts[0];
            chat.CreatorUserId = creatorPart.UserId;
            changed = true;
        }

        foreach (var p in parts)
        {
            if (p.UserId == chat.CreatorUserId && !p.IsAdmin)
            {
                p.IsAdmin = true;
                await _store.SaveParticipantAsync(p, ct);
            }
        }

        if (changed)
            await _store.SaveChatAsync(chat, ct);
    }

    async Task TransferGroupCreatorAsync(SupraChatRecord chat, CancellationToken ct)
    {
        var parts = (await _store.GetParticipantsByChatAsync(chat.Id, ct)).ToList();
        var admins = parts.Where(p => p.IsAdmin).ToList();
        if (admins.Count > 0)
        {
            var newCreator = admins[Random.Shared.Next(admins.Count)];
            chat.CreatorUserId = newCreator.UserId;
            await _store.SaveChatAsync(chat, ct);
            return;
        }

        chat.CreatorUserId = Guid.Empty;
        await _store.SaveChatAsync(chat, ct);
        foreach (var p in parts)
        {
            if (p.IsAdmin)
            {
                p.IsAdmin = false;
                await _store.SaveParticipantAsync(p, ct);
            }
        }
    }

    async Task<(SupraChatRecord? chat, SupraChatParticipantRecord? me, string? error)> GetGroupAccessAsync(
        Guid userId, string chatId, CancellationToken ct)
    {
        if (!Guid.TryParse(chatId, out var chatGuid))
            return (null, null, "Некорректный chatId");
        if (!await _store.IsParticipantAsync(chatGuid, userId, ct))
            return (null, null, "Нет доступа");
        var chat = await _store.GetChatByIdAsync(chatGuid, ct);
        if (chat == null || !IsGroupChat(chat))
            return (null, null, "Это не групповой чат");
        await EnsureGroupMetadataAsync(chat, ct);
        var me = (await _store.GetParticipantsByChatAsync(chatGuid, ct))
            .FirstOrDefault(p => p.UserId == userId);
        if (me == null)
            return (null, null, "Нет доступа");
        return (chat, me, null);
    }

    public async Task<SupraGetGroupInfoResponse> GetGroupInfoAsync(
        Guid userId, string chatId, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetGroupAccessAsync(userId, chatId, ct);
            if (error != null)
                return new SupraGetGroupInfoResponse { success = false, error = error };

            var users = await _store.GetUsersAsync(ct);
            var members = (await _store.GetParticipantsByChatAsync(chat!.Id, ct))
                .Select(p =>
                {
                    var u = users.FirstOrDefault(x => x.Id == p.UserId);
                    return new SupraGroupMemberDto
                    {
                        id = p.UserId.ToString(),
                        name = u?.DisplayName ?? "",
                        login = u?.Login ?? "",
                        avatar = AvatarUrl(u),
                        isAdmin = p.IsAdmin,
                        isCreator = p.UserId == chat.CreatorUserId,
                    };
                })
                .OrderByDescending(m => m.isCreator)
                .ThenByDescending(m => m.isAdmin)
                .ThenBy(m => m.name)
                .ToList();

            return new SupraGetGroupInfoResponse
            {
                success = true,
                chatId = chat.Id.ToString(),
                name = chat.Name,
                avatar = GroupAvatarUrl(chat),
                creatorUserId = chat.CreatorUserId == Guid.Empty ? null : chat.CreatorUserId.ToString(),
                members = members,
                canEdit = me!.IsAdmin,
                isAdmin = me.IsAdmin,
                isCreator = chat.CreatorUserId == userId,
                allowJoinByLink = chat.AllowJoinByLink,
                requiresCustomGroupPassword = chat.RequiresCustomGroupPassword,
                hasGroupAutoKey = await _store.GetChatMemberKeyAsync(chat.Id, userId, ct) != null,
                parentChatId = chat.ParentChatId?.ToString(),
                branchSlug = chat.BranchSlug,
                isBranch = IsGroupBranchChat(chat),
                description = chat.Description,
                branches = IsRootGroupChat(chat)
                    ? await BuildBranchDtosForRootAsync(chat.Id, userId, new Dictionary<Guid, List<SupraChatMessageRecord>>(), ct)
                    : [],
            };
        }
        catch (Exception ex)
        {
            return new SupraGetGroupInfoResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(SupraUpdateGroupResponse response, SupraWsNewMessagePayload? systemEvent)> UpdateGroupNameAsync(
        UserRecord user, string chatId, string name, CancellationToken ct = default)
        => await UpdateGroupAsync(user, chatId, name, null, null, null, ct);

    public async Task<(SupraUpdateGroupResponse response, SupraWsNewMessagePayload? systemEvent)> UpdateGroupAsync(
        UserRecord user,
        string chatId,
        string? name,
        bool? allowJoinByLink,
        bool? requiresCustomGroupPassword = null,
        string? description = null,
        CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetGroupAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return (new SupraUpdateGroupResponse { success = false, error = error }, null);
            if (!me!.IsAdmin)
                return (new SupraUpdateGroupResponse { success = false, error = "Только администратор может изменять группу" }, null);

            SupraWsNewMessagePayload? systemEvent = null;
            if (!string.IsNullOrWhiteSpace(name) && !string.Equals(chat!.Name, name.Trim(), StringComparison.Ordinal))
            {
                chat.Name = name.Trim();
                await _store.SaveChatAsync(chat, ct);
                systemEvent = await InsertGroupSystemEventAsync(chat, user, "groupRenamed",
                    new Dictionary<string, string?>
                    {
                        ["actorName"] = user.DisplayName,
                        ["newName"] = chat.Name,
                    }, ct);
            }

            if (allowJoinByLink.HasValue && chat!.AllowJoinByLink != allowJoinByLink.Value)
            {
                chat.AllowJoinByLink = allowJoinByLink.Value;
                await _store.SaveChatAsync(chat, ct);
            }

            if (requiresCustomGroupPassword.HasValue &&
                chat!.RequiresCustomGroupPassword != requiresCustomGroupPassword.Value)
            {
                chat.RequiresCustomGroupPassword = requiresCustomGroupPassword.Value;
                await _store.SaveChatAsync(chat, ct);
            }

            if (description != null && !string.Equals(chat!.Description ?? "", description.Trim(), StringComparison.Ordinal))
            {
                chat.Description = description.Trim();
                await _store.SaveChatAsync(chat, ct);
            }

            return (new SupraUpdateGroupResponse
            {
                success = true,
                name = chat.Name,
                avatar = GroupAvatarUrl(chat),
                allowJoinByLink = chat.AllowJoinByLink,
                requiresCustomGroupPassword = chat.RequiresCustomGroupPassword,
                description = chat.Description,
            }, systemEvent);
        }
        catch (Exception ex)
        {
            return (new SupraUpdateGroupResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<SupraGetGroupLinkPreviewResponse> GetGroupLinkPreviewAsync(
        Guid userId, string chatId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return new SupraGetGroupLinkPreviewResponse { success = false, error = "Некорректный chatId" };

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat == null || !IsRootGroupChat(chat))
                return new SupraGetGroupLinkPreviewResponse { success = false, error = "Группа не найдена" };

            var isMember = await _store.IsParticipantAsync(chatGuid, userId, ct);
            var excluded = await IsExcludedFromGroupAsync(userId, chatGuid, ct);
            return new SupraGetGroupLinkPreviewResponse
            {
                success = true,
                chatId = chat.Id.ToString(),
                name = chat.Name,
                avatar = GroupAvatarUrl(chat),
                allowJoinByLink = chat.AllowJoinByLink,
                isMember = isMember,
                canJoin = chat.AllowJoinByLink && !isMember && !excluded,
                excludedFromGroup = excluded,
            };
        }
        catch (Exception ex)
        {
            return new SupraGetGroupLinkPreviewResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(SupraCreateChatResponse response, SupraWsNewChatPayload? notify)> JoinGroupByLinkAsync(
        UserRecord user, string chatId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new SupraCreateChatResponse { success = false, error = "Некорректный chatId" }, null);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat == null || !IsRootGroupChat(chat))
                return (new SupraCreateChatResponse { success = false, error = "Группа не найдена" }, null);
            if (!chat.AllowJoinByLink)
                return (new SupraCreateChatResponse { success = false, error = "Вступление по ссылке отключено" }, null);

            if (await IsExcludedFromGroupAsync(user.Id, chatGuid, ct))
                return (new SupraCreateChatResponse { success = false, error = "Вас исключили из группы. Вступление возможно только по приглашению администратора" }, null);

            if (await _store.IsParticipantAsync(chatGuid, user.Id, ct))
            {
                return (new SupraCreateChatResponse
                {
                    success = true,
                    chatId = chat.Id.ToString(),
                    chatName = chat.Name,
                }, null);
            }

            await ClearChatRestrictionAsync(chatGuid, user.Id, ct);

            var family = await GetGroupFamilyChatsAsync(chatGuid, ct);
            foreach (var familyChat in family)
            {
                if (await _store.IsParticipantAsync(familyChat.Id, user.Id, ct)) continue;
                await _store.SaveParticipantAsync(new SupraChatParticipantRecord
                {
                    Id = Guid.NewGuid(),
                    ChatId = familyChat.Id,
                    UserId = user.Id,
                    IsAdmin = false,
                }, ct);
            }

            return (new SupraCreateChatResponse
            {
                success = true,
                chatId = chat.Id.ToString(),
                chatName = chat.Name,
            }, new SupraWsNewChatPayload
            {
                chatId = chat.Id.ToString(),
                chatName = chat.Name,
                chatType = chat.Type,
                chatAvatar = GroupAvatarUrl(chat),
            });
        }
        catch (Exception ex)
        {
            return (new SupraCreateChatResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<(SupraUpdateGroupResponse response, SupraWsNewMessagePayload? systemEvent)> SaveGroupAvatarPathAsync(
        UserRecord user, string chatId, string avatarPath, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetGroupAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return (new SupraUpdateGroupResponse { success = false, error = error }, null);
            if (!me!.IsAdmin)
                return (new SupraUpdateGroupResponse { success = false, error = "Только администратор может изменять группу" }, null);

            chat!.AvatarPath = avatarPath;
            await _store.SaveChatAsync(chat, ct);
            var systemEvent = await InsertGroupSystemEventAsync(chat, user, "groupAvatarChanged",
                new Dictionary<string, string?> { ["actorName"] = user.DisplayName }, ct);
            return (new SupraUpdateGroupResponse
            {
                success = true,
                name = chat.Name,
                avatar = GroupAvatarUrl(chat),
                allowJoinByLink = chat.AllowJoinByLink,
            }, systemEvent);
        }
        catch (Exception ex)
        {
            return (new SupraUpdateGroupResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<SupraSimpleResponse> AddGroupMembersAsync(
        UserRecord user, string chatId, List<string> memberIds, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetGroupAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return new SupraSimpleResponse { success = false, error = error };
            if (!me!.IsAdmin)
                return new SupraSimpleResponse { success = false, error = "Только администратор может добавлять участников" };

            var rootId = await ResolveRootGroupIdAsync(chat!.Id, ct);
            var family = await GetGroupFamilyChatsAsync(rootId, ct);

            foreach (var idStr in memberIds)
            {
                if (!Guid.TryParse(idStr, out var pid) || pid == user.Id) continue;
                if (await IsGroupAddBlockedForUserAsync(pid, rootId, ct)) continue;
                var target = await _store.GetUserByIdAsync(pid, ct);
                if (target == null || !target.IsActive) continue;
                await ClearChatRestrictionAsync(rootId, pid, ct);
                await _store.DeleteUserBlockAsync(user.Id, pid, ct);
                await _store.DeleteUserBlockAsync(pid, user.Id, ct);

                foreach (var familyChat in family)
                {
                    if (await _store.IsParticipantAsync(familyChat.Id, pid, ct)) continue;
                    await _store.SaveParticipantAsync(new SupraChatParticipantRecord
                    {
                        Id = Guid.NewGuid(),
                        ChatId = familyChat.Id,
                        UserId = pid,
                        IsAdmin = false,
                    }, ct);
                }
            }

            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> RemoveGroupMemberAsync(
        UserRecord user, string chatId, string memberUserId, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetGroupAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return new SupraSimpleResponse { success = false, error = error };
            if (!me!.IsAdmin)
                return new SupraSimpleResponse { success = false, error = "Только администратор может удалять участников" };
            if (!Guid.TryParse(memberUserId, out var targetId))
                return new SupraSimpleResponse { success = false, error = "Некорректный userId" };
            if (targetId == chat!.CreatorUserId)
                return new SupraSimpleResponse { success = false, error = "Нельзя удалить создателя группы" };
            if (targetId == user.Id)
                return new SupraSimpleResponse { success = false, error = "Используйте выход из группы" };
            if (!await _store.IsParticipantAsync(chat.Id, targetId, ct))
                return new SupraSimpleResponse { success = false, error = "Участник не найден" };

            var targetPart = (await _store.GetParticipantsByChatAsync(chat.Id, ct))
                .FirstOrDefault(p => p.UserId == targetId);
            if (targetPart?.IsAdmin == true)
                return new SupraSimpleResponse { success = false, error = "Нельзя удалить администратора группы" };

            var rootId = await ResolveRootGroupIdAsync(chat!.Id, ct);
            var family = await GetGroupFamilyChatsAsync(rootId, ct);
            foreach (var familyChat in family)
            {
                await _store.DeleteParticipantAsync(familyChat.Id, targetId, ct);
                await _store.DeleteFolderMembersByChatAsync(targetId, familyChat.Id, ct);
            }
            await SetChatRestrictionAsync(rootId, targetId, ChatRestrictionKinds.Excluded, ct);
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(SupraSimpleResponse response, SupraWsNewMessagePayload? systemEvent)> SetGroupMemberAdminAsync(
        UserRecord user, string chatId, string memberUserId, bool isAdmin, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetGroupAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return (new SupraSimpleResponse { success = false, error = error }, null);
            if (!me!.IsAdmin)
                return (new SupraSimpleResponse { success = false, error = "Только администратор может менять права" }, null);
            if (!Guid.TryParse(memberUserId, out var targetId))
                return (new SupraSimpleResponse { success = false, error = "Некорректный userId" }, null);
            if (targetId == chat!.CreatorUserId && !isAdmin)
                return (new SupraSimpleResponse { success = false, error = "Нельзя снять права администратора у создателя группы" }, null);

            var part = (await _store.GetParticipantsByChatAsync(chat.Id, ct))
                .FirstOrDefault(p => p.UserId == targetId);
            if (part == null)
                return (new SupraSimpleResponse { success = false, error = "Участник не найден" }, null);
            if (part.IsAdmin == isAdmin)
                return (new SupraSimpleResponse { success = true }, null);

            var targetUser = await _store.GetUserByIdAsync(targetId, ct);
            var targetName = targetUser?.DisplayName ?? targetUser?.Login ?? memberUserId;

            part.IsAdmin = isAdmin;
            await _store.SaveParticipantAsync(part, ct);
            var rootId = await ResolveRootGroupIdAsync(chat!.Id, ct);
            await SyncParticipantAdminToFamilyAsync(rootId, targetId, isAdmin, ct);
            var kind = isAdmin ? "groupAdminGranted" : "groupAdminRevoked";
            var systemEvent = await InsertGroupSystemEventAsync(chat, user, kind,
                new Dictionary<string, string?>
                {
                    ["actorName"] = user.DisplayName,
                    ["targetName"] = targetName,
                }, ct);
            return (new SupraSimpleResponse { success = true }, systemEvent);
        }
        catch (Exception ex)
        {
            return (new SupraSimpleResponse { success = false, error = ex.Message }, null);
        }
    }

    public SupraWsGroupUpdatedPayload BuildGroupUpdatedPayload(SupraChatRecord chat) => new()
    {
        chatId = chat.Id.ToString(),
        chatName = chat.Name,
        chatAvatar = GroupAvatarUrl(chat),
        requiresCustomGroupPassword = chat.RequiresCustomGroupPassword,
    };

    public async Task<SupraWsGroupUpdatedPayload?> GetGroupUpdatedPayloadAsync(
        Guid chatId, CancellationToken ct = default)
    {
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        return chat == null ? null : BuildGroupUpdatedPayload(chat);
    }
}
