using System.Text.RegularExpressions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class SupraMessengerService
{
    private static readonly Regex GroupBranchSlugRegex = new("^[a-z0-9_-]+$", RegexOptions.Compiled);

    public static bool IsGroupBranchChat(SupraChatRecord chat) =>
        string.Equals(chat.Type, "group_branch", StringComparison.OrdinalIgnoreCase) ||
        (chat.ParentChatId is Guid pid && pid != Guid.Empty);

    public static bool IsRootGroupChat(SupraChatRecord chat) =>
        IsGroupChat(chat) && !IsGroupBranchChat(chat);

    public static (bool ok, string? error) ValidateGroupBranchSlug(string slug)
    {
        var norm = (slug ?? "").Trim().ToLowerInvariant();
        if (norm.Length < 2)
            return (false, "Адрес ветки должен содержать не менее 2 символов");
        if (norm.Length > 32)
            return (false, "Адрес ветки не должен превышать 32 символа");
        if (!GroupBranchSlugRegex.IsMatch(norm))
            return (false, "Адрес может содержать только латинские буквы, цифры, дефис и _");
        return (true, null);
    }

    static string NormalizeGroupBranchSlug(string slug) => (slug ?? "").Trim().ToLowerInvariant();

    async Task<Guid> ResolveRootGroupIdAsync(Guid chatId, CancellationToken ct)
    {
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        if (chat?.ParentChatId is Guid parent && parent != Guid.Empty)
            return parent;
        return chatId;
    }

    async Task<SupraChatRecord?> GetRootGroupChatAsync(Guid chatId, CancellationToken ct)
    {
        var rootId = await ResolveRootGroupIdAsync(chatId, ct);
        var chat = await _store.GetChatByIdAsync(rootId, ct);
        return chat != null && IsRootGroupChat(chat) ? chat : null;
    }

    async Task<List<SupraChatRecord>> GetGroupFamilyChatsAsync(Guid rootGroupId, CancellationToken ct)
    {
        var root = await _store.GetChatByIdAsync(rootGroupId, ct);
        if (root == null || !IsRootGroupChat(root)) return [];
        var branches = await _store.GetGroupBranchesByParentAsync(rootGroupId, ct);
        return [root, ..branches];
    }

    async Task SyncParticipantsToFamilyAsync(
        Guid rootGroupId,
        IReadOnlyList<SupraChatParticipantRecord> sourceParticipants,
        CancellationToken ct)
    {
        var branches = await _store.GetGroupBranchesByParentAsync(rootGroupId, ct);
        foreach (var branch in branches)
        {
            var existing = (await _store.GetParticipantsByChatAsync(branch.Id, ct)).ToList();
            foreach (var p in sourceParticipants)
            {
                if (existing.Any(e => e.UserId == p.UserId)) continue;
                await _store.SaveParticipantAsync(new SupraChatParticipantRecord
                {
                    Id = Guid.NewGuid(),
                    ChatId = branch.Id,
                    UserId = p.UserId,
                    IsAdmin = p.IsAdmin,
                }, ct);
            }
            foreach (var e in existing)
            {
                if (!sourceParticipants.Any(p => p.UserId == e.UserId))
                    await _store.DeleteParticipantAsync(branch.Id, e.UserId, ct);
            }
        }
    }

    async Task SyncParticipantAdminToFamilyAsync(
        Guid rootGroupId, Guid userId, bool isAdmin, CancellationToken ct)
    {
        var branches = await _store.GetGroupBranchesByParentAsync(rootGroupId, ct);
        foreach (var branch in branches)
        {
            var part = (await _store.GetParticipantsByChatAsync(branch.Id, ct))
                .FirstOrDefault(p => p.UserId == userId);
            if (part == null) continue;
            if (part.IsAdmin == isAdmin) continue;
            part.IsAdmin = isAdmin;
            await _store.SaveParticipantAsync(part, ct);
        }
    }

    async Task DeleteGroupFamilyForUserAsync(Guid rootGroupId, Guid userId, CancellationToken ct)
    {
        var family = await GetGroupFamilyChatsAsync(rootGroupId, ct);
        foreach (var chat in family)
        {
            await _store.DeleteParticipantAsync(chat.Id, userId, ct);
            await _store.DeleteFolderMembersByChatAsync(userId, chat.Id, ct);
        }
    }

    async Task DeleteBranchChatFullyAsync(SupraChatRecord branch, CancellationToken ct)
    {
        await _files.ReleaseChatAttachmentsAsync(branch.Id, ct);
        await _store.DeleteMessagesByChatAsync(branch.Id, ct);
        var parts = await _store.GetParticipantsByChatAsync(branch.Id, ct);
        foreach (var p in parts)
            await _store.DeleteParticipantAsync(branch.Id, p.UserId, ct);
        await _store.DeleteChatMemberKeysByChatAsync(branch.Id, ct);
        await _store.DeleteChatAsync(branch.Id, ct);
    }

    SupraGroupBranchDto BuildBranchDto(
        SupraChatRecord branch,
        List<SupraChatMessageRecord>? messages,
        Guid userId,
        bool isChannelUnread)
    {
        var last = messages?.LastOrDefault();
        var unread = isChannelUnread
            ? 0
            : messages?.Count(m => m.SenderUserId != userId && m.Status != "read") ?? 0;
        return new SupraGroupBranchDto
        {
            id = branch.Id.ToString(),
            name = branch.Name,
            slug = branch.BranchSlug ?? "",
            avatar = GroupAvatarUrl(branch),
            lastMessage = last?.Text ?? "",
            lastMessageTime = last?.CreatedOn,
            unreadCount = unread,
            order = branch.BranchOrder,
        };
    }

    async Task<List<SupraGroupBranchDto>> BuildBranchDtosForRootAsync(
        Guid rootGroupId,
        Guid userId,
        Dictionary<Guid, List<SupraChatMessageRecord>> visibleByChat,
        CancellationToken ct)
    {
        var branches = await _store.GetGroupBranchesByParentAsync(rootGroupId, ct);
        var result = new List<SupraGroupBranchDto>();
        foreach (var branch in branches.OrderBy(b => b.BranchOrder).ThenBy(b => b.CreatedOn).ThenBy(b => b.Name))
        {
            visibleByChat.TryGetValue(branch.Id, out var msgs);
            result.Add(BuildBranchDto(branch, msgs, userId, false));
        }
        return result;
    }

    async Task<string> GenerateBranchSlugAsync(Guid parentChatId, string name, CancellationToken ct)
    {
        var baseSlug = NormalizeGroupBranchSlug(name);
        baseSlug = Regex.Replace(baseSlug, @"[^a-z0-9_-]+", "-");
        baseSlug = Regex.Replace(baseSlug, @"-+", "-").Trim('-');
        if (baseSlug.Length < 2)
            baseSlug = "branch";
        if (baseSlug.Length > 28)
            baseSlug = baseSlug[..28];

        var candidate = baseSlug;
        var suffix = 2;
        while (await _store.IsGroupBranchSlugTakenAsync(parentChatId, candidate, null, ct))
        {
            candidate = $"{baseSlug}-{suffix}";
            suffix++;
        }
        return candidate;
    }

    public async Task<(SupraCreateGroupBranchResponse response, List<(Guid UserId, SupraWsNewChatPayload Payload)> notifies)> CreateGroupBranchAsync(
        UserRecord user, string parentChatId, string name, string? slug, CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(name))
                return (new SupraCreateGroupBranchResponse { success = false, error = "Название ветки не указано" }, []);

            var (root, me, error) = await GetGroupAccessAsync(user.Id, parentChatId, ct);
            if (error != null)
                return (new SupraCreateGroupBranchResponse { success = false, error = error }, []);
            if (!me!.IsAdmin)
                return (new SupraCreateGroupBranchResponse { success = false, error = "Только администратор может создавать ветки" }, []);

            var rootId = root!.Id;
            var branchSlug = string.IsNullOrWhiteSpace(slug)
                ? await GenerateBranchSlugAsync(rootId, name.Trim(), ct)
                : NormalizeGroupBranchSlug(slug);
            var (slugOk, slugErr) = ValidateGroupBranchSlug(branchSlug);
            if (!slugOk)
                return (new SupraCreateGroupBranchResponse { success = false, error = slugErr }, []);
            if (await _store.IsGroupBranchSlugTakenAsync(rootId, branchSlug, null, ct))
                return (new SupraCreateGroupBranchResponse { success = false, error = "Этот адрес ветки уже используется" }, []);

            var existingBranches = await _store.GetGroupBranchesByParentAsync(rootId, ct);
            var nextOrder = existingBranches.Count == 0
                ? 0
                : existingBranches.Max(b => b.BranchOrder) + 1;

            var branchId = Guid.NewGuid();
            await _store.SaveChatAsync(new SupraChatRecord
            {
                Id = branchId,
                Name = name.Trim(),
                Type = "group_branch",
                CreatorUserId = root.CreatorUserId,
                ParentChatId = rootId,
                BranchSlug = branchSlug,
                BranchOrder = nextOrder,
                RequiresCustomGroupPassword = root.RequiresCustomGroupPassword,
            }, ct);

            var rootParticipants = await _store.GetParticipantsByChatAsync(rootId, ct);
            var notifies = new List<(Guid UserId, SupraWsNewChatPayload Payload)>();
            foreach (var p in rootParticipants)
            {
                await _store.SaveParticipantAsync(new SupraChatParticipantRecord
                {
                    Id = Guid.NewGuid(),
                    ChatId = branchId,
                    UserId = p.UserId,
                    IsAdmin = p.IsAdmin,
                }, ct);
                notifies.Add((p.UserId, await BuildNewChatPayloadAsync(p.UserId, branchId, ct)));
            }

            return (new SupraCreateGroupBranchResponse
            {
                success = true,
                chatId = branchId.ToString(),
                name = name.Trim(),
                slug = branchSlug,
                avatar = null,
                parentChatId = rootId.ToString(),
            }, notifies);
        }
        catch (Exception ex)
        {
            return (new SupraCreateGroupBranchResponse { success = false, error = ex.Message }, []);
        }
    }

    public async Task<(SupraSimpleResponse response, List<Guid> participantIds)> DeleteGroupBranchAsync(
        UserRecord user, string branchChatId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(branchChatId, out var branchGuid))
                return (new SupraSimpleResponse { success = false, error = "Некорректный chatId" }, []);

            var branch = await _store.GetChatByIdAsync(branchGuid, ct);
            if (branch == null || !IsGroupBranchChat(branch))
                return (new SupraSimpleResponse { success = false, error = "Ветка не найдена" }, []);

            var rootId = branch.ParentChatId ?? Guid.Empty;
            var (root, me, error) = await GetGroupAccessAsync(user.Id, rootId.ToString(), ct);
            if (error != null)
                return (new SupraSimpleResponse { success = false, error = error }, []);
            if (!me!.IsAdmin)
                return (new SupraSimpleResponse { success = false, error = "Только администратор может удалять ветки" }, []);

            var participantIds = (await _store.GetParticipantsByChatAsync(branchGuid, ct))
                .Select(p => p.UserId).ToList();
            await DeleteBranchChatFullyAsync(branch, ct);
            return (new SupraSimpleResponse { success = true }, participantIds);
        }
        catch (Exception ex)
        {
            return (new SupraSimpleResponse { success = false, error = ex.Message }, []);
        }
    }

    public async Task<(SupraUpdateGroupResponse response, SupraWsNewMessagePayload? systemEvent)> UpdateGroupBranchAsync(
        UserRecord user, string branchChatId, string? name, string? description, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(branchChatId, out var branchGuid))
                return (new SupraUpdateGroupResponse { success = false, error = "Некорректный chatId" }, null);

            var branch = await _store.GetChatByIdAsync(branchGuid, ct);
            if (branch == null || !IsGroupBranchChat(branch))
                return (new SupraUpdateGroupResponse { success = false, error = "Ветка не найдена" }, null);

            var (chat, me, error) = await GetGroupAccessAsync(user.Id, branchGuid.ToString(), ct);
            if (error != null)
                return (new SupraUpdateGroupResponse { success = false, error = error }, null);
            if (!me!.IsAdmin)
                return (new SupraUpdateGroupResponse { success = false, error = "Только администратор может изменять ветку" }, null);

            SupraWsNewMessagePayload? systemEvent = null;
            if (!string.IsNullOrWhiteSpace(name) && !string.Equals(branch.Name, name.Trim(), StringComparison.Ordinal))
            {
                branch.Name = name.Trim();
                await _store.SaveChatAsync(branch, ct);
                systemEvent = await InsertGroupSystemEventAsync(branch, user, "groupRenamed",
                    new Dictionary<string, string?>
                    {
                        ["actorName"] = user.DisplayName,
                        ["newName"] = branch.Name,
                    }, ct);
            }

            if (description != null && !string.Equals(branch.Description ?? "", description.Trim(), StringComparison.Ordinal))
            {
                branch.Description = description.Trim();
                await _store.SaveChatAsync(branch, ct);
            }

            return (new SupraUpdateGroupResponse
            {
                success = true,
                name = branch.Name,
                avatar = GroupAvatarUrl(branch),
                allowJoinByLink = false,
                requiresCustomGroupPassword = branch.RequiresCustomGroupPassword,
            }, systemEvent);
        }
        catch (Exception ex)
        {
            return (new SupraUpdateGroupResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<SupraGetGroupBranchLinkPreviewResponse> GetGroupBranchLinkPreviewAsync(
        Guid userId, string parentChatId, string slug, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(parentChatId, out var parentGuid))
                return new SupraGetGroupBranchLinkPreviewResponse { success = false, error = "Некорректный chatId" };

            var branch = await _store.GetGroupBranchByParentAndSlugAsync(parentGuid, slug, ct);
            if (branch == null)
                return new SupraGetGroupBranchLinkPreviewResponse { success = false, error = "Ветка не найдена" };

            var isMember = await _store.IsParticipantAsync(branch.Id, userId, ct);
            return new SupraGetGroupBranchLinkPreviewResponse
            {
                success = true,
                chatId = branch.Id.ToString(),
                parentChatId = parentGuid.ToString(),
                name = branch.Name,
                slug = branch.BranchSlug ?? "",
                avatar = GroupAvatarUrl(branch),
                isMember = isMember,
            };
        }
        catch (Exception ex)
        {
            return new SupraGetGroupBranchLinkPreviewResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> ReorderGroupBranchesAsync(
        UserRecord user, string parentChatId, List<string> branchIds, CancellationToken ct = default)
    {
        try
        {
            var (root, me, error) = await GetGroupAccessAsync(user.Id, parentChatId, ct);
            if (error != null)
                return new SupraSimpleResponse { success = false, error = error };
            if (!me!.IsAdmin)
                return new SupraSimpleResponse { success = false, error = "Только администратор может изменять ветки" };

            var rootId = root!.Id;
            var branches = (await _store.GetGroupBranchesByParentAsync(rootId, ct)).ToList();
            var branchIdSet = branches.Select(b => b.Id.ToString()).ToHashSet();
            var ordered = new List<Guid>();
            foreach (var idStr in branchIds)
            {
                if (!Guid.TryParse(idStr, out var gid) || !branchIdSet.Contains(idStr))
                    continue;
                if (!ordered.Contains(gid)) ordered.Add(gid);
            }
            foreach (var branch in branches)
            {
                if (!ordered.Contains(branch.Id)) ordered.Add(branch.Id);
            }
            for (var i = 0; i < ordered.Count; i++)
            {
                var branch = branches.First(b => b.Id == ordered[i]);
                if (branch.BranchOrder == i) continue;
                branch.BranchOrder = i;
                await _store.SaveChatAsync(branch, ct);
            }
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    async Task<SupraWsNewChatPayload> BuildNewChatPayloadAsync(Guid userId, Guid chatId, CancellationToken ct)
    {
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        return new SupraWsNewChatPayload
        {
            chatId = chatId.ToString(),
            chatName = chat?.Name ?? "",
            chatType = chat?.Type ?? "group_branch",
            chatAvatar = chat != null ? GroupAvatarUrl(chat) : null,
            parentChatId = chat?.ParentChatId?.ToString(),
            branchSlug = chat?.BranchSlug,
        };
    }
}
