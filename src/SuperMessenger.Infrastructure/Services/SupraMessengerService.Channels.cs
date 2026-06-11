using System.Text.RegularExpressions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class SupraMessengerService
{
    public const int ChannelLocalMessageLimit = 50;
    public const int PublicChannelMessageLimit = 50;

    static readonly Regex ChannelSlugRegex = new(@"^[a-zA-Z0-9_]{4,32}$", RegexOptions.Compiled);

    public static bool IsChannelChat(SupraChatRecord chat) =>
        string.Equals(chat.Type, "channel", StringComparison.OrdinalIgnoreCase);

    static string? ChannelAvatarUrl(SupraChatRecord? chat) =>
        IsChannelChat(chat!) ? AvatarUrlHelper.ForGroup(chat) : null;

    static string ResolveParticipantRole(SupraChatParticipantRecord p, SupraChatRecord chat)
    {
        if (!string.IsNullOrWhiteSpace(p.Role))
            return p.Role.Trim().ToLowerInvariant();
        if (p.UserId == chat.CreatorUserId)
            return ChannelRoles.Owner;
        if (p.IsAdmin)
            return ChannelRoles.Admin;
        return ChannelRoles.Subscriber;
    }

    public static (bool ok, string? error) ValidateChannelSlug(string slug)
    {
        var norm = (slug ?? "").Trim();
        if (norm.Length < 4)
            return (false, "Ссылка канала должна содержать не менее 4 символов");
        if (norm.Length > 32)
            return (false, "Ссылка канала не должна превышать 32 символа");
        if (!ChannelSlugRegex.IsMatch(norm))
            return (false, "Ссылка может содержать только латинские буквы, цифры и _");
        return (true, null);
    }

    async Task<(bool ok, string? error)> IsSlugAvailableAsync(string slug, Guid? excludeChatId, CancellationToken ct)
    {
        var (valid, err) = ValidateChannelSlug(slug);
        if (!valid) return (false, err);
        if (await _store.IsChannelSlugTakenAsync(slug, excludeChatId, ct))
            return (false, "Эта ссылка уже занята другим каналом");
        if (await _store.IsLoginTakenAsync(slug, null, ct))
            return (false, "Эта ссылка совпадает с логином пользователя");
        return (true, null);
    }

    async Task<(SupraChatRecord? chat, SupraChatParticipantRecord? me, string? error)> GetChannelAccessAsync(
        Guid userId, string chatId, CancellationToken ct)
    {
        if (!Guid.TryParse(chatId, out var chatGuid))
            return (null, null, "Некорректный chatId");
        if (!await _store.IsParticipantAsync(chatGuid, userId, ct))
            return (null, null, "Нет доступа");
        var chat = await _store.GetChatByIdAsync(chatGuid, ct);
        if (chat == null || !IsChannelChat(chat))
            return (null, null, "Это не канал");
        var me = (await _store.GetParticipantsByChatAsync(chatGuid, ct))
            .FirstOrDefault(p => p.UserId == userId);
        if (me == null)
            return (null, null, "Нет доступа");
        return (chat, me, null);
    }

    async Task<List<SupraChannelMemberDto>> BuildChannelMemberDtosAsync(
        SupraChatRecord chat, CancellationToken ct)
    {
        var users = await _store.GetUsersAsync(ct);
        return (await _store.GetParticipantsByChatAsync(chat.Id, ct))
            .Select(p =>
            {
                var u = users.FirstOrDefault(x => x.Id == p.UserId);
                var role = ResolveParticipantRole(p, chat);
                return new SupraChannelMemberDto
                {
                    id = p.UserId.ToString(),
                    name = u?.DisplayName ?? "",
                    login = u?.Login ?? "",
                    avatar = AvatarUrl(u),
                    role = role,
                    isOwner = role == ChannelRoles.Owner,
                };
            })
            .OrderByDescending(m => m.isOwner)
            .ThenByDescending(m => m.role == ChannelRoles.Admin)
            .ThenByDescending(m => m.role == ChannelRoles.Author)
            .ThenBy(m => m.name)
            .ToList();
    }

    public async Task<(SupraCreateChannelResponse response, SupraWsNewChatPayload? notify)> CreateChannelAsync(
        UserRecord user, string name, string slug, CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(name))
                return (new SupraCreateChannelResponse { success = false, error = "Название канала не указано" }, null);

            var slugNorm = (slug ?? "").Trim();
            var (slugOk, slugErr) = await IsSlugAvailableAsync(slugNorm, null, ct);
            if (!slugOk)
                return (new SupraCreateChannelResponse { success = false, error = slugErr }, null);

            var chatGuid = Guid.NewGuid();
            await _store.SaveChatAsync(new SupraChatRecord
            {
                Id = chatGuid,
                Name = name.Trim(),
                Type = "channel",
                CreatorUserId = user.Id,
                Slug = slugNorm,
                AllowJoinByLink = true,
            }, ct);
            await _store.SaveParticipantAsync(new SupraChatParticipantRecord
            {
                Id = Guid.NewGuid(),
                ChatId = chatGuid,
                UserId = user.Id,
                IsAdmin = true,
                Role = ChannelRoles.Owner,
            }, ct);

            var notify = new SupraWsNewChatPayload
            {
                chatId = chatGuid.ToString(),
                chatName = name.Trim(),
                chatType = "channel",
            };
            return (new SupraCreateChannelResponse
            {
                success = true,
                chatId = chatGuid.ToString(),
                slug = slugNorm,
                name = name.Trim(),
            }, notify);
        }
        catch (Exception ex)
        {
            return (new SupraCreateChannelResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<SupraGetMyChannelsResponse> GetMyChannelsAsync(Guid userId, CancellationToken ct = default)
    {
        try
        {
            var myParts = await _store.GetParticipantsByUserAsync(userId, ct);
            var allChats = await _store.GetChatsAsync(ct);
            var allParts = await _store.GetAllParticipantsAsync(ct);
            var channels = new List<SupraChannelListItemDto>();

            foreach (var p in myParts)
            {
                var chat = allChats.FirstOrDefault(c => c.Id == p.ChatId);
                if (chat == null || !IsChannelChat(chat)) continue;
                var role = ResolveParticipantRole(p, chat);
                if (role == ChannelRoles.Subscriber) continue;
                var subCount = allParts.Count(x =>
                    x.ChatId == chat.Id &&
                    ResolveParticipantRole(x, chat) == ChannelRoles.Subscriber);
                channels.Add(new SupraChannelListItemDto
                {
                    chatId = chat.Id.ToString(),
                    name = chat.Name,
                    slug = chat.Slug ?? "",
                    avatar = ChannelAvatarUrl(chat),
                    myRole = role,
                    subscriberCount = subCount,
                });
            }

            return new SupraGetMyChannelsResponse
            {
                success = true,
                channels = channels.OrderBy(c => c.name).ToList(),
            };
        }
        catch (Exception ex)
        {
            return new SupraGetMyChannelsResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraGetChannelInfoResponse> GetChannelInfoAsync(
        Guid userId, string chatId, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetChannelAccessAsync(userId, chatId, ct);
            if (error != null)
                return new SupraGetChannelInfoResponse { success = false, error = error };

            var myRole = ResolveParticipantRole(me!, chat!);
            var members = await BuildChannelMemberDtosAsync(chat!, ct);
            var allParts = await _store.GetParticipantsByChatAsync(chat!.Id, ct);
            var subCount = allParts.Count(p => ResolveParticipantRole(p, chat) == ChannelRoles.Subscriber);

            return new SupraGetChannelInfoResponse
            {
                success = true,
                chatId = chat.Id.ToString(),
                name = chat.Name,
                slug = chat.Slug,
                description = chat.Description ?? "",
                avatar = ChannelAvatarUrl(chat),
                creatorUserId = chat.CreatorUserId.ToString(),
                members = members.Where(m => m.role != ChannelRoles.Subscriber).ToList(),
                canEdit = ChannelRoles.CanEditSettings(myRole, includeSlug: false),
                canEditSlug = ChannelRoles.CanEditSettings(myRole, includeSlug: true),
                canPost = ChannelRoles.CanPost(myRole),
                canManageMembers = ChannelRoles.CanManageMembers(myRole),
                isOwner = myRole == ChannelRoles.Owner,
                isSubscribed = true,
                myRole = myRole,
                subscriberCount = subCount,
            };
        }
        catch (Exception ex)
        {
            return new SupraGetChannelInfoResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(SupraUpdateChannelResponse response, SupraWsChannelUpdatedPayload? updated)> UpdateChannelAsync(
        UserRecord user,
        string chatId,
        string? name,
        string? slug,
        string? description,
        CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetChannelAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return (new SupraUpdateChannelResponse { success = false, error = error }, null);

            var myRole = ResolveParticipantRole(me!, chat!);
            if (!ChannelRoles.CanEditSettings(myRole, includeSlug: false))
                return (new SupraUpdateChannelResponse { success = false, error = "Недостаточно прав" }, null);

            if (!string.IsNullOrWhiteSpace(name))
                chat!.Name = name.Trim();

            if (description != null)
                chat!.Description = description.Trim();

            if (!string.IsNullOrWhiteSpace(slug))
            {
                if (!ChannelRoles.CanEditSettings(myRole, includeSlug: true))
                    return (new SupraUpdateChannelResponse { success = false, error = "Только владелец может менять ссылку" }, null);
                var slugNorm = slug.Trim();
                var (slugOk, slugErr) = await IsSlugAvailableAsync(slugNorm, chat!.Id, ct);
                if (!slugOk)
                    return (new SupraUpdateChannelResponse { success = false, error = slugErr }, null);
                chat.Slug = slugNorm;
            }

            await _store.SaveChatAsync(chat!, ct);
            var payload = new SupraWsChannelUpdatedPayload
            {
                chatId = chat!.Id.ToString(),
                chatName = chat.Name,
                chatAvatar = ChannelAvatarUrl(chat),
                slug = chat.Slug,
                description = chat.Description,
            };
            return (new SupraUpdateChannelResponse
            {
                success = true,
                name = chat.Name,
                slug = chat.Slug,
                description = chat.Description,
                avatar = ChannelAvatarUrl(chat),
            }, payload);
        }
        catch (Exception ex)
        {
            return (new SupraUpdateChannelResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<(SupraUpdateChannelResponse response, SupraWsChannelUpdatedPayload? updated)> SaveChannelAvatarPathAsync(
        UserRecord user, string chatId, string avatarPath, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetChannelAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return (new SupraUpdateChannelResponse { success = false, error = error }, null);
            var myRole = ResolveParticipantRole(me!, chat!);
            if (!ChannelRoles.CanEditSettings(myRole, includeSlug: false))
                return (new SupraUpdateChannelResponse { success = false, error = "Недостаточно прав" }, null);

            chat!.AvatarPath = avatarPath;
            await _store.SaveChatAsync(chat, ct);
            var payload = new SupraWsChannelUpdatedPayload
            {
                chatId = chat.Id.ToString(),
                chatName = chat.Name,
                chatAvatar = ChannelAvatarUrl(chat),
                slug = chat.Slug,
                description = chat.Description,
            };
            return (new SupraUpdateChannelResponse
            {
                success = true,
                name = chat.Name,
                slug = chat.Slug,
                description = chat.Description,
                avatar = ChannelAvatarUrl(chat),
            }, payload);
        }
        catch (Exception ex)
        {
            return (new SupraUpdateChannelResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<SupraGetChannelLinkPreviewResponse> GetChannelLinkPreviewAsync(
        Guid userId, string slug, CancellationToken ct = default)
    {
        try
        {
            var chat = await _store.GetChannelBySlugAsync(slug, ct);
            if (chat == null)
                return new SupraGetChannelLinkPreviewResponse { success = false, error = "Канал не найден" };

            var isSubscribed = await _store.IsParticipantAsync(chat.Id, userId, ct);
            var allParts = await _store.GetParticipantsByChatAsync(chat.Id, ct);
            var subCount = allParts.Count;

            return new SupraGetChannelLinkPreviewResponse
            {
                success = true,
                chatId = chat.Id.ToString(),
                name = chat.Name,
                slug = chat.Slug,
                description = chat.Description ?? "",
                avatar = ChannelAvatarUrl(chat),
                isSubscribed = isSubscribed,
                canSubscribe = !isSubscribed,
                subscriberCount = subCount,
            };
        }
        catch (Exception ex)
        {
            return new SupraGetChannelLinkPreviewResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(SupraCreateChatResponse response, SupraWsNewChatPayload? notify)> SubscribeChannelAsync(
        UserRecord user, string chatId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new SupraCreateChatResponse { success = false, error = "Некорректный chatId" }, null);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat == null || !IsChannelChat(chat))
                return (new SupraCreateChatResponse { success = false, error = "Канал не найден" }, null);

            if (await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                return (new SupraCreateChatResponse { success = true, chatId = chatGuid.ToString(), chatName = chat.Name }, null);

            await _store.SaveParticipantAsync(new SupraChatParticipantRecord
            {
                Id = Guid.NewGuid(),
                ChatId = chatGuid,
                UserId = user.Id,
                Role = ChannelRoles.Subscriber,
            }, ct);

            var notify = new SupraWsNewChatPayload
            {
                chatId = chatGuid.ToString(),
                chatName = chat.Name,
                chatType = "channel",
                chatAvatar = ChannelAvatarUrl(chat),
            };
            return (new SupraCreateChatResponse
            {
                success = true,
                chatId = chatGuid.ToString(),
                chatName = chat.Name,
            }, notify);
        }
        catch (Exception ex)
        {
            return (new SupraCreateChatResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<SupraSimpleResponse> UnsubscribeChannelAsync(
        UserRecord user, string chatId, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetChannelAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return new SupraSimpleResponse { success = false, error = error };

            var myRole = ResolveParticipantRole(me!, chat!);
            if (myRole != ChannelRoles.Subscriber)
                return new SupraSimpleResponse { success = false, error = "Администраторы не могут отписаться — передайте канал или удалите его" };

            await _store.DeleteParticipantAsync(chat!.Id, user.Id, ct);
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> SetChannelMemberRoleAsync(
        UserRecord user, string chatId, string memberUserId, string role, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetChannelAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return new SupraSimpleResponse { success = false, error = error };

            var myRole = ResolveParticipantRole(me!, chat!);
            if (!ChannelRoles.CanManageMembers(myRole))
                return new SupraSimpleResponse { success = false, error = "Недостаточно прав" };

            if (!Guid.TryParse(memberUserId, out var memberGuid))
                return new SupraSimpleResponse { success = false, error = "Некорректный userId" };

            var roleNorm = (role ?? "").Trim().ToLowerInvariant();
            if (roleNorm is not (ChannelRoles.Admin or ChannelRoles.Author or ChannelRoles.Subscriber))
                return (new SupraSimpleResponse { success = false, error = "Недопустимая роль" });

            if (memberGuid == user.Id)
                return new SupraSimpleResponse { success = false, error = "Нельзя изменить свою роль" };

            var target = (await _store.GetParticipantsByChatAsync(chat!.Id, ct))
                .FirstOrDefault(p => p.UserId == memberGuid);
            if (target == null)
                return new SupraSimpleResponse { success = false, error = "Участник не найден" };

            var targetRole = ResolveParticipantRole(target, chat);
            if (targetRole == ChannelRoles.Owner)
                return new SupraSimpleResponse { success = false, error = "Нельзя изменить роль владельца" };

            target.Role = roleNorm;
            target.IsAdmin = roleNorm is ChannelRoles.Admin or ChannelRoles.Owner;
            await _store.SaveParticipantAsync(target, ct);
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> TransferChannelOwnershipAsync(
        UserRecord user, string chatId, string newOwnerUserId, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetChannelAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return new SupraSimpleResponse { success = false, error = error };

            var myRole = ResolveParticipantRole(me!, chat!);
            if (myRole != ChannelRoles.Owner)
                return new SupraSimpleResponse { success = false, error = "Только владелец может передать канал" };

            if (!Guid.TryParse(newOwnerUserId, out var newOwnerGuid))
                return new SupraSimpleResponse { success = false, error = "Некорректный userId" };

            var parts = (await _store.GetParticipantsByChatAsync(chat!.Id, ct)).ToList();
            var newOwner = parts.FirstOrDefault(p => p.UserId == newOwnerGuid);
            if (newOwner == null)
                return new SupraSimpleResponse { success = false, error = "Пользователь не является участником канала" };

            me!.Role = ChannelRoles.Admin;
            me.IsAdmin = true;
            newOwner.Role = ChannelRoles.Owner;
            newOwner.IsAdmin = true;
            chat.CreatorUserId = newOwnerGuid;
            await _store.SaveParticipantAsync(me, ct);
            await _store.SaveParticipantAsync(newOwner, ct);
            await _store.SaveChatAsync(chat, ct);
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> DeleteChannelAsync(
        UserRecord user, string chatId, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetChannelAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return new SupraSimpleResponse { success = false, error = error };

            var myRole = ResolveParticipantRole(me!, chat!);
            if (myRole != ChannelRoles.Owner)
                return new SupraSimpleResponse { success = false, error = "Только владелец может удалить канал" };

            var parts = await _store.GetParticipantsByChatAsync(chat!.Id, ct);
            foreach (var p in parts)
                await _store.DeleteParticipantAsync(chat.Id, p.UserId, ct);
            await _store.DeleteMessagesByChatAsync(chat.Id, ct);
            await _store.DeleteChatAsync(chat.Id, ct);
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraWsChannelUpdatedPayload?> GetChannelUpdatedPayloadAsync(
        Guid chatId, CancellationToken ct = default)
    {
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        if (chat == null || !IsChannelChat(chat)) return null;
        return new SupraWsChannelUpdatedPayload
        {
            chatId = chat.Id.ToString(),
            chatName = chat.Name,
            chatAvatar = ChannelAvatarUrl(chat),
            slug = chat.Slug,
            description = chat.Description,
        };
    }

    public async Task<List<SupraPublicChannelMessageDto>> GetPublicChannelMessagesAsync(
        string slug, int limit = PublicChannelMessageLimit, CancellationToken ct = default)
    {
        var chat = await _store.GetChannelBySlugAsync(slug, ct);
        if (chat == null) return [];

        var messages = (await _store.GetMessagesByChatAsync(chat.Id, ct))
            .Where(m => !m.DeletedForEveryone && !IsEncryptedPayload(m.Text))
            .OrderByDescending(m => m.CreatedOn)
            .ThenByDescending(m => m.Id)
            .Take(Math.Max(1, Math.Min(limit, 100)))
            .OrderBy(m => m.CreatedOn)
            .ThenBy(m => m.Id)
            .Select(m => new SupraPublicChannelMessageDto
            {
                id = m.Id.ToString(),
                timestamp = m.CreatedOn,
                text = m.Text,
                channelName = chat.Name,
                channelSlug = chat.Slug,
            })
            .ToList();
        return messages;
    }

    public async Task<SupraPublicChannelMessagesAroundResult?> GetPublicChannelMessagesAroundAsync(
        string slug, string messageId, int before = 25, int after = 25, CancellationToken ct = default)
    {
        var chat = await _store.GetChannelBySlugAsync(slug, ct);
        if (chat == null) return null;
        if (!Guid.TryParse(messageId, out var msgGuid)) return null;

        var ordered = (await _store.GetMessagesByChatAsync(chat.Id, ct))
            .Where(m => !m.DeletedForEveryone && !IsEncryptedPayload(m.Text))
            .OrderBy(m => m.CreatedOn)
            .ThenBy(m => m.Id)
            .ToList();

        var idx = ordered.FindIndex(m => m.Id == msgGuid);
        if (idx < 0) return new SupraPublicChannelMessagesAroundResult { found = false };

        var takeBefore = Math.Max(0, before);
        var takeAfter = Math.Max(0, after);
        var start = Math.Max(0, idx - takeBefore);
        var end = Math.Min(ordered.Count, idx + takeAfter + 1);
        var slice = ordered.Skip(start).Take(end - start).ToList();

        return new SupraPublicChannelMessagesAroundResult
        {
            found = true,
            chatId = chat.Id.ToString(),
            name = chat.Name,
            slug = chat.Slug,
            description = chat.Description ?? "",
            avatar = string.IsNullOrEmpty(chat.AvatarPath) ? null : $"/api/files/group-avatar-public/{chat.Id}",
            hasMoreBefore = start > 0,
            hasMoreAfter = end < ordered.Count,
            messages = slice.Select(m => new SupraPublicChannelMessageDto
            {
                id = m.Id.ToString(),
                timestamp = m.CreatedOn,
                text = m.Text,
                channelName = chat.Name,
                channelSlug = chat.Slug,
            }).ToList(),
        };
    }

    public async Task<bool> CanUserPostToChannelAsync(Guid userId, Guid chatId, CancellationToken ct)
    {
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        if (chat == null || !IsChannelChat(chat)) return false;
        var me = (await _store.GetParticipantsByChatAsync(chatId, ct))
            .FirstOrDefault(p => p.UserId == userId);
        if (me == null) return false;
        return ChannelRoles.CanPost(ResolveParticipantRole(me, chat));
    }
}
