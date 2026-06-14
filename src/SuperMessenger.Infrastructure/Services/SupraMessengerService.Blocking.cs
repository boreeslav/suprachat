using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class SupraMessengerService
{
    async Task<bool> HasUserBlockAsync(Guid blockerId, Guid blockedId, CancellationToken ct)
    {
        var blocks = await _store.GetUserBlocksAsync(ct);
        return blocks.Any(b => b.BlockerUserId == blockerId && b.BlockedUserId == blockedId);
    }

    async Task<bool> IsDirectPairBlockedAsync(Guid userA, Guid userB, CancellationToken ct)
    {
        if (userA == userB) return false;
        return await HasUserBlockAsync(userA, userB, ct) || await HasUserBlockAsync(userB, userA, ct);
    }

    async Task<string?> GetChatRestrictionKindAsync(Guid chatId, Guid userId, CancellationToken ct)
    {
        var list = await _store.GetChatRestrictionsAsync(ct);
        return list.FirstOrDefault(r => r.ChatId == chatId && r.UserId == userId)?.Kind;
    }

    async Task<bool> IsExcludedFromGroupAsync(Guid userId, Guid chatId, CancellationToken ct)
    {
        var kind = await GetChatRestrictionKindAsync(chatId, userId, ct);
        return string.Equals(kind, ChatRestrictionKinds.Excluded, StringComparison.Ordinal);
    }

    async Task<bool> IsGroupAddBlockedForUserAsync(Guid userId, Guid chatId, CancellationToken ct)
    {
        var kind = await GetChatRestrictionKindAsync(chatId, userId, ct);
        return string.Equals(kind, ChatRestrictionKinds.Blocked, StringComparison.Ordinal);
    }

    async Task ClearChatRestrictionAsync(Guid chatId, Guid userId, CancellationToken ct)
        => await _store.DeleteChatRestrictionAsync(chatId, userId, ct);

    async Task SetChatRestrictionAsync(Guid chatId, Guid userId, string kind, CancellationToken ct)
    {
        await _store.SaveChatRestrictionAsync(new SupraChatRestrictionRecord
        {
            ChatId = chatId,
            UserId = userId,
            Kind = kind,
            CreatedOn = DateTime.UtcNow,
        }, ct);
    }

    async Task<bool> ShouldHideChatAsync(Guid userId, SupraChatRecord chat, CancellationToken ct)
    {
        if (string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
        {
            var parts = await _store.GetParticipantsByChatAsync(chat.Id, ct);
            var otherId = parts.FirstOrDefault(p => p.UserId != userId)?.UserId;
            if (otherId.HasValue && await IsDirectPairBlockedAsync(userId, otherId.Value, ct))
                return true;
            return false;
        }
        if (IsGroupChat(chat))
        {
            var kind = await GetChatRestrictionKindAsync(chat.Id, userId, ct);
            return string.Equals(kind, ChatRestrictionKinds.Blocked, StringComparison.Ordinal);
        }
        return false;
    }

    async Task<bool> IsUserVisibleInContactsAsync(Guid viewerId, Guid targetId, CancellationToken ct)
    {
        if (viewerId == targetId) return false;
        if (await HasUserBlockAsync(viewerId, targetId, ct)) return false;
        if (await HasUserBlockAsync(targetId, viewerId, ct)) return false;
        return true;
    }

    public async Task<List<Guid>> GetMessageRecipientUserIdsAsync(
        Guid chatId, Guid senderId, CancellationToken ct = default)
    {
        var parts = await _store.GetParticipantsByChatAsync(chatId, ct);
        var recipients = parts.Where(p => p.UserId != senderId).Select(p => p.UserId).ToList();
        var result = new List<Guid>();
        foreach (var rid in recipients)
        {
            if (!await IsDirectPairBlockedAsync(senderId, rid, ct))
                result.Add(rid);
        }
        return result;
    }

    async Task<Guid?> FindDirectChatIdAsync(Guid userA, Guid userB, CancellationToken ct)
    {
        var chatsA = await _store.GetParticipantsByUserAsync(userA, ct);
        foreach (var p in chatsA)
        {
            var chat = await _store.GetChatByIdAsync(p.ChatId, ct);
            if (chat == null || !string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
                continue;
            if (await _store.IsParticipantAsync(p.ChatId, userB, ct))
                return p.ChatId;
        }
        return null;
    }

    public async Task<(SupraSimpleResponse response, string? removedChatId)> BlockUserAsync(
        UserRecord user, string contactUserId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(contactUserId, out var targetId))
                return (new SupraSimpleResponse { success = false, error = "Некорректный userId" }, null);
            if (targetId == user.Id)
                return (new SupraSimpleResponse { success = false, error = "Нельзя заблокировать себя" }, null);

            await _store.SaveUserBlockAsync(new SupraUserBlockRecord
            {
                BlockerUserId = user.Id,
                BlockedUserId = targetId,
                CreatedOn = DateTime.UtcNow,
            }, ct);

            string? removedChatId = null;
            var directChatId = await FindDirectChatIdAsync(user.Id, targetId, ct);
            if (directChatId.HasValue)
            {
                removedChatId = directChatId.Value.ToString();
                await _store.DeleteParticipantAsync(directChatId.Value, user.Id, ct);
                await _store.DeleteFolderMembersByChatAsync(user.Id, directChatId.Value, ct);
            }

            return (new SupraSimpleResponse { success = true }, removedChatId);
        }
        catch (Exception ex)
        {
            return (new SupraSimpleResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<(SupraSimpleResponse response, string? removedChatId)> BlockGroupAsync(
        UserRecord user, string chatId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new SupraSimpleResponse { success = false, error = "Некорректный chatId" }, null);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat == null || !IsGroupChat(chat))
                return (new SupraSimpleResponse { success = false, error = "Группа не найдена" }, null);

            var rootId = await ResolveRootGroupIdAsync(chatGuid, ct);
            if (!await _store.IsParticipantAsync(rootId, user.Id, ct))
                return (new SupraSimpleResponse { success = false, error = "Вы не в этой группе" }, null);

            var family = await GetGroupFamilyChatsAsync(rootId, ct);
            foreach (var familyChat in family)
            {
                await SetChatRestrictionAsync(familyChat.Id, user.Id, ChatRestrictionKinds.Blocked, ct);
                await _store.DeleteParticipantAsync(familyChat.Id, user.Id, ct);
                await _store.DeleteFolderMembersByChatAsync(user.Id, familyChat.Id, ct);
            }

            return (new SupraSimpleResponse { success = true }, rootId.ToString());
        }
        catch (Exception ex)
        {
            return (new SupraSimpleResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<SupraSimpleResponse> BlockGroupMemberAsync(
        UserRecord user, string chatId, string memberUserId, CancellationToken ct = default)
    {
        try
        {
            var (chat, me, error) = await GetGroupAccessAsync(user.Id, chatId, ct);
            if (error != null)
                return new SupraSimpleResponse { success = false, error = error };
            if (!me!.IsAdmin)
                return new SupraSimpleResponse { success = false, error = "Только администратор может блокировать участников" };
            if (!Guid.TryParse(memberUserId, out var targetId))
                return new SupraSimpleResponse { success = false, error = "Некорректный userId" };
            if (targetId == chat!.CreatorUserId)
                return new SupraSimpleResponse { success = false, error = "Нельзя заблокировать создателя группы" };
            if (targetId == user.Id)
                return new SupraSimpleResponse { success = false, error = "Нельзя заблокировать себя" };
            if (!await _store.IsParticipantAsync(chat.Id, targetId, ct))
                return new SupraSimpleResponse { success = false, error = "Участник не найден" };

            var targetPart = (await _store.GetParticipantsByChatAsync(chat.Id, ct))
                .FirstOrDefault(p => p.UserId == targetId);
            if (targetPart?.IsAdmin == true)
                return new SupraSimpleResponse { success = false, error = "Нельзя заблокировать администратора группы" };

            var rootId = await ResolveRootGroupIdAsync(chat.Id, ct);
            var family = await GetGroupFamilyChatsAsync(rootId, ct);
            foreach (var familyChat in family)
            {
                await SetChatRestrictionAsync(familyChat.Id, targetId, ChatRestrictionKinds.Blocked, ct);
                await _store.DeleteParticipantAsync(familyChat.Id, targetId, ct);
                await _store.DeleteFolderMembersByChatAsync(targetId, familyChat.Id, ct);
            }

            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }
}
