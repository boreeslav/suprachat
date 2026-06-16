using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class BotApiService
{
    public async Task<BotApiGetGroupMenuResponse> GetGroupMenuAsync(
        BotRecord bot, string? chatId, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return new BotApiGetGroupMenuResponse
        {
            success = true,
            groupMenu = await ResolveGroupMenuAsync(bot, chatId, ct),
            chatId = string.IsNullOrWhiteSpace(chatId) ? null : chatId.Trim(),
        };
    }

    public async Task<(BotApiSetGroupMenuResponse response, SupraWsBotGroupUpdatedPayload? updated)> SetGroupMenuAsync(
        UserRecord botUser,
        BotRecord bot,
        BotApiMenuDto? menu,
        string? chatId,
        CancellationToken ct = default)
    {
        try
        {
            var (normalized, error) = BotMenuHelper.ValidateMenu(menu);
            if (error != null)
                return (new BotApiSetGroupMenuResponse { success = false, error = error }, null);

            var menuJson = BotMenuHelper.SerializeMenu(normalized!);
            string? scopeChatId = null;

            if (!string.IsNullOrWhiteSpace(chatId))
            {
                if (!Guid.TryParse(chatId.Trim(), out var chatGuid))
                    return (new BotApiSetGroupMenuResponse { success = false, error = "Некорректный chatId" }, null);

                var chat = await _store.GetChatByIdAsync(chatGuid, ct);
                if (chat == null || !SupraMessengerService.IsGroupChat(chat))
                    return (new BotApiSetGroupMenuResponse { success = false, error = "Чат не является группой или веткой" }, null);

                var participant = (await _store.GetParticipantsByChatAsync(chatGuid, ct))
                    .FirstOrDefault(p => p.UserId == botUser.Id);
                if (participant == null)
                    return (new BotApiSetGroupMenuResponse { success = false, error = "Бот не участник чата" }, null);
                if (!participant.IsAdmin)
                    return (new BotApiSetGroupMenuResponse { success = false, error = "Бот не является администратором группы" }, null);

                await _store.SaveBotGroupChatMenuAsync(new BotGroupChatMenuRecord
                {
                    BotUserId = botUser.Id,
                    ChatId = chatGuid,
                    MenuJson = menuJson,
                    UpdatedOn = DateTime.UtcNow,
                }, ct);
                scopeChatId = chatGuid.ToString();
            }
            else
            {
                bot.GroupMenuJson = menuJson;
                await _store.SaveBotAsync(bot, ct);
            }

            return (new BotApiSetGroupMenuResponse
            {
                success = true,
                groupMenu = normalized,
                chatId = scopeChatId,
            }, BuildGroupMenuUpdatedPayload(botUser.Id, normalized!, scopeChatId));
        }
        catch (Exception ex)
        {
            return (new BotApiSetGroupMenuResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<BotApiMenuDto> ResolveGroupMenuAsync(
        BotRecord bot, string? chatId, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(chatId) &&
            Guid.TryParse(chatId.Trim(), out var chatGuid))
        {
            var chatMenu = await _store.GetBotGroupChatMenuAsync(bot.BotUserId, chatGuid, ct);
            if (chatMenu != null)
                return BotMenuHelper.ParseMenu(chatMenu.MenuJson);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            if (chat != null && SupraMessengerService.IsGroupBranchChat(chat) && chat.ParentChatId is Guid parentId)
            {
                var parentMenu = await _store.GetBotGroupChatMenuAsync(bot.BotUserId, parentId, ct);
                if (parentMenu != null)
                    return BotMenuHelper.ParseMenu(parentMenu.MenuJson);
            }
        }
        return BotMenuHelper.ParseMenu(bot.GroupMenuJson);
    }

    public static SupraWsBotGroupUpdatedPayload BuildGroupMenuUpdatedPayload(
        Guid botUserId, BotApiMenuDto menu, string? chatId) => new()
    {
        botUserId = botUserId.ToString(),
        groupMenu = menu,
        chatId = chatId,
    };

    public async Task<SupraWsBotGroupUpdatedPayload> PurgeBotGroupMenusForFamilyAsync(
        Guid botUserId, Guid anyChatIdInFamily, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var chat = await _store.GetChatByIdAsync(anyChatIdInFamily, ct);
        var rootId = chat?.ParentChatId ?? anyChatIdInFamily;
        await _store.DeleteBotGroupChatMenuAsync(botUserId, anyChatIdInFamily, ct);
        if (rootId != anyChatIdInFamily)
            await _store.DeleteBotGroupChatMenuAsync(botUserId, rootId, ct);
        return new SupraWsBotGroupUpdatedPayload
        {
            botUserId = botUserId.ToString(),
            chatId = anyChatIdInFamily.ToString(),
            groupMenu = new BotApiMenuDto { items = [] },
        };
    }
}
