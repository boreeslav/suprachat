using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Infrastructure.Services;

namespace SuperMessenger.Web.Services;

public sealed class BotGroupIntegrationService
{
    private readonly IDataStore _store;
    private readonly BotApiService _botApi;
    private readonly RealtimeNotifier _realtime;
    private readonly BotWebSocketManager _botWs;

    public BotGroupIntegrationService(
        IDataStore store,
        BotApiService botApi,
        RealtimeNotifier realtime,
        BotWebSocketManager botWs)
    {
        _store = store;
        _botApi = botApi;
        _realtime = realtime;
        _botWs = botWs;
    }

    public async Task NotifyBotGroupChatEventAsync(
        Guid botUserId, BotApiGroupChatEventDto evt, CancellationToken ct = default)
    {
        await _botWs.SendToBotAsync(botUserId, new BotApiWsEnvelope
        {
            type = "groupChat",
            groupChat = evt,
            botUserId = botUserId.ToString(),
        }, ct);
    }

    public async Task PurgeBotMenusAndBroadcastAsync(
        Guid botUserId, Guid anyChatIdInFamily, CancellationToken ct = default)
    {
        var payload = await _botApi.PurgeBotGroupMenusForFamilyAsync(botUserId, anyChatIdInFamily, ct);
        await BroadcastBotGroupUpdatedAsync(payload, ct);
    }

    public async Task NotifyAdminBotsInRootGroupAsync(
        Guid rootChatId, BotApiGroupChatEventDto evt, CancellationToken ct = default)
    {
        var chat = await _store.GetChatByIdAsync(rootChatId, ct);
        if (chat == null) return;

        var participants = await _store.GetParticipantsByChatAsync(rootChatId, ct);
        foreach (var part in participants.Where(p => p.IsAdmin))
        {
            var user = await _store.GetUserByIdAsync(part.UserId, ct);
            if (!SupraMessengerService.IsBotUser(user)) continue;

            await NotifyBotGroupChatEventAsync(part.UserId, new BotApiGroupChatEventDto
            {
                eventType = evt.eventType,
                chatId = evt.chatId,
                chatType = evt.chatType ?? chat.Type,
                chatName = evt.chatName ?? chat.Name,
                parentChatId = evt.parentChatId ?? rootChatId.ToString(),
                isAdmin = true,
            }, ct);
        }
    }

    public async Task BroadcastBotGroupUpdatedAsync(
        SupraWsBotGroupUpdatedPayload payload, CancellationToken ct = default)
    {
        if (!Guid.TryParse(payload.botUserId, out var botUserId)) return;

        var bot = await _store.GetBotByUserIdAsync(botUserId, ct);
        if (bot == null) return;

        if (!string.IsNullOrWhiteSpace(payload.viewerUserId) &&
            Guid.TryParse(payload.viewerUserId, out var viewerUserId))
        {
            await _realtime.SendToUserAsync(viewerUserId, payload, ct);
            return;
        }

        await _realtime.SendToUserAsync(bot.OwnerUserId, payload, ct);

        if (!string.IsNullOrWhiteSpace(payload.chatId) &&
            Guid.TryParse(payload.chatId, out var chatGuid))
        {
            var participants = await _store.GetParticipantsByChatAsync(chatGuid, ct);
            foreach (var uid in participants.Select(p => p.UserId).Where(id => id != botUserId))
                await _realtime.SendToUserAsync(uid, payload, ct);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat != null && SupraMessengerService.IsRootGroupChat(chat))
            {
                var branches = await _store.GetGroupBranchesByParentAsync(chatGuid, ct);
                foreach (var branch in branches)
                {
                    var branchParticipants = await _store.GetParticipantsByChatAsync(branch.Id, ct);
                    foreach (var uid in branchParticipants.Select(p => p.UserId).Where(id => id != botUserId))
                        await _realtime.SendToUserAsync(uid, payload, ct);
                }
            }
        }
    }
}
