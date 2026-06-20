using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/messenger")]
[Authorize]
public sealed class SupraMessengerController : ControllerBase
{
    private readonly SupraMessengerService _messenger;
    private readonly CurrentUserAccessor _current;
    private readonly RealtimeNotifier _realtime;
    private readonly UserPresenceService _presence;
    private readonly PushNotificationService _push;
    private readonly NotificationPreferencesStore _notifPrefs;
    private readonly IDataStore _store;
    private readonly PushDiagnosticLogStore _pushLog;
    private readonly MessageInfoService _messageInfo;
    private readonly MessengerSyncService _sync;
    private readonly BotApiService _botApi;
    private readonly BotInboxNotifier _botInbox;
    private readonly AppAppearanceService _appearance;
    private readonly OfflineMessagePushService _offlinePush;

    public SupraMessengerController(
        SupraMessengerService messenger,
        CurrentUserAccessor current,
        RealtimeNotifier realtime,
        UserPresenceService presence,
        PushNotificationService push,
        NotificationPreferencesStore notifPrefs,
        IDataStore store,
        PushDiagnosticLogStore pushLog,
        MessageInfoService messageInfo,
        MessengerSyncService sync,
        BotApiService botApi,
        BotInboxNotifier botInbox,
        AppAppearanceService appearance,
        OfflineMessagePushService offlinePush)
    {
        _messenger = messenger;
        _current = current;
        _realtime = realtime;
        _presence = presence;
        _push = push;
        _notifPrefs = notifPrefs;
        _store = store;
        _pushLog = pushLog;
        _messageInfo = messageInfo;
        _sync = sync;
        _botApi = botApi;
        _botInbox = botInbox;
        _appearance = appearance;
        _offlinePush = offlinePush;
    }

