using System.Security.Cryptography;
using System.Text;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed class BotApiService
{
    public static readonly TimeSpan InboxRetention = TimeSpan.FromDays(1);
    const int MaxMessageBatch = 100;

    private readonly IDataStore _store;
    private readonly SupraMessengerService _messenger;

    public BotApiService(IDataStore store, SupraMessengerService messenger)
    {
        _store = store;
        _messenger = messenger;
    }

    public async Task<(UserRecord botUser, BotRecord bot)?> AuthenticateAsync(
        string login, string token, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(token))
            return null;

        var loginNorm = login.Trim();
        var bot = await _store.GetBotBySlugAsync(loginNorm, ct);
        if (bot == null)
        {
            var userByLogin = await _store.GetUserByLoginAsync(loginNorm, ct);
            if (userByLogin != null && SupraMessengerService.IsBotUser(userByLogin))
                bot = await _store.GetBotByUserIdAsync(userByLogin.Id, ct);
        }

        if (bot == null || bot.DeletedOn != null || string.IsNullOrEmpty(bot.TokenHash))
            return null;

        var tokenHash = SupraMessengerService.HashBotToken(token);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(tokenHash),
                Encoding.UTF8.GetBytes(bot.TokenHash)))
            return null;

        var botUser = await _store.GetUserByIdAsync(bot.BotUserId, ct);
        if (botUser == null || !SupraMessengerService.IsBotUser(botUser) || !botUser.IsActive)
            return null;

        return (botUser, bot);
    }

    public async Task<BotApiMeResponse> GetMeAsync(UserRecord botUser, BotRecord bot, CancellationToken ct = default)
    {
        return new BotApiMeResponse
        {
            success = true,
            botUserId = botUser.Id.ToString(),
            login = bot.Slug,
            name = botUser.DisplayName,
            description = bot.Description,
        };
    }

    public async Task<(BotApiSendMessageResponse response, SupraWsNewMessagePayload? broadcast)> SendMessageAsync(
        UserRecord botUser,
        string text,
        string? userLogin,
        string? chatId,
        CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(text))
                return (new BotApiSendMessageResponse { success = false, error = "Текст сообщения пуст" }, null);

            if (SupraMessengerService.IsEncryptedPayload(text))
                return (new BotApiSendMessageResponse { success = false, error = "Боты отправляют только незашифрованные сообщения" }, null);

            var hasUser = !string.IsNullOrWhiteSpace(userLogin);
            var hasChat = !string.IsNullOrWhiteSpace(chatId);
            if (hasUser == hasChat)
                return (new BotApiSendMessageResponse { success = false, error = "Укажите userLogin или chatId" }, null);

            string resolvedChatId;
            if (hasUser)
            {
                var target = await _store.GetUserByLoginAsync(userLogin!.Trim(), ct);
                if (target == null || !target.IsActive || SupraMessengerService.IsBotUser(target))
                    return (new BotApiSendMessageResponse { success = false, error = "Пользователь не найден" }, null);

                var directChatId = await FindDirectChatAsync(botUser.Id, target.Id, ct);
                if (!directChatId.HasValue)
                {
                    return (new BotApiSendMessageResponse
                    {
                        success = false,
                        error = "Чат с пользователем не найден. Пользователь должен сначала начать диалог с ботом",
                    }, null);
                }

                resolvedChatId = directChatId.Value.ToString();
            }
            else
            {
                if (!Guid.TryParse(chatId, out var chatGuid))
                    return (new BotApiSendMessageResponse { success = false, error = "Некорректный chatId" }, null);

                if (!await _store.IsParticipantAsync(chatGuid, botUser.Id, ct))
                    return (new BotApiSendMessageResponse { success = false, error = "Бот не является участником чата" }, null);

                var chat = await _store.GetChatByIdAsync(chatGuid, ct);
                if (chat == null)
                    return (new BotApiSendMessageResponse { success = false, error = "Чат не найден" }, null);

                if (SupraMessengerService.IsChannelChat(chat) &&
                    !await _messenger.CanUserPostToChannelAsync(botUser.Id, chatGuid, ct))
                {
                    return (new BotApiSendMessageResponse
                    {
                        success = false,
                        error = "Нет права публиковать в этом канале (нужна роль admin или author)",
                    }, null);
                }

                resolvedChatId = chatGuid.ToString();
            }

            var (sendResp, broadcast) = await _messenger.SendMessageAsync(
                botUser,
                resolvedChatId,
                text.Trim(),
                encryptionTier: "basic",
                ct: ct);

            return (new BotApiSendMessageResponse
            {
                success = sendResp.success,
                messageId = sendResp.messageId,
                chatId = resolvedChatId,
                error = sendResp.error,
            }, broadcast);
        }
        catch (Exception ex)
        {
            return (new BotApiSendMessageResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<BotApiGetMessagesResponse> GetMessagesAsync(
        Guid botUserId,
        int count,
        int offset,
        string? afterMessageId,
        CancellationToken ct = default)
    {
        try
        {
            var take = Math.Clamp(count <= 0 ? 50 : count, 1, MaxMessageBatch);
            var skip = Math.Max(0, offset);
            var cutoff = DateTime.UtcNow - InboxRetention;

            var ordered = (await _store.GetBotInboxMessagesAsync(botUserId, ct))
                .Where(m => m.CreatedOn >= cutoff)
                .OrderBy(m => m.CreatedOn)
                .ThenBy(m => m.Id)
                .ToList();

            List<BotInboxMessageRecord> slice;
            if (!string.IsNullOrWhiteSpace(afterMessageId) && Guid.TryParse(afterMessageId, out var afterGuid))
            {
                var idx = ordered.FindIndex(m => m.Id == afterGuid);
                slice = idx < 0
                    ? []
                    : ordered.Skip(idx + 1).Take(take).ToList();
            }
            else
            {
                slice = ordered.Skip(skip).Take(take).ToList();
            }

            return new BotApiGetMessagesResponse
            {
                success = true,
                messages = slice.Select(MapInboxDto).ToList(),
            };
        }
        catch (Exception ex)
        {
            return new BotApiGetMessagesResponse { success = false, error = ex.Message };
        }
    }

    public async Task<IReadOnlyList<BotInboxMessageRecord>> RecordIncomingMessageAsync(
        SupraChatMessageRecord message,
        SupraChatRecord chat,
        CancellationToken ct = default)
    {
        if (message.DeletedForEveryone || SupraMessengerService.IsEncryptedPayload(message.Text))
            return [];

        var sender = await _store.GetUserByIdAsync(message.SenderUserId, ct);
        if (SupraMessengerService.IsBotUser(sender))
            return [];

        var participants = await _store.GetParticipantsByChatAsync(chat.Id, ct);
        var created = new List<BotInboxMessageRecord>();
        foreach (var p in participants)
        {
            if (p.UserId == message.SenderUserId) continue;
            var u = await _store.GetUserByIdAsync(p.UserId, ct);
            if (!SupraMessengerService.IsBotUser(u)) continue;

            var inbox = new BotInboxMessageRecord
            {
                Id = Guid.NewGuid(),
                BotUserId = p.UserId,
                ChatId = chat.Id,
                ChatType = chat.Type,
                ChatName = chat.Name,
                MessageId = message.Id,
                SenderUserId = message.SenderUserId,
                SenderLogin = sender?.Login ?? "",
                SenderName = message.SenderName,
                Text = message.Text,
                CreatedOn = message.CreatedOn,
            };
            await _store.SaveBotInboxMessageAsync(inbox, ct);
            created.Add(inbox);
        }

        return created;
    }

    async Task<Guid?> FindDirectChatAsync(Guid userA, Guid userB, CancellationToken ct)
    {
        var parts = await _store.GetParticipantsByUserAsync(userA, ct);
        foreach (var p in parts)
        {
            var chat = await _store.GetChatByIdAsync(p.ChatId, ct);
            if (chat == null || !string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
                continue;
            if (await _store.IsParticipantAsync(p.ChatId, userB, ct))
                return p.ChatId;
        }
        return null;
    }

    public static BotApiMessageDto MapInboxDto(BotInboxMessageRecord m) =>
        new()
        {
            id = m.Id.ToString(),
            messageId = m.MessageId.ToString(),
            chatId = m.ChatId.ToString(),
            chatType = m.ChatType,
            chatName = m.ChatName,
            senderId = m.SenderUserId.ToString(),
            senderLogin = m.SenderLogin,
            senderName = m.SenderName,
            text = m.Text,
            timestamp = m.CreatedOn,
        };
}
