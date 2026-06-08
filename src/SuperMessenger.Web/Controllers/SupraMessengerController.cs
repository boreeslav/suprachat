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

    public SupraMessengerController(
        SupraMessengerService messenger,
        CurrentUserAccessor current,
        RealtimeNotifier realtime,
        UserPresenceService presence,
        PushNotificationService push,
        NotificationPreferencesStore notifPrefs,
        IDataStore store,
        PushDiagnosticLogStore pushLog,
        MessageInfoService messageInfo)
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
            "EditMessage" => await HandleEditMessage(user, data, ct),
            "DeleteMessage" => await HandleDeleteMessage(user, data, ct),
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
            "GetGroupLinkPreview" => await _messenger.GetGroupLinkPreviewAsync(
                user.Id,
                GetString(data, "chatId") ?? "",
                ct),
            "JoinGroupByLink" => await HandleJoinGroupByLink(user, data, ct),
            "AddGroupMembers" => await HandleAddGroupMembers(user, data, ct),
            "RemoveGroupMember" => await HandleRemoveGroupMember(user, data, ct),
            "SetGroupMemberAdmin" => await HandleSetGroupMemberAdmin(user, data, ct),
            "BlockUser" => await HandleBlockUser(user, data, ct),
            "BlockGroup" => await HandleBlockGroup(user, data, ct),
            _ => new { success = false, error = $"Unknown method: {methodName}" },
        };

        return Ok(Wrap(methodName, result));
    }

    private async Task<object> HandleSendMessage(UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, broadcast) = await _messenger.SendMessageAsync(
            user,
            GetString(data, "chatId") ?? "",
            GetString(data, "text") ?? "",
            GetString(data, "replyToMessageId"),
            GetString(data, "forwardedFromSenderName"),
            GetString(data, "replyToTextPreview"),
            GetString(data, "encryptionTier"),
            ct);
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
        }
        if (response.success)
            await TouchPresenceAsync(user.Id, ct);
        return response;
    }

    private async Task<object> HandleEditMessage(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var (response, broadcast) = await _messenger.EditMessageAsync(
            user,
            GetString(data, "chatId") ?? "",
            GetString(data, "messageId") ?? "",
            GetString(data, "text") ?? "",
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
        if (broadcast != null && Guid.TryParse(broadcast.chatId, out var chatId))
        {
            var participants = await _messenger.GetAllParticipantUserIdsAsync(chatId, ct);
            foreach (var uid in participants)
                await _realtime.SendToUserAsync(uid, broadcast, ct);
        }
        return response;
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

    private async Task<object> HandleMarkRead(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatIdStr = GetString(data, "chatId") ?? "";
        var (response, updates) = await _messenger.MarkMessagesReadAsync(user.Id, chatIdStr, ct);
        foreach (var (payload, senderUserId) in updates)
            await _realtime.SendToUserAsync(senderUserId, payload, ct);
        if (response.success && Guid.TryParse(chatIdStr, out var chatId))
        {
            await _realtime.SendToUserAsync(user.Id, new SupraWsChatReadPayload
            {
                chatId = chatId.ToString(),
            }, ct);
        }
        return response;
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
    private async Task<PushDeliveryTrace> PushToOfflineParticipantsAsync(
        Guid chatId, SupraWsNewMessagePayload message, IEnumerable<Guid> participants, CancellationToken ct)
    {
        var trace = new PushDeliveryTrace { chatId = chatId.ToString() };
        var senderId = _current.GetUserId();
        var info = await _messenger.GetChatNotificationInfoAsync(chatId, ct);
        var sender = string.IsNullOrWhiteSpace(message.senderName) ? "Новое сообщение" : message.senderName.Trim();

        string title, body;
        if (info?.isGroup == true)
        {
            title = string.IsNullOrWhiteSpace(info.Value.name) ? sender : info.Value.name.Trim();
            body = sender;
        }
        else
        {
            title = sender;
            body = "Новое сообщение";
        }

        var chatIdStr = chatId.ToString();
        foreach (var uid in participants.Distinct())
        {
            var entry = new PushRecipientTrace
            {
                userId = uid.ToString(),
                presenceStatus = _presence.GetStatus(uid),
                isConnected = _presence.IsConnected(uid),
            };

            var recipient = await _store.GetUserByIdAsync(uid, ct);
            entry.displayName = recipient?.DisplayName;

            if (uid == senderId)
            {
                entry.action = "skipped";
                entry.skipReason = "sender";
                trace.recipients.Add(entry);
                continue;
            }

            if (_presence.IsConnected(uid))
            {
                entry.action = "skipped";
                entry.skipReason = "online";
                trace.recipients.Add(entry);
                continue;
            }

            var prefs = await _notifPrefs.GetAsync(uid, ct);
            entry.globalMuted = prefs.GlobalMuted;
            entry.chatMuted = prefs.MutedChatIds != null &&
                prefs.MutedChatIds.Any(c => string.Equals(c, chatIdStr, StringComparison.OrdinalIgnoreCase));

            if (prefs.GlobalMuted)
            {
                entry.action = "skipped";
                entry.skipReason = "muted-global";
                trace.recipients.Add(entry);
                continue;
            }

            if (entry.chatMuted)
            {
                entry.action = "skipped";
                entry.skipReason = "muted-chat";
                trace.recipients.Add(entry);
                continue;
            }

            var sendResult = await _push.SendNewMessageToUserDetailedAsync(uid, title, body, chatIdStr, ct);
            entry.subscriptionCount = sendResult.SubscriptionCount;
            entry.attempts = sendResult.Attempts;
            entry.anyDelivered = sendResult.SuccessCount > 0;

            if (sendResult.SubscriptionCount == 0)
            {
                entry.action = "no-subscriptions";
                entry.skipReason = "no-subscriptions";
            }
            else if (sendResult.SuccessCount > 0)
            {
                entry.action = "sent";
            }
            else
            {
                entry.action = "failed";
                entry.skipReason = "all-subscriptions-failed";
            }

            trace.recipients.Add(entry);
        }

        return trace;
    }

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
        var response = _messenger.SendUserActivity(chatId, activityType, active, user);
        if (response.success && Guid.TryParse(chatId, out var cg))
        {
            var payload = new SupraWsUserActivityPayload
            {
                chatId = chatId,
                userId = user.Id.ToString(),
                userName = user.DisplayName,
                activityType = activityType,
                active = active,
            };
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
        var (result, systemEvent) = await _messenger.UpdateGroupAsync(
            user, chatId, name, allowJoinByLink, requiresCustomGroupPassword, ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
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
        var (response, notify) = await _messenger.JoinGroupByLinkAsync(user, chatId, ct);
        if (notify != null && response.success)
            await _realtime.SendToUserAsync(user.Id, notify, ct);
        return response;
    }

    private async Task<object> HandleAddGroupMembers(Core.Entities.UserRecord user, JsonElement data, CancellationToken ct)
    {
        var chatId = GetString(data, "chatId") ?? "";
        var result = await _messenger.AddGroupMembersAsync(user, chatId, GetStringList(data, "memberIds"), ct);
        if (result.success && Guid.TryParse(chatId, out var cg))
            await BroadcastGroupUpdatedAsync(cg, ct);
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

    private static int GetInt(JsonElement data, string name, int defaultValue)
    {
        if (data.ValueKind != JsonValueKind.Object) return defaultValue;
        return data.TryGetProperty(name, out var p) && p.TryGetInt32(out var v) ? v : defaultValue;
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
}