    [HttpPost("{methodName}")]
    public async Task<IActionResult> Invoke(string methodName, [FromBody] JsonElement? body, CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();

        var data = body ?? default;
        object? result = methodName switch
        {
            "GetCurrentUser" => await _messenger.GetCurrentUserAsync(user, ct),
            "GetChats" => await _messenger.GetChatsAsync(user.Id, ct),
            "RequestSync" => await HandleRequestSync(user, data, ct),
            "GetContacts" => await _messenger.GetContactsAsync(
                user.Id,
                GetInt(data, "page", 1),
                GetInt(data, "rowCount", 15),
                GetString(data, "searchQuery") ?? "",
                ct),
            "GetAllContacts" => await _messenger.GetAllContactsAsync(
                user.Id,
                GetInt(data, "page", 1),
                GetInt(data, "rowCount", 50),
                GetString(data, "searchQuery") ?? "",
                GetBool(data, "chatContactsOnly"),
                ct),
            "GetMessages" => await _messenger.GetMessagesAsync(
                user.Id,
                GetString(data, "chatId") ?? "",
                GetInt(data, "offset", 0),
                GetInt(data, "count", 50),
                GetString(data, "afterMessageId"),
                ct),
            "GetMessageSyncIndex" => await _messenger.GetMessageSyncIndexAsync(
                user.Id,
                GetString(data, "chatId") ?? "",
                GetString(data, "afterMessageId"),
                ct),
            "SyncChatPanel" => await HandleSyncChatPanel(user, data, ct),
            "GetMessagesAround" => await _messenger.GetMessagesAroundAsync(
                user.Id,
                GetString(data, "chatId") ?? "",
                GetString(data, "messageId") ?? "",
                GetInt(data, "before", 25),
                GetInt(data, "after", 25),
                ct),
            "GetMessageInfo" => await _messageInfo.GetAsync(
                user,
                GetString(data, "chatId") ?? "",
                GetString(data, "messageId") ?? "",
                ct),
            "SendMessage" => await HandleSendMessage(user, data, ct),
            "PressMessageButton" => await HandlePressMessageButton(user, data, ct),
            "EditMessage" => await HandleEditMessage(user, data, ct),
            "DeleteMessage" => await HandleDeleteMessage(user, data, ct),
            "BatchRequest" => await HandleBatchRequest(user, data, ct),
            "ForwardMessage" => await HandleForwardMessage(user, data, ct),
            "MarkMessagesRead" => await HandleMarkRead(user, data, ct),
            "CreateDirectChat" => await HandleCreateDirect(user, data, ct),
            "CreateGroup" => await HandleCreateGroup(user, data, ct),
            "GetOrCreateChatById" => await _messenger.GetOrCreateChatByIdAsync(
                user,
                GetString(data, "chatId") ?? "",
                GetString(data, "chatName") ?? "",
                ct),
            "SendUserActivity" => await HandleActivity(user, data, ct),
            "SendMetadata" => new { success = true },
            "ClearChatHistory" => await HandleClearChatHistory(user, data, ct),
            "LeaveChat" => await HandleLeaveChat(user, data, ct),
            "GetFolders" => await _messenger.GetFoldersAsync(user.Id, ct),
            "SaveFolder" => await _messenger.SaveFolderAsync(
                user.Id,
                GetString(data, "folderId"),
                GetString(data, "name") ?? "",
                GetString(data, "icon") ?? "",
                ct),
            "DeleteFolder" => await _messenger.DeleteFolderAsync(
                user.Id,
                GetString(data, "folderId") ?? "",
                ct),
            "SetChatFolder" => await _messenger.SetChatFolderAsync(
                user.Id,
                GetString(data, "chatId") ?? "",
                GetString(data, "folderId") ?? "",
                ct),
            "RemoveChatFromFolder" => await _messenger.RemoveChatFromFolderAsync(
                user.Id,
                GetString(data, "chatId") ?? "",
                GetString(data, "folderId"),
                ct),
            "ReorderFolders" => await _messenger.ReorderFoldersAsync(
                user.Id,
                GetStringList(data, "folderIds"),
                ct),
            "GetGroupInfo" => await _messenger.GetGroupInfoAsync(
                user.Id,
                GetString(data, "chatId") ?? "",
                ct),
            "UpdateGroup" => await HandleUpdateGroup(user, data, ct),
            "SetGroupEncryption" => await HandleSetGroupEncryption(user, data, ct),
            "GetGroupLinkPreview" => await _messenger.GetGroupLinkPreviewAsync(
                user.Id,
                GetString(data, "chatId") ?? "",
                ct),
            "JoinGroupByLink" => await HandleJoinGroupByLink(user, data, ct),
            "AddGroupMembers" => await HandleAddGroupMembers(user, data, ct),
            "RemoveGroupMember" => await HandleRemoveGroupMember(user, data, ct),
            "SetGroupMemberAdmin" => await HandleSetGroupMemberAdmin(user, data, ct),
            "CreateGroupBranch" => await HandleCreateGroupBranch(user, data, ct),
            "DeleteGroupBranch" => await HandleDeleteGroupBranch(user, data, ct),
            "UpdateGroupBranch" => await HandleUpdateGroupBranch(user, data, ct),
            "GetGroupBranchLinkPreview" => await _messenger.GetGroupBranchLinkPreviewAsync(
                user.Id,
                GetString(data, "parentChatId") ?? "",
                GetString(data, "slug") ?? "",
                ct),
            "ReorderGroupBranches" => await _messenger.ReorderGroupBranchesAsync(
                user,
                GetString(data, "parentChatId") ?? GetString(data, "chatId") ?? "",
                GetStringList(data, "branchIds"),
                ct),
            "BlockUser" => await HandleBlockUser(user, data, ct),
            "BlockGroup" => await HandleBlockGroup(user, data, ct),
            "CreateChannel" => await HandleCreateChannel(user, data, ct),
            "GetMyChannels" => await _messenger.GetMyChannelsAsync(user.Id, ct),
            "GetChannelInfo" => await _messenger.GetChannelInfoAsync(
                user.Id,
                GetString(data, "chatId") ?? "",
                ct),
            "UpdateChannel" => await HandleUpdateChannel(user, data, ct),
            "GetChannelLinkPreview" => await _messenger.GetChannelLinkPreviewAsync(
                user.Id,
                GetString(data, "slug") ?? "",
                ct),
            "SubscribeChannel" => await HandleSubscribeChannel(user, data, ct),
            "UnsubscribeChannel" => await HandleUnsubscribeChannel(user, data, ct),
            "SetChannelMemberRole" => await HandleSetChannelMemberRole(user, data, ct),
            "TransferChannelOwnership" => await _messenger.TransferChannelOwnershipAsync(
                user,
                GetString(data, "chatId") ?? "",
                GetString(data, "newOwnerUserId") ?? "",
                ct),
            "DeleteChannel" => await HandleDeleteChannel(user, data, ct),
            "RestoreChannel" => await HandleRestoreChannel(user, data, ct),
            "GetChannelSubscribers" => await _messenger.GetChannelSubscribersAsync(
                user.Id,
                GetString(data, "chatId") ?? "",
                GetInt(data, "page", 1),
                GetInt(data, "pageSize", 10),
                GetString(data, "query"),
                ct),
            "AddChannelMember" => await HandleAddChannelMember(user, data, ct),
            "RemoveChannelMember" => await HandleRemoveChannelMember(user, data, ct),
            "CreateBot" => await HandleCreateBot(user, data, ct),
            "GetMyBots" => await _messenger.GetMyBotsAsync(user.Id, ct),
            "GetBotInfo" => await _messenger.GetBotInfoAsync(
                user.Id,
                GetString(data, "botUserId") ?? "",
                GetString(data, "chatId"),
                ct),
            "UpdateBot" => await HandleUpdateBot(user, data, ct),
            "GetBotLinkPreview" => await _messenger.GetBotLinkPreviewAsync(
                user.Id,
                GetString(data, "slug") ?? "",
                ct),
            "StartBot" => await HandleStartBot(user, data, ct),
            "TransferBotOwnership" => await _messenger.TransferBotOwnershipAsync(
                user,
                GetString(data, "botUserId") ?? "",
                GetString(data, "newOwnerUserId") ?? "",
                ct),
            "DeleteBot" => await HandleDeleteBot(user, data, ct),
            "RestoreBot" => await HandleRestoreBot(user, data, ct),
            "GetBotUsers" => await _messenger.GetBotUsersAsync(
                user.Id,
                GetString(data, "botUserId") ?? "",
                GetInt(data, "page", 1),
                GetInt(data, "pageSize", 10),
                GetString(data, "query") ?? "",
                ct),
            "GenerateBotToken" => await _messenger.GenerateBotTokenAsync(
                user,
                GetString(data, "botUserId") ?? "",
                ct),
            "AddBotAssistant" => await _messenger.AddBotAssistantAsync(
                user,
                GetString(data, "botUserId") ?? "",
                ct),
            "RemoveBotAssistant" => await _messenger.RemoveBotAssistantAsync(
                user,
                GetString(data, "botUserId") ?? "",
                ct),
            "GetBotAssistants" => await _messenger.GetBotAssistantsAsync(user.Id, ct),
            "InvokeBotAssistant" => await HandleInvokeBotAssistant(user, data, ct),
            "ConfirmAssistantReply" => await _messenger.ConfirmAssistantReplyAsync(
                user,
                GetString(data, "sessionId") ?? "",
                GetString(data, "insertedMessageId") ?? "",
                ct),
            "DismissAssistantReply" => await _messenger.DismissAssistantReplyAsync(
                user,
                GetString(data, "sessionId") ?? "",
                ct),
            "GetPendingAssistantReplies" => await _messenger.GetPendingAssistantRepliesAsync(user.Id, ct),
            _ => new { success = false, error = $"Unknown method: {methodName}" },
        };

        return Ok(Wrap(methodName, result));
    }

