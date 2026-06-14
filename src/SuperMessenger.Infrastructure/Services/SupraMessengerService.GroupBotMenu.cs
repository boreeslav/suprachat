using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class SupraMessengerService
{
    async Task<SupraGroupBotMenuDto?> ResolveGroupBotMenuForChatAsync(
        SupraChatRecord chat, CancellationToken ct)
    {
        if (!IsGroupChat(chat)) return null;

        var participants = await _store.GetParticipantsByChatAsync(chat.Id, ct);
        var adminParticipants = participants.Where(p => p.IsAdmin).ToList();
        if (adminParticipants.Count == 0) return null;

        var users = await _store.GetUsersAsync(ct);
        foreach (var participant in adminParticipants.OrderBy(p => p.UserId))
        {
            var user = users.FirstOrDefault(u => u.Id == participant.UserId);
            if (user == null || !IsBotUser(user)) continue;

            var bot = await _store.GetBotByUserIdAsync(participant.UserId, ct);
            if (bot == null || IsBotDeleted(bot)) continue;

            var menu = await ResolveGroupMenuForChatAsync(bot, chat, ct);
            if ((menu.items ?? []).Count == 0) continue;

            return new SupraGroupBotMenuDto
            {
                botUserId = participant.UserId.ToString(),
                name = user.DisplayName,
                avatar = AvatarUrl(user),
                menu = menu,
            };
        }

        return null;
    }

    async Task<BotApiMenuDto> ResolveGroupMenuForChatAsync(
        BotRecord bot, SupraChatRecord chat, CancellationToken ct)
    {
        var chatMenu = await _store.GetBotGroupChatMenuAsync(bot.BotUserId, chat.Id, ct);
        if (chatMenu != null)
            return BotMenuHelper.ParseMenu(chatMenu.MenuJson);

        if (IsGroupBranchChat(chat) && chat.ParentChatId is Guid parentId)
        {
            var parentMenu = await _store.GetBotGroupChatMenuAsync(bot.BotUserId, parentId, ct);
            if (parentMenu != null)
                return BotMenuHelper.ParseMenu(parentMenu.MenuJson);
        }

        return BotMenuHelper.ParseMenu(bot.GroupMenuJson);
    }
}
