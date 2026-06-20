using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class BotApiService
{
    public async Task<BotApiGetChatInfoResponse> GetChatInfoAsync(
        UserRecord botUser, string chatId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return new BotApiGetChatInfoResponse { success = false, error = "Некорректный chatId" };

            if (!await _store.IsParticipantAsync(chatGuid, botUser.Id, ct))
                return new BotApiGetChatInfoResponse { success = false, error = "Бот не является участником чата" };

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat == null)
                return new BotApiGetChatInfoResponse { success = false, error = "Чат не найден" };

            if (SupraMessengerService.IsGroupChat(chat))
            {
                var info = await _messenger.GetGroupInfoAsync(botUser.Id, chatGuid.ToString(), ct);
                if (!info.success)
                    return new BotApiGetChatInfoResponse { success = false, error = info.error };

                return new BotApiGetChatInfoResponse
                {
                    success = true,
                    chatId = info.chatId,
                    chatType = SupraMessengerService.IsGroupBranchChat(chat) ? "group_branch" : "group",
                    name = info.name,
                    description = info.description,
                    avatar = info.avatar,
                    parentChatId = info.parentChatId,
                    branchSlug = info.branchSlug,
                    isBranch = info.isBranch,
                    isAdmin = info.isAdmin,
                    isCreator = info.isCreator,
                    canEdit = info.canEdit,
                    canPost = true,
                    canManageMembers = info.isAdmin,
                    allowJoinByLink = info.allowJoinByLink,
                    encryptionEnabled = chat.EncryptionEnabled,
                    members = info.members.Select(m => new BotApiGroupMemberDto
                    {
                        id = m.id,
                        name = m.name,
                        login = m.login,
                        avatar = m.avatar,
                        isAdmin = m.isAdmin,
                        isCreator = m.isCreator,
                    }).ToList(),
                    branches = info.branches.Select(b => new BotApiGroupBranchDto
                    {
                        id = b.id,
                        name = b.name,
                        slug = b.slug,
                        avatar = b.avatar,
                        order = b.order,
                    }).ToList(),
                };
            }

            if (SupraMessengerService.IsChannelChat(chat))
            {
                var info = await _messenger.GetChannelInfoAsync(botUser.Id, chatGuid.ToString(), ct);
                if (!info.success)
                    return new BotApiGetChatInfoResponse { success = false, error = info.error };

                return new BotApiGetChatInfoResponse
                {
                    success = true,
                    chatId = info.chatId,
                    chatType = "channel",
                    name = info.name,
                    slug = info.slug,
                    description = info.description,
                    avatar = info.avatar,
                    isAdmin = info.myRole is ChannelRoles.Admin or ChannelRoles.Owner,
                    isCreator = info.isOwner,
                    canEdit = info.canEdit,
                    canPost = info.canPost,
                    canManageMembers = info.canManageMembers,
                    myRole = info.myRole,
                    members = info.members.Select(m => new BotApiGroupMemberDto
                    {
                        id = m.id,
                        name = m.name,
                        login = m.login,
                        avatar = m.avatar,
                        isAdmin = m.role is ChannelRoles.Admin or ChannelRoles.Owner,
                        isCreator = m.isOwner,
                        role = m.role,
                    }).ToList(),
                };
            }

            return new BotApiGetChatInfoResponse { success = false, error = "Поддерживаются только группы и каналы" };
        }
        catch (Exception ex)
        {
            return new BotApiGetChatInfoResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(BotApiUpdateGroupResponse response, SupraWsNewMessagePayload? systemEvent, SupraWsGroupUpdatedPayload? groupUpdated)>
        UpdateGroupAsync(
            UserRecord botUser,
            string chatId,
            string? name,
            string? description,
            bool? allowJoinByLink,
            CancellationToken ct = default)
    {
        try
        {
            var (result, systemEvent) = await _messenger.UpdateGroupAsync(
                botUser, chatId, name, allowJoinByLink, null, description, ct);
            if (!result.success)
                return (MapUpdateGroupResponse(chatId, result), null, null);

            SupraWsGroupUpdatedPayload? groupUpdated = null;
            if (Guid.TryParse(chatId, out var chatGuid))
                groupUpdated = await _messenger.GetGroupUpdatedPayloadAsync(chatGuid, ct);

            return (MapUpdateGroupResponse(chatId, result), systemEvent, groupUpdated);
        }
        catch (Exception ex)
        {
            return (new BotApiUpdateGroupResponse { success = false, error = ex.Message }, null, null);
        }
    }

    public async Task<(BotApiUpdateGroupResponse response, SupraWsNewMessagePayload? systemEvent, SupraWsGroupUpdatedPayload? groupUpdated)>
        SaveGroupAvatarAsync(UserRecord botUser, string chatId, string avatarPath, CancellationToken ct = default)
    {
        try
        {
            var (result, systemEvent) = await _messenger.SaveGroupAvatarPathAsync(botUser, chatId, avatarPath, ct);
            if (!result.success)
                return (MapUpdateGroupResponse(chatId, result), null, null);

            SupraWsGroupUpdatedPayload? groupUpdated = null;
            if (Guid.TryParse(chatId, out var chatGuid))
                groupUpdated = await _messenger.GetGroupUpdatedPayloadAsync(chatGuid, ct);

            return (MapUpdateGroupResponse(chatId, result), systemEvent, groupUpdated);
        }
        catch (Exception ex)
        {
            return (new BotApiUpdateGroupResponse { success = false, error = ex.Message }, null, null);
        }
    }

    public async Task<BotApiSimpleResponse> RemoveGroupMemberAsync(
        UserRecord botUser, string chatId, string memberUserId, CancellationToken ct = default)
    {
        try
        {
            var result = await _messenger.RemoveGroupMemberAsync(botUser, chatId, memberUserId, ct);
            return new BotApiSimpleResponse { success = result.success, error = result.error };
        }
        catch (Exception ex)
        {
            return new BotApiSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<BotApiSimpleResponse> BlockGroupMemberAsync(
        UserRecord botUser, string chatId, string memberUserId, CancellationToken ct = default)
    {
        try
        {
            var result = await _messenger.BlockGroupMemberAsync(botUser, chatId, memberUserId, ct);
            return new BotApiSimpleResponse { success = result.success, error = result.error };
        }
        catch (Exception ex)
        {
            return new BotApiSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(BotApiCreateGroupBranchResponse response, List<(Guid UserId, SupraWsNewChatPayload Payload)> notifies)>
        CreateGroupBranchAsync(
            UserRecord botUser,
            string parentChatId,
            string name,
            string? slug,
            CancellationToken ct = default)
    {
        try
        {
            var (result, notifies) = await _messenger.CreateGroupBranchAsync(
                botUser, parentChatId, name, slug, ct);
            return (new BotApiCreateGroupBranchResponse
            {
                success = result.success,
                chatId = result.chatId,
                parentChatId = result.parentChatId,
                name = result.name,
                slug = result.slug,
                avatar = result.avatar,
                error = result.error,
            }, notifies);
        }
        catch (Exception ex)
        {
            return (new BotApiCreateGroupBranchResponse { success = false, error = ex.Message }, []);
        }
    }

    public async Task<(BotApiUpdateGroupResponse response, SupraWsNewMessagePayload? systemEvent)>
        UpdateGroupBranchAsync(
            UserRecord botUser,
            string branchChatId,
            string? name,
            string? description,
            CancellationToken ct = default)
    {
        try
        {
            var (result, systemEvent) = await _messenger.UpdateGroupBranchAsync(
                botUser, branchChatId, name, description, ct);
            return (new BotApiUpdateGroupResponse
            {
                success = result.success,
                chatId = branchChatId,
                name = result.name,
                description = description,
                avatar = result.avatar,
                allowJoinByLink = result.allowJoinByLink,
                error = result.error,
            }, systemEvent);
        }
        catch (Exception ex)
        {
            return (new BotApiUpdateGroupResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<(BotApiSimpleResponse response, List<Guid> participantIds)> DeleteGroupBranchAsync(
        UserRecord botUser, string branchChatId, CancellationToken ct = default)
    {
        try
        {
            var (result, participantIds) = await _messenger.DeleteGroupBranchAsync(botUser, branchChatId, ct);
            return (new BotApiSimpleResponse { success = result.success, error = result.error }, participantIds);
        }
        catch (Exception ex)
        {
            return (new BotApiSimpleResponse { success = false, error = ex.Message }, []);
        }
    }

    public async Task<BotApiSimpleResponse> ReorderGroupBranchesAsync(
        UserRecord botUser, string parentChatId, IReadOnlyList<string> branchIds, CancellationToken ct = default)
    {
        try
        {
            var result = await _messenger.ReorderGroupBranchesAsync(
                botUser, parentChatId, branchIds.ToList(), ct);
            return new BotApiSimpleResponse { success = result.success, error = result.error };
        }
        catch (Exception ex)
        {
            return new BotApiSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(BotApiUpdateChannelResponse response, SupraWsChannelUpdatedPayload? updated)>
        UpdateChannelAsync(
            UserRecord botUser,
            string chatId,
            string? name,
            string? description,
            CancellationToken ct = default)
    {
        try
        {
            var (result, updated) = await _messenger.UpdateChannelAsync(
                botUser, chatId, name, null, description, ct);
            return (new BotApiUpdateChannelResponse
            {
                success = result.success,
                chatId = chatId,
                name = result.name,
                slug = result.slug,
                description = result.description,
                avatar = result.avatar,
                error = result.error,
            }, updated);
        }
        catch (Exception ex)
        {
            return (new BotApiUpdateChannelResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<(BotApiUpdateChannelResponse response, SupraWsChannelUpdatedPayload? updated)>
        SaveChannelAvatarAsync(UserRecord botUser, string chatId, string avatarPath, CancellationToken ct = default)
    {
        try
        {
            var (result, updated) = await _messenger.SaveChannelAvatarPathAsync(botUser, chatId, avatarPath, ct);
            return (new BotApiUpdateChannelResponse
            {
                success = result.success,
                chatId = chatId,
                name = result.name,
                slug = result.slug,
                description = result.description,
                avatar = result.avatar,
                error = result.error,
            }, updated);
        }
        catch (Exception ex)
        {
            return (new BotApiUpdateChannelResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<BotApiSimpleResponse> RemoveChannelMemberAsync(
        UserRecord botUser, string chatId, string memberUserId, CancellationToken ct = default)
    {
        try
        {
            var result = await _messenger.RemoveChannelMemberAsync(botUser, chatId, memberUserId, ct);
            return new BotApiSimpleResponse { success = result.success, error = result.error };
        }
        catch (Exception ex)
        {
            return new BotApiSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<BotApiSimpleResponse> SetChannelMemberRoleAsync(
        UserRecord botUser, string chatId, string memberUserId, string role, CancellationToken ct = default)
    {
        try
        {
            var result = await _messenger.SetChannelMemberRoleAsync(botUser, chatId, memberUserId, role, ct);
            return new BotApiSimpleResponse { success = result.success, error = result.error };
        }
        catch (Exception ex)
        {
            return new BotApiSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<BotApiGetChannelSubscribersResponse> GetChannelSubscribersAsync(
        UserRecord botUser,
        string chatId,
        int page,
        int pageSize,
        string? query,
        CancellationToken ct = default)
    {
        try
        {
            var result = await _messenger.GetChannelSubscribersAsync(
                botUser.Id, chatId, page, pageSize, query, ct);
            return new BotApiGetChannelSubscribersResponse
            {
                success = result.success,
                hasMore = result.hasMore,
                error = result.error,
                subscribers = result.subscribers.Select(s => new BotApiGroupMemberDto
                {
                    id = s.id,
                    name = s.name,
                    login = s.login,
                    avatar = s.avatar,
                    role = s.role,
                }).ToList(),
            };
        }
        catch (Exception ex)
        {
            return new BotApiGetChannelSubscribersResponse { success = false, error = ex.Message };
        }
    }

    static BotApiUpdateGroupResponse MapUpdateGroupResponse(string chatId, SupraUpdateGroupResponse result) =>
        new()
        {
            success = result.success,
            chatId = chatId,
            name = result.name,
            description = result.description,
            avatar = result.avatar,
            allowJoinByLink = result.allowJoinByLink,
            error = result.error,
        };
}