    private async Task<object> HandleSendMessage(UserRecord user, JsonElement data, CancellationToken ct)
    {
        var attachmentFileIds = GetGuidList(data, "attachmentFileIds");
        var (response, broadcast) = await _messenger.SendMessageAsync(
            user,
            GetString(data, "chatId") ?? "",
            GetString(data, "text") ?? "",
            GetString(data, "replyToMessageId"),
            GetString(data, "forwardedFromSenderName"),
            GetString(data, "replyToTextPreview"),
            GetString(data, "encryptionTier"),
            GetString(data, "localId"),
            attachmentFileIds.Count > 0 ? attachmentFileIds : null,
            buttons: null,
            assistantReplyJson: null,
            ct: ct);
        if (broadcast != null && Guid.TryParse(broadcast.chatId, out var chatId))
        {
            var pushTrace = await BroadcastToAllChatParticipantsAsync(chatId, broadcast, ct);
            if (user.Type == UserType.Admin && pushTrace != null)
            {
                pushTrace.messageId = response.messageId;
                pushTrace.senderUserId = user.Id.ToString();
                _pushLog.Add(pushTrace);
                response.pushDebug = pushTrace;
            }

            if (response.success &&
                Guid.TryParse(response.messageId, out var msgGuid))
            {
                await NotifyBotInboxAsync(msgGuid, chatId, ct);
            }
        }
        if (response.success)
            await TouchPresenceAsync(user.Id, ct);
        return response;
    }

    private async Task<object> HandlePressMessageButton(UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, broadcast) = await _messenger.PressMessageButtonAsync(
            user,
            GetString(data, "chatId") ?? "",
            GetString(data, "sourceMessageId") ?? "",
            GetString(data, "buttonId") ?? "",
            GetString(data, "localId"),
            ct);
        if (broadcast != null && Guid.TryParse(broadcast.chatId, out var chatId))
        {
            await BroadcastToAllChatParticipantsAsync(chatId, broadcast, ct);
            if (response.success &&
                Guid.TryParse(response.messageId, out var msgGuid))
            {
                await NotifyBotInboxAsync(msgGuid, chatId, ct);
            }
        }
        if (response.success)
            await TouchPresenceAsync(user.Id, ct);
        return response;
    }

    async Task NotifyBotInboxAsync(Guid messageId, Guid chatId, CancellationToken ct)
    {
        var message = await _store.GetMessageByIdAsync(messageId, ct);
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        if (message == null || chat == null) return;
        var inbox = await _botApi.RecordIncomingMessageAsync(message, chat, ct);
        if (inbox.Count > 0)
        {
            await _botInbox.NotifyAsync(inbox, ct);
            await MarkReadForBotsAsync(inbox, chatId, ct);
        }
    }

    // Когда сообщение пользователя доставлено боту в инбокс, бот считается «прочитавшим» его —
    // ставим вторую галочку (статус "read") и оповещаем отправителя.
    async Task MarkReadForBotsAsync(IReadOnlyList<Core.Entities.BotInboxMessageRecord> inbox, Guid chatId, CancellationToken ct)
    {
        var chatIdStr = chatId.ToString();
        foreach (var botUserId in inbox.Select(i => i.BotUserId).Distinct())
        {
            var (response, updates) = await _messenger.MarkMessagesReadAsync(botUserId, chatIdStr, ct);
            if (response.success && updates.Count > 0)
                await BroadcastMarkReadSideEffectsAsync(botUserId, chatIdStr, response.success, updates, ct);
        }
    }

    private async Task<object> HandleInvokeBotAssistant(UserRecord user, JsonElement data, CancellationToken ct)
    {
        var plaintextMessages = ParseAssistantInvokeMessages(data);
        var (response, inboxRecords, broadcasts) = await _messenger.InvokeBotAssistantAsync(
            user,
            GetString(data, "sourceChatId") ?? "",
            GetStringList(data, "messageIds"),
            GetString(data, "botUserId") ?? "",
            GetString(data, "menuItemId") ?? "",
            plaintextMessages,
            ct);

        foreach (var (chatId, payload) in broadcasts)
            await BroadcastToAllChatParticipantsAsync(chatId, payload, ct);

        if (inboxRecords.Count > 0)
            await _botInbox.NotifyAsync(inboxRecords, ct);

        if (response.success)
            await TouchPresenceAsync(user.Id, ct);

        return response;
    }

    static List<SupraAssistantInvokeMessageDto> ParseAssistantInvokeMessages(JsonElement data)
    {
        if (!data.TryGetProperty("plaintextMessages", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return [];

        var list = new List<SupraAssistantInvokeMessageDto>();
        foreach (var item in arr.EnumerateArray())
        {
            var dto = new SupraAssistantInvokeMessageDto
            {
                text = item.TryGetProperty("text", out var textEl) && textEl.ValueKind == JsonValueKind.String
                    ? textEl.GetString() ?? ""
                    : "",
                senderName = item.TryGetProperty("senderName", out var senderEl) && senderEl.ValueKind == JsonValueKind.String
                    ? senderEl.GetString()
                    : null,
                originalMessageId = item.TryGetProperty("originalMessageId", out var origEl) && origEl.ValueKind == JsonValueKind.String
                    ? origEl.GetString()
                    : null,
            };
            if (item.TryGetProperty("attachmentFileIds", out var filesEl) && filesEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var f in filesEl.EnumerateArray())
                {
                    if (f.ValueKind == JsonValueKind.String)
                    {
                        var s = f.GetString();
                        if (!string.IsNullOrWhiteSpace(s))
                            dto.attachmentFileIds.Add(s);
                    }
                }
            }
            list.Add(dto);
        }
        return list;
    }

    private async Task<object> HandleEditMessage(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var attachmentFileIds = GetGuidList(data, "attachmentFileIds");
        var (response, broadcast) = await _messenger.EditMessageAsync(
            user,
            GetString(data, "chatId") ?? "",
            GetString(data, "messageId") ?? "",
            GetString(data, "text"),
            attachmentFileIds.Count > 0 ? attachmentFileIds : null,
            ParseButtons(data),
            ct);
        if (broadcast != null && Guid.TryParse(broadcast.chatId, out var chatId))
            await BroadcastMessageUpdatedAsync(chatId, broadcast, ct);
        return response;
    }

    private async Task<object> HandleDeleteMessage(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, broadcast, _) = await _messenger.DeleteMessageAsync(
            user,
            GetString(data, "chatId") ?? "",
            GetString(data, "messageId") ?? "",
            GetBool(data, "deleteForEveryone"),
            ct);
        if (response is SupraDeleteMessageResponse { success: true } && broadcast != null &&
            Guid.TryParse(broadcast.chatId, out var chatId))
        {
            try
            {
                var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);
                foreach (var uid in participants)
                    await _realtime.SendToUserAsync(uid, broadcast, ct);
            }
            catch
            {
                // Удаление уже сохранено — сбой доставки WS не должен валить запрос.
            }
        }
        return response;
    }

    private async Task<object> HandleBatchRequest(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var action = GetString(data, "action") ?? "";
        if (string.Equals(action, "getMessageInfo", StringComparison.OrdinalIgnoreCase))
            return await HandleBatchGetMessageInfo(user, data, ct);

        var (response, sideEffects) = await _messenger.ExecuteBatchAsync(
            user,
            action,
            GetString(data, "chatId") ?? "",
            GetStringList(data, "messageIds"),
            GetStringList(data, "contactIds"),
            GetBool(data, "deleteForEveryone"),
            GetForwardItems(data),
            ct);

        foreach (var broadcast in sideEffects.DeleteBroadcasts)
        {
            if (!Guid.TryParse(broadcast.chatId, out var chatId)) continue;
            var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);
            foreach (var uid in participants)
                await _realtime.SendToUserAsync(uid, broadcast, ct);
        }

        foreach (var (chatId, payload) in sideEffects.NewMessageBroadcasts)
        {
            await BroadcastToAllChatParticipantsAsync(chatId, payload, ct);
            if (Guid.TryParse(payload.messageId, out var msgGuid))
                await NotifyBotInboxAsync(msgGuid, chatId, ct);
        }

        foreach (var (payload, senderUserId) in sideEffects.StatusUpdates)
            await _realtime.SendToUserAsync(senderUserId, payload, ct);

        if (sideEffects.ChatReadBroadcast != null && sideEffects.ChatReadUserId.HasValue)
            await _realtime.SendToUserAsync(sideEffects.ChatReadUserId.Value, sideEffects.ChatReadBroadcast, ct);

        if (response.success && sideEffects.NewMessageBroadcasts.Count > 0)
            await TouchPresenceAsync(user.Id, ct);

        return response;
    }

    private async Task<object> HandleBatchGetMessageInfo(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var messageIds = GetStringList(data, "messageIds");
        if (messageIds.Count == 0)
            return new SupraBatchResponse { success = false, error = "Не указаны сообщения" };

        var results = new List<SupraBatchItemResult>();
        foreach (var messageId in messageIds.Distinct(StringComparer.Ordinal))
        {
            var infoResponse = await _messageInfo.GetAsync(user, chatId, messageId, ct);
            results.Add(new SupraBatchItemResult
            {
                messageId = messageId,
                success = infoResponse.success,
                error = infoResponse.error,
                data = infoResponse.success ? infoResponse.info : null,
            });
        }

        var successCount = results.Count(r => r.success);
        return new SupraBatchResponse
        {
            success = successCount > 0,
            error = successCount == 0 ? "Не удалось получить информацию о сообщениях" : null,
            results = results,
        };
    }

    private static List<SupraBatchForwardItem> GetForwardItems(JsonElement data)
    {
        if (data.ValueKind != JsonValueKind.Object || !data.TryGetProperty("items", out var arr)
            || arr.ValueKind != JsonValueKind.Array)
            return [];

        var list = new List<SupraBatchForwardItem>();
        foreach (var el in arr.EnumerateArray())
        {
            if (el.ValueKind != JsonValueKind.Object) continue;
            var item = new SupraBatchForwardItem
            {
                targetChatId = el.TryGetProperty("targetChatId", out var tc) ? tc.GetString() ?? "" : "",
                sourceMessageId = el.TryGetProperty("sourceMessageId", out var sm) ? sm.GetString() ?? "" : "",
                text = el.TryGetProperty("text", out var t) ? t.GetString() ?? "" : "",
                forwardedFromSenderName = el.TryGetProperty("forwardedFromSenderName", out var f) ? f.GetString() : null,
                encryptionTier = el.TryGetProperty("encryptionTier", out var e) ? e.GetString() ?? "basic" : "basic",
                attachmentFileIds = GetGuidStringList(el, "attachmentFileIds"),
            };
            if (!string.IsNullOrWhiteSpace(item.targetChatId) && !string.IsNullOrWhiteSpace(item.text))
                list.Add(item);
        }
        return list;
    }

    private async Task<object> HandleForwardMessage(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, broadcasts) = await _messenger.ForwardMessageAsync(
            user,
            GetString(data, "chatId") ?? "",
            GetString(data, "messageId") ?? "",
            GetStringList(data, "contactIds"),
            ct);
        foreach (var (chatId, payload) in broadcasts)
            await BroadcastToAllChatParticipantsAsync(chatId, payload, ct);
        if (response.success)
            await TouchPresenceAsync(user.Id, ct);
        return response;
    }

    async Task BroadcastMessageUpdatedAsync(Guid chatId, SupraWsMessageUpdatedPayload payload, CancellationToken ct)
    {
        var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);
        foreach (var uid in participants)
            await _realtime.SendToUserAsync(uid, payload, ct);
    }

    private async Task<object> HandleRequestSync(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var request = new SupraRequestSyncRequest
        {
            includeProfiles = !data.TryGetProperty("includeProfiles", out var ip) || ip.ValueKind != JsonValueKind.False,
            includeEncryptionKeys = !data.TryGetProperty("includeEncryptionKeys", out var ik) || ik.ValueKind != JsonValueKind.False,
            messageLimit = GetInt(data, "messageLimit", 50),
        };
        if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("chatCursors", out var cursorsEl)
            && cursorsEl.ValueKind == JsonValueKind.Object)
        {
            request.chatCursors = new Dictionary<string, string?>();
            foreach (var prop in cursorsEl.EnumerateObject())
            {
                request.chatCursors[prop.Name] = prop.Value.ValueKind == JsonValueKind.Null
                    ? null
                    : prop.Value.GetString();
            }
        }
        if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("chatRevCursors", out var revEl)
            && revEl.ValueKind == JsonValueKind.Object)
        {
            request.chatRevCursors = new Dictionary<string, long?>();
            foreach (var prop in revEl.EnumerateObject())
            {
                request.chatRevCursors[prop.Name] = prop.Value.ValueKind == JsonValueKind.Number
                    && prop.Value.TryGetInt64(out var rev)
                    ? rev
                    : null;
            }
        }
        return await _sync.RequestSyncAsync(user, request, ct);
    }

    private async Task<object> HandleMarkRead(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatIdStr = GetString(data, "chatId") ?? "";
        var (response, updates) = await _messenger.MarkMessagesReadAsync(user.Id, chatIdStr, ct);
        await BroadcastMarkReadSideEffectsAsync(user.Id, chatIdStr, response.success, updates, ct);
        return response;
    }

    private async Task<object> HandleSyncChatPanel(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatIdStr = GetString(data, "chatId") ?? "";
        var (response, updates) = await _messenger.SyncChatPanelAsync(
            user.Id,
            chatIdStr,
            GetOptionalInt(data, "count"),
            GetString(data, "afterMessageId"),
            GetBool(data, "markAsRead"),
            ct);
        if (response.markedRead)
            await BroadcastMarkReadSideEffectsAsync(user.Id, chatIdStr, response.success, updates, ct);
        return response;
    }

    private async Task BroadcastMarkReadSideEffectsAsync(
        Guid readerUserId,
        string chatIdStr,
        bool success,
        List<(SupraWsStatusPayload payload, Guid senderUserId)> updates,
        CancellationToken ct)
    {
        foreach (var (payload, senderUserId) in updates)
            await _realtime.SendToUserAsync(senderUserId, payload, ct);
        if (success && Guid.TryParse(chatIdStr, out var chatId))
        {
            await _realtime.SendToUserAsync(readerUserId, new SupraWsChatReadPayload
            {
                chatId = chatId.ToString(),
            }, ct);
        }
    }

    private async Task<PushDeliveryTrace?> BroadcastToAllChatParticipantsAsync(
        Guid chatId, object payload, CancellationToken ct)
    {
        var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);
        await _realtime.BroadcastToChatParticipantsAsync(participants, payload, ct);
        if (payload is SupraWsNewMessagePayload message)
            return await PushToOfflineParticipantsAsync(chatId, message, participants, ct);
        return null;
    }

    /// <summary>
    /// Шлёт Web Push участникам, у которых нет активного SignalR-подключения
    /// (приложение свёрнуто/закрыто). Отправитель и пользователи, заглушившие чат
    /// или уведомления целиком, пропускаются. Заголовок — от кого (имя группы или
    /// отправителя); текст сообщения не передаётся из-за E2E.
    /// </summary>
    private Task<PushDeliveryTrace> PushToOfflineParticipantsAsync(
        Guid chatId, SupraWsNewMessagePayload message, IEnumerable<Guid> participants, CancellationToken ct)
        => _offlinePush.PushNewMessageAsync(chatId, message, participants, _current.GetUserId() ?? Guid.Empty, ct);

    private async Task<object> HandleCreateDirect(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, notify) = await _messenger.CreateDirectChatAsync(
            user, GetString(data, "contactId") ?? "", ct);
        if (notify != null && Guid.TryParse(GetString(data, "contactId"), out var targetId))
            await _realtime.SendToUserAsync(targetId, notify, ct);
        return response;
    }

    private async Task<object> HandleCreateGroup(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var idsJson = GetString(data, "participantContactIds") ?? "[]";
        var ids = JsonSerializer.Deserialize<List<string>>(idsJson) ?? [];
        var (response, notifies) = await _messenger.CreateGroupAsync(
            user, GetString(data, "name") ?? "", ids, ct);
        foreach (var idStr in ids)
        {
            if (Guid.TryParse(idStr, out var pid))
                await _realtime.SendToUserAsync(pid, notifies.FirstOrDefault() ?? new SupraWsNewChatPayload(), ct);
        }
        return response;
    }

    private async Task<object> HandleActivity(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var activityType = GetString(data, "activityType") ?? "";
        var active = data.TryGetProperty("active", out var a) && a.GetBoolean();
        var activityMessage = GetString(data, "activityMessage");
        var (response, payload) = _messenger.SendUserActivity(chatId, activityType, active, user, activityMessage);
        if (response.success && payload != null && Guid.TryParse(chatId, out var cg))
        {
            var chat = await _store.GetChatByIdAsync(cg, ct);
            if (chat != null && SupraMessengerService.IsChannelChat(chat))
            {
                await TouchPresenceAsync(user.Id, ct);
                return response;
            }

            var targets = await _messenger.GetParticipantUserIdsAsync(cg, user.Id, ct);
            await _realtime.BroadcastToChatParticipantsAsync(targets, payload, ct);
        }
        if (response.success)
            await TouchPresenceAsync(user.Id, ct);
        return response;
    }

    async Task TouchPresenceAsync(Guid userId, CancellationToken ct)
    {
        if (!_presence.IsConnected(userId)) return;
        var prev = _presence.GetStatus(userId);
        _presence.ReportActivity(userId);
        var next = _presence.GetStatus(userId);
        if (prev == next) return;
        var payload = new SupraWsPresencePayload
        {
            userId = userId.ToString(),
            status = next,
        };
        var contacts = await _messenger.GetDirectContactUserIdsAsync(userId, ct);
        foreach (var contactId in contacts)
        {
            if (!await _messenger.CanSeeOnlineStatusAsync(contactId, userId, ct))
                continue;
            await _realtime.SendToUserAsync(contactId, payload, ct);
        }
    }

    private static Dictionary<string, object> Wrap(string method, object? result)
    {
        var key = $"{method}Result";
        var json = JsonSerializer.Serialize(result);
        return new Dictionary<string, object> { [key] = json };
    }

    private static string? GetString(JsonElement data, string name)
    {
        if (data.ValueKind != JsonValueKind.Object) return null;
        return data.TryGetProperty(name, out var p) ? p.GetString() : null;
    }

    private async Task<object> HandleClearChatHistory(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var result = await _messenger.ClearChatHistoryAsync(
            user, chatId, GetBool(data, "alsoDeleteForOther"), ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
        {
            var payload = new SupraWsChatHistoryClearedPayload { chatId = chatId };
            var participants = await _messenger.GetAllParticipantUserIdsAsync(cg, ct);
            foreach (var uid in participants)
                await _realtime.SendToUserAsync(uid, payload, ct);
        }
        return result;
    }

    private async Task<object> HandleLeaveChat(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var (response, chatDeleted, remaining) = await _messenger.LeaveChatAsync(user, chatId, ct);
        if (response.success && Guid.TryParse(chatId, out var cg))
        {
            await NotifyChatRemovedAsync(user.Id, chatId, ct);
            if (!chatDeleted)
                await BroadcastGroupUpdatedAsync(cg, ct);
        }
        return response;
    }

    private async Task<object> HandleUpdateGroup(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        bool? allowJoinByLink = null;
        bool? requiresCustomGroupPassword = null;
        if (data.ValueKind == JsonValueKind.Object)
        {
            if (data.TryGetProperty("allowJoinByLink", out var ajProp) &&
                (ajProp.ValueKind == JsonValueKind.True || ajProp.ValueKind == JsonValueKind.False))
                allowJoinByLink = ajProp.GetBoolean();
            if (data.TryGetProperty("requiresCustomGroupPassword", out var rpProp) &&
                (rpProp.ValueKind == JsonValueKind.True || rpProp.ValueKind == JsonValueKind.False))
                requiresCustomGroupPassword = rpProp.GetBoolean();
        }
        var name = GetString(data, "name");
        string? description = null;
        if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("description", out _))
            description = GetString(data, "description");
        var (result, systemEvent) = await _messenger.UpdateGroupAsync(
            user, chatId, name, allowJoinByLink, requiresCustomGroupPassword, description, ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
        {
            await BroadcastGroupUpdatedAsync(cg, ct);
            if (systemEvent != null)
                await BroadcastChatMessageAsync(cg, systemEvent, ct);
        }
        return result;
    }

    private async Task<object> HandleSetGroupEncryption(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var enabled = false;
        if (data.ValueKind == JsonValueKind.Object &&
            data.TryGetProperty("enabled", out var enProp) &&
            (enProp.ValueKind == JsonValueKind.True || enProp.ValueKind == JsonValueKind.False))
            enabled = enProp.GetBoolean();

        var effective = await _appearance.GetEffectiveAsync(ct);
        var globalAllowed = effective.EnableGroupEncryption ?? true;

        var result = await _messenger.SetGroupEncryptionAsync(user, chatId, enabled, globalAllowed, ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
            await BroadcastGroupUpdatedAsync(cg, ct);
        return result;
    }

    private async Task<object> HandleCreateGroupBranch(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var parentChatId = GetString(data, "parentChatId") ?? GetString(data, "chatId") ?? "";
        var (response, notifies) = await _messenger.CreateGroupBranchAsync(
            user,
            parentChatId,
            GetString(data, "name") ?? "",
            GetString(data, "slug"),
            ct);
        if (response.success)
        {
            foreach (var (uid, notify) in notifies)
                await _realtime.SendToUserAsync(uid, notify, ct);
            if (Guid.TryParse(parentChatId, out var pg))
                await BroadcastGroupUpdatedAsync(pg, ct);
        }
        return response;
    }

    private async Task<object> HandleDeleteGroupBranch(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var branchChatId = GetString(data, "branchChatId") ?? GetString(data, "chatId") ?? "";
        var (response, participantIds) = await _messenger.DeleteGroupBranchAsync(user, branchChatId, ct);
        if (response.success)
        {
            foreach (var uid in participantIds)
                await NotifyChatRemovedAsync(uid, branchChatId, ct);
        }
        return response;
    }

    private async Task<object> HandleUpdateGroupBranch(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var branchChatId = GetString(data, "branchChatId") ?? GetString(data, "chatId") ?? "";
        string? description = null;
        if (data.ValueKind == JsonValueKind.Object && data.TryGetProperty("description", out _))
            description = GetString(data, "description");
        var (result, systemEvent) = await _messenger.UpdateGroupBranchAsync(
            user, branchChatId, GetString(data, "name"), description, ct);
        if (result.success && Guid.TryParse(branchChatId, out var cg))
        {
            await BroadcastGroupUpdatedAsync(cg, ct);
            if (systemEvent != null)
                await BroadcastChatMessageAsync(cg, systemEvent, ct);
        }
        return result;
    }

    private async Task<object> HandleJoinGroupByLink(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var (response, notifies) = await _messenger.JoinGroupByLinkAsync(user, chatId, ct);
        if (response.success)
        {
            foreach (var notify in notifies)
                await _realtime.SendToUserAsync(user.Id, notify, ct);
        }
        return response;
    }

    private async Task<object> HandleAddGroupMembers(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var (result, rootGroupId, notifies) = await _messenger.AddGroupMembersAsync(user, chatId, GetStringList(data, "memberIds"), ct);
        if (result.success)
        {
            if (rootGroupId != Guid.Empty)
                await BroadcastGroupUpdatedAsync(rootGroupId, ct);
            foreach (var (userId, payload) in notifies)
                await _realtime.SendToUserAsync(userId, payload, ct);
        }
        return result;
    }

    private async Task<object> HandleRemoveGroupMember(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var memberUserId = GetString(data, "memberUserId") ?? "";
        var result = await _messenger.RemoveGroupMemberAsync(
            user, chatId, memberUserId, ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
        {
            await BroadcastGroupUpdatedAsync(cg, ct);
            if (Guid.TryParse(memberUserId, out var removedId))
                await NotifyChatRemovedAsync(removedId, chatId, ct);
        }
        return result;
    }

    private async Task<object> HandleSetGroupMemberAdmin(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var (result, systemEvent) = await _messenger.SetGroupMemberAdminAsync(
            user, chatId, GetString(data, "memberUserId") ?? "", GetBool(data, "isAdmin"), ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
        {
            await BroadcastGroupUpdatedAsync(cg, ct);
            if (systemEvent != null)
                await BroadcastChatMessageAsync(cg, systemEvent, ct);
        }
        return result;
    }

    async Task BroadcastChatMessageAsync(Guid chatId, SupraWsNewMessagePayload payload, CancellationToken ct)
    {
        var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);
        foreach (var uid in participants)
            await _realtime.SendToUserAsync(uid, payload, ct);
    }

    async Task BroadcastGroupUpdatedAsync(Guid chatId, CancellationToken ct)
    {
        var payload = await _messenger.GetGroupUpdatedPayloadAsync(chatId, ct);
        if (payload == null) return;
        var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);
        foreach (var uid in participants)
            await _realtime.SendToUserAsync(uid, payload, ct);
    }

    async Task NotifyChatRemovedAsync(Guid userId, string chatId, CancellationToken ct)
    {
        await _realtime.SendToUserAsync(userId, new SupraWsChatRemovedPayload { chatId = chatId }, ct);
    }

    private async Task<object> HandleBlockUser(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, removedChatId) = await _messenger.BlockUserAsync(
            user, GetString(data, "contactUserId") ?? "", ct);
        if (response.success && !string.IsNullOrEmpty(removedChatId))
            await NotifyChatRemovedAsync(user.Id, removedChatId, ct);
        return response;
    }

    private async Task<object> HandleBlockGroup(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, removedChatId) = await _messenger.BlockGroupAsync(
            user, GetString(data, "chatId") ?? "", ct);
        if (response.success && !string.IsNullOrEmpty(removedChatId))
            await NotifyChatRemovedAsync(user.Id, removedChatId, ct);
        return response;
    }

    private async Task<object> HandleCreateChannel(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, notify) = await _messenger.CreateChannelAsync(
            user,
            GetString(data, "name") ?? "",
            GetString(data, "slug") ?? "",
            ct);
        if (notify != null && response.success)
            await _realtime.SendToUserAsync(user.Id, notify, ct);
        return response;
    }

    private async Task<object> HandleUpdateChannel(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var (result, updated) = await _messenger.UpdateChannelAsync(
            user,
            chatId,
            GetString(data, "name"),
            GetString(data, "slug"),
            data.TryGetProperty("description", out _) ? GetString(data, "description") : null,
            ct);
        if (result.success && updated != null && Guid.TryParse(chatId, out var cg))
            await BroadcastChannelUpdatedAsync(cg, ct);
        return result;
    }

    private async Task<object> HandleSubscribeChannel(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var (response, notify) = await _messenger.SubscribeChannelAsync(user, chatId, ct);
        if (response.success)
        {
            await _notifPrefs.SetChatMutedAsync(user.Id, chatId, muted: true, ct);
            if (notify != null)
                await _realtime.SendToUserAsync(user.Id, notify, ct);
        }
        return response;
    }

    private async Task<object> HandleUnsubscribeChannel(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var result = await _messenger.UnsubscribeChannelAsync(user, chatId, ct);
        if (result.success)
            await NotifyChatRemovedAsync(user.Id, chatId, ct);
        return result;
    }

    private async Task<object> HandleSetChannelMemberRole(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var result = await _messenger.SetChannelMemberRoleAsync(
            user,
            chatId,
            GetString(data, "memberUserId") ?? "",
            GetString(data, "role") ?? "",
            ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
            await BroadcastChannelUpdatedAsync(cg, ct);
        return result;
    }

    private async Task<object> HandleDeleteChannel(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var participants = Guid.TryParse(chatId, out var cg)
            ? await _messenger.GetAllParticipantUserIdsAsync(cg, ct)
            : [];
        var result = await _messenger.DeleteChannelAsync(user, chatId, ct);
        if (result.success)
        {
            foreach (var uid in participants)
            {
                if (uid != user.Id)
                    await NotifyChatRemovedAsync(uid, chatId, ct);
            }
        }
        return result;
    }

    private async Task<object> HandleRestoreChannel(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var result = await _messenger.RestoreChannelAsync(user, chatId, ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
            await BroadcastChannelUpdatedAsync(cg, ct);
        return result;
    }

    private async Task<object> HandleAddChannelMember(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var result = await _messenger.AddChannelMemberAsync(
            user,
            chatId,
            GetString(data, "memberUserId") ?? "",
            GetString(data, "role") ?? "",
            ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
            await BroadcastChannelUpdatedAsync(cg, ct);
        return result;
    }

    private async Task<object> HandleRemoveChannelMember(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var result = await _messenger.RemoveChannelMemberAsync(
            user,
            chatId,
            GetString(data, "memberUserId") ?? "",
            ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
            await BroadcastChannelUpdatedAsync(cg, ct);
        return result;
    }

    async Task BroadcastChannelUpdatedAsync(Guid chatId, CancellationToken ct)
    {
        var payload = await _messenger.GetChannelUpdatedPayloadAsync(chatId, ct);
        if (payload == null) return;
        var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);
        foreach (var uid in participants)
            await _realtime.SendToUserAsync(uid, payload, ct);
    }

    private async Task<object> HandleCreateBot(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, notify) = await _messenger.CreateBotAsync(
            user,
            GetString(data, "name") ?? "",
            GetString(data, "slug") ?? "",
            ct);
        if (notify != null && response.success)
            await _realtime.SendToUserAsync(user.Id, notify, ct);
        return response;
    }

    private async Task<object> HandleUpdateBot(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var botUserId = GetString(data, "botUserId") ?? "";
        var (result, updated) = await _messenger.UpdateBotAsync(
            user,
            botUserId,
            GetString(data, "name"),
            GetString(data, "slug"),
            data.TryGetProperty("description", out _) ? GetString(data, "description") : null,
            ct);
        if (result.success && updated != null && Guid.TryParse(botUserId, out var bg))
            await BroadcastBotUpdatedAsync(bg, ct);
        return result;
    }

    private async Task<object> HandleStartBot(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, notify, startMessage) = await _messenger.StartBotAsync(
            user,
            GetString(data, "slug") ?? "",
            ct);
        if (notify != null && response.success)
            await _realtime.SendToUserAsync(user.Id, notify, ct);
        if (startMessage != null && response.success &&
            Guid.TryParse(startMessage.chatId, out var chatId))
        {
            await BroadcastToAllChatParticipantsAsync(chatId, startMessage, ct);
            if (Guid.TryParse(startMessage.messageId, out var msgGuid))
                await NotifyBotInboxAsync(msgGuid, chatId, ct);
        }
        return response;
    }

    private async Task<object> HandleDeleteBot(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        return await _messenger.DeleteBotAsync(user, GetString(data, "botUserId") ?? "", ct);
    }

    private async Task<object> HandleRestoreBot(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var botUserId = GetString(data, "botUserId") ?? "";
        var result = await _messenger.RestoreBotAsync(user, botUserId, ct);
        if (result.success && Guid.TryParse(botUserId, out var bg))
            await BroadcastBotUpdatedAsync(bg, ct);
        return result;
    }

    async Task BroadcastBotUpdatedAsync(Guid botUserId, CancellationToken ct)
    {
        var payload = await _messenger.GetBotUpdatedPayloadAsync(botUserId, ct);
        if (payload == null) return;
        var bot = await _store.GetBotByUserIdAsync(botUserId, ct);
        if (bot == null) return;
        await _realtime.SendToUserAsync(bot.OwnerUserId, payload, ct);
        var allChats = await _store.GetChatsAsync(ct);
        var allParts = await _store.GetAllParticipantsAsync(ct);
        foreach (var chat in allChats.Where(c =>
                     string.Equals(c.Type, "direct", StringComparison.OrdinalIgnoreCase)))
        {
            var parts = allParts.Where(p => p.ChatId == chat.Id).ToList();
            if (!parts.Any(p => p.UserId == botUserId)) continue;
            foreach (var p in parts.Where(p => p.UserId != botUserId))
                await _realtime.SendToUserAsync(p.UserId, payload, ct);
        }
    }

    private static int GetInt(JsonElement data, string name, int defaultValue)
    {
        if (data.ValueKind != JsonValueKind.Object) return defaultValue;
        return data.TryGetProperty(name, out var p) && p.TryGetInt32(out var v) ? v : defaultValue;
    }

    private static int? GetOptionalInt(JsonElement data, string name)
    {
        if (data.ValueKind != JsonValueKind.Object) return null;
        return data.TryGetProperty(name, out var p) && p.TryGetInt32(out var v) ? v : null;
    }

    private static bool GetBool(JsonElement data, string name)
    {
        if (data.ValueKind != JsonValueKind.Object) return false;
        return data.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.True;
    }

    private static List<string> GetStringList(JsonElement data, string name)
    {
        if (data.ValueKind != JsonValueKind.Object) return [];
        if (!data.TryGetProperty(name, out var p)) return [];
        if (p.ValueKind == JsonValueKind.Array)
            return p.EnumerateArray().Select(e => e.GetString() ?? "").Where(s => s.Length > 0).ToList();
        var json = p.GetString();
        if (string.IsNullOrEmpty(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static List<Guid> GetGuidList(JsonElement data, string name)
    {
        if (data.ValueKind != JsonValueKind.Object) return [];
        if (!data.TryGetProperty(name, out var p) || p.ValueKind != JsonValueKind.Array) return [];
        var result = new List<Guid>();
        foreach (var el in p.EnumerateArray())
        {
            if (el.ValueKind == JsonValueKind.String && Guid.TryParse(el.GetString(), out var guid))
                result.Add(guid);
        }
        return result;
    }

    private static List<string> GetGuidStringList(JsonElement data, string name)
    {
        if (data.ValueKind != JsonValueKind.Object) return [];
        if (!data.TryGetProperty(name, out var p) || p.ValueKind != JsonValueKind.Array) return [];
        var result = new List<string>();
        foreach (var el in p.EnumerateArray())
        {
            if (el.ValueKind == JsonValueKind.String)
            {
                var s = el.GetString();
                if (!string.IsNullOrWhiteSpace(s) && Guid.TryParse(s, out _))
                    result.Add(s!);
            }
        }
        return result;
    }

    private static List<BotMessageButtonDto>? ParseButtons(JsonElement data)
    {
        if (data.ValueKind != JsonValueKind.Object) return null;
        if (!data.TryGetProperty("buttons", out var p) || p.ValueKind != JsonValueKind.Array)
            return null;

        try
        {
            return JsonSerializer.Deserialize<List<BotMessageButtonDto>>(p.GetRawText(), JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };
}
