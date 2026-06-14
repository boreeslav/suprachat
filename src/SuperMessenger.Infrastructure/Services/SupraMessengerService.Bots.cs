using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Security;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class SupraMessengerService
{
    public static readonly TimeSpan BotRestoreWindow = TimeSpan.FromDays(7);
    static readonly Regex BotSlugRegex = new(@"^[a-zA-Z0-9_]{4,32}$", RegexOptions.Compiled);

    public static bool IsBotUser(UserRecord? user) =>
        user != null && user.Type == UserType.Bot;

    static bool IsBotDeleted(BotRecord bot) => bot.DeletedOn != null;

    static bool CanRestoreBot(BotRecord bot) =>
        bot.DeletedOn != null &&
        DateTime.UtcNow - bot.DeletedOn.Value <= BotRestoreWindow;

    static bool SlugRequiresBotSuffix(string slug)
    {
        var s = (slug ?? "").Trim().ToLowerInvariant();
        return s.StartsWith("bot") || s.EndsWith("bot");
    }

    public static (bool ok, string? error) ValidateBotSlug(string slug)
    {
        var norm = (slug ?? "").Trim();
        if (norm.Length < 4)
            return (false, "Ссылка бота должна содержать не менее 4 символов");
        if (norm.Length > 32)
            return (false, "Ссылка бота не должна превышать 32 символа");
        if (!BotSlugRegex.IsMatch(norm))
            return (false, "Ссылка может содержать только латинские буквы, цифры и _");
        if (!SlugRequiresBotSuffix(norm))
            return (false, "Ссылка бота должна начинаться или заканчиваться на bot");
        return (true, null);
    }

    public static string HashBotToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    async Task<BotApiMenuDto> ResolveBotMenuAsync(BotRecord bot, string? chatId, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(chatId) &&
            Guid.TryParse(chatId.Trim(), out var chatGuid))
        {
            var chatMenu = await _store.GetBotChatMenuAsync(bot.BotUserId, chatGuid, ct);
            if (chatMenu != null)
                return BotMenuHelper.ParseMenu(chatMenu.MenuJson);
        }
        return BotMenuHelper.ParseMenu(bot.MenuJson);
    }

    async Task<(BotRecord? bot, UserRecord? botUser, string? error)> GetBotAccessAsync(
        Guid userId, string botUserId, CancellationToken ct)
    {
        if (!Guid.TryParse(botUserId, out var botUserGuid))
            return (null, null, "Некорректный botUserId");
        var bot = await _store.GetBotByUserIdAsync(botUserGuid, ct);
        if (bot == null)
            return (null, null, "Бот не найден");
        if (IsBotDeleted(bot) && bot.OwnerUserId != userId)
            return (null, null, "Бот удалён");
        var botUser = await _store.GetUserByIdAsync(botUserGuid, ct);
        if (botUser == null || !IsBotUser(botUser))
            return (null, null, "Бот не найден");
        if (bot.OwnerUserId != userId)
            return (null, null, "Нет доступа");
        return (bot, botUser, null);
    }

    async Task<(bool ok, string? error)> IsBotSlugAvailableAsync(string slug, Guid? excludeBotId, CancellationToken ct)
    {
        var (valid, err) = ValidateBotSlug(slug);
        if (!valid) return (false, err);
        if (await _store.IsBotSlugTakenAsync(slug, excludeBotId, ct))
            return (false, "Эта ссылка уже занята другим ботом");
        if (await _store.IsChannelSlugTakenAsync(slug, null, ct))
            return (false, "Эта ссылка уже занята каналом");
        if (await _store.IsLoginTakenAsync(slug, null, ct))
            return (false, "Эта ссылка совпадает с логином пользователя");
        return (true, null);
    }

    async Task<int> CountBotUsersAsync(Guid botUserId, CancellationToken ct)
    {
        var allChats = await _store.GetChatsAsync(ct);
        var allParts = await _store.GetAllParticipantsAsync(ct);
        var count = 0;
        foreach (var chat in allChats.Where(c =>
                     string.Equals(c.Type, "direct", StringComparison.OrdinalIgnoreCase)))
        {
            var parts = allParts.Where(p => p.ChatId == chat.Id).ToList();
            if (!parts.Any(p => p.UserId == botUserId)) continue;
            var otherId = parts.FirstOrDefault(p => p.UserId != botUserId)?.UserId;
            if (!otherId.HasValue) continue;
            count++;
        }
        return count;
    }

    async Task<Guid?> FindDirectChatWithBotAsync(Guid userId, Guid botUserId, CancellationToken ct)
    {
        var myParts = await _store.GetParticipantsByUserAsync(userId, ct);
        foreach (var p in myParts)
        {
            var chat = await _store.GetChatByIdAsync(p.ChatId, ct);
            if (chat == null || !string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
                continue;
            if (await _store.IsParticipantAsync(p.ChatId, botUserId, ct))
                return p.ChatId;
        }
        return null;
    }

    async Task<bool> IsBotUserActiveForAsync(Guid botUserId, Guid targetUserId, CancellationToken ct)
    {
        var chatId = await FindDirectChatWithBotAsync(targetUserId, botUserId, ct);
        if (!chatId.HasValue) return false;
        if (await IsDirectPairBlockedAsync(botUserId, targetUserId, ct)) return false;
        if (await IsDirectPairBlockedAsync(targetUserId, botUserId, ct)) return false;
        return true;
    }

    async Task<IReadOnlyList<UserRecord>> FindBotsMatchingSearchAsync(
        Guid viewerId, string query, CancellationToken ct)
    {
        var norm = (query ?? "").Trim();
        if (norm.Length < 4) return [];

        var bots = await _store.GetBotsAsync(ct);
        var activeBotIds = bots
            .Where(b => b.DeletedOn == null)
            .Select(b => b.BotUserId)
            .ToHashSet();
        if (activeBotIds.Count == 0) return [];

        var users = await _store.GetUsersAsync(ct);
        var matched = new List<UserRecord>();
        foreach (var u in users)
        {
            if (!u.IsActive || u.Type != UserType.Bot || !activeBotIds.Contains(u.Id))
                continue;
            if (!u.Login.Contains(norm, StringComparison.OrdinalIgnoreCase) &&
                !u.DisplayName.Contains(norm, StringComparison.OrdinalIgnoreCase))
                continue;
            if (!await IsUserVisibleInContactsAsync(viewerId, u.Id, ct))
                continue;
            matched.Add(u);
        }
        return matched;
    }

    async Task<bool> IsBotChatEngagedAsync(
        Guid userId, Guid botUserId, Guid? chatId, CancellationToken ct)
    {
        if (chatId.HasValue)
        {
            var msgs = await _store.GetMessagesByChatAsync(chatId.Value, ct);
            if (msgs.Any(m => !m.DeletedForEveryone))
                return true;
        }
        return await _store.HasBotEngagementAsync(userId, botUserId, ct);
    }

    async Task MarkBotEngagedAsync(Guid userId, Guid botUserId, CancellationToken ct)
    {
        await _store.SaveBotEngagementAsync(new BotEngagementRecord
        {
            UserId = userId,
            BotUserId = botUserId,
            StartedOn = DateTime.UtcNow,
        }, ct);
    }

    static SupraContactDto MapContactDto(UserRecord u, string? avatar) =>
        new()
        {
            id = u.Id.ToString(),
            name = u.DisplayName,
            avatar = avatar,
            isBot = u.Type == UserType.Bot,
            login = u.Type == UserType.Bot ? u.Login : null,
        };

    static SupraWsNewChatPayload BuildBotDirectChatNotify(
        string chatId, UserRecord botUser, string slug) =>
        new()
        {
            chatId = chatId,
            chatName = botUser.DisplayName,
            chatType = "direct",
            chatAvatar = AvatarUrl(botUser),
            contactUserId = botUser.Id.ToString(),
            isBotContact = true,
            botSlug = slug,
        };

    public async Task<(SupraCreateBotResponse response, SupraWsNewChatPayload? notify)> CreateBotAsync(
        UserRecord user, string name, string slug, CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(name))
                return (new SupraCreateBotResponse { success = false, error = "Название бота не указано" }, null);

            var slugNorm = (slug ?? "").Trim();
            var (slugOk, slugErr) = await IsBotSlugAvailableAsync(slugNorm, null, ct);
            if (!slugOk)
                return (new SupraCreateBotResponse { success = false, error = slugErr }, null);

            var botUserId = Guid.NewGuid();
            var botId = Guid.NewGuid();
            var botUser = new UserRecord
            {
                Id = botUserId,
                Login = slugNorm,
                DisplayName = name.Trim(),
                PasswordHash = PasswordHasher.Hash(Guid.NewGuid().ToString("N")),
                Type = UserType.Bot,
                IsActive = true,
                SearchableByLogin = false,
                AllowWrite = "everyone",
            };
            await _store.SaveUserAsync(botUser, ct);
            await _store.SaveBotAsync(new BotRecord
            {
                Id = botId,
                BotUserId = botUserId,
                OwnerUserId = user.Id,
                Slug = slugNorm,
                CreatedOn = DateTime.UtcNow,
            }, ct);

            var (chatResponse, _) = await CreateDirectChatAsync(user, botUserId.ToString(), ct);
            if (!chatResponse.success)
                return (new SupraCreateBotResponse { success = false, error = chatResponse.error }, null);

            var notify = BuildBotDirectChatNotify(chatResponse.chatId!, botUser, slugNorm);
            return (new SupraCreateBotResponse
            {
                success = true,
                botUserId = botUserId.ToString(),
                chatId = chatResponse.chatId,
                slug = slugNorm,
                name = name.Trim(),
                avatar = AvatarUrl(botUser),
            }, notify);
        }
        catch (Exception ex)
        {
            return (new SupraCreateBotResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<SupraGetMyBotsResponse> GetMyBotsAsync(Guid userId, CancellationToken ct = default)
    {
        try
        {
            var bots = await _store.GetBotsAsync(ct);
            var users = await _store.GetUsersAsync(ct);
            var items = new List<SupraBotListItemDto>();
            foreach (var bot in bots.Where(b => b.OwnerUserId == userId))
            {
                if (IsBotDeleted(bot) && !CanRestoreBot(bot))
                    continue;
                var botUser = users.FirstOrDefault(u => u.Id == bot.BotUserId);
                if (botUser == null) continue;
                items.Add(new SupraBotListItemDto
                {
                    botUserId = bot.BotUserId.ToString(),
                    name = botUser.DisplayName,
                    slug = bot.Slug,
                    avatar = AvatarUrl(botUser),
                    userCount = await CountBotUsersAsync(bot.BotUserId, ct),
                    isDeleted = IsBotDeleted(bot),
                    deletedAt = bot.DeletedOn,
                });
            }
            return new SupraGetMyBotsResponse
            {
                success = true,
                bots = items.OrderBy(b => b.isDeleted).ThenBy(b => b.name).ToList(),
            };
        }
        catch (Exception ex)
        {
            return new SupraGetMyBotsResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraGetBotInfoResponse> GetBotInfoAsync(
        Guid userId, string botUserId, string? chatId = null, CancellationToken ct = default)
    {
        try
        {
            var (bot, botUser, error) = await GetBotAccessAsync(userId, botUserId, ct);
            if (error != null)
                return new SupraGetBotInfoResponse { success = false, error = error };

            return new SupraGetBotInfoResponse
            {
                success = true,
                botUserId = botUser!.Id.ToString(),
                name = botUser.DisplayName,
                slug = bot!.Slug,
                description = bot.Description,
                avatar = AvatarUrl(botUser),
                ownerUserId = bot.OwnerUserId.ToString(),
                canEdit = !IsBotDeleted(bot),
                isOwner = bot.OwnerUserId == userId,
                userCount = await CountBotUsersAsync(bot.BotUserId, ct),
                hasToken = !string.IsNullOrEmpty(bot.TokenHash),
                isDeleted = IsBotDeleted(bot),
                menu = await ResolveBotMenuAsync(bot, chatId, ct),
                assistantMenu = await ResolveAssistantMenuAsync(bot, chatId, ct),
                isAssistant = await _store.HasUserBotAssistantAsync(userId, bot!.BotUserId, ct),
                hasAssistantMenu = (await ResolveAssistantMenuAsync(bot, chatId, ct)).items?.Count > 0,
            };
        }
        catch (Exception ex)
        {
            return new SupraGetBotInfoResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(SupraUpdateBotResponse response, SupraWsBotUpdatedPayload? updated)> UpdateBotAsync(
        UserRecord user,
        string botUserId,
        string? name,
        string? slug,
        string? description,
        CancellationToken ct = default)
    {
        try
        {
            var (bot, botUser, error) = await GetBotAccessAsync(user.Id, botUserId, ct);
            if (error != null)
                return (new SupraUpdateBotResponse { success = false, error = error }, null);
            if (IsBotDeleted(bot!))
                return (new SupraUpdateBotResponse { success = false, error = "Бот удалён" }, null);

            if (!string.IsNullOrWhiteSpace(name))
                botUser!.DisplayName = name.Trim();

            if (description != null)
                bot!.Description = description.Trim();

            if (!string.IsNullOrWhiteSpace(slug))
            {
                var slugNorm = slug.Trim();
                var (slugOk, slugErr) = await IsBotSlugAvailableAsync(slugNorm, bot!.Id, ct);
                if (!slugOk)
                    return (new SupraUpdateBotResponse { success = false, error = slugErr }, null);
                bot.Slug = slugNorm;
                botUser!.Login = slugNorm;
            }

            await _store.SaveUserAsync(botUser!, ct);
            await _store.SaveBotAsync(bot!, ct);

            var payload = new SupraWsBotUpdatedPayload
            {
                botUserId = botUser!.Id.ToString(),
                botName = botUser.DisplayName,
                botAvatar = AvatarUrl(botUser),
                slug = bot.Slug,
                description = bot.Description,
                menu = BotMenuHelper.ParseMenu(bot.MenuJson),
            };
            return (new SupraUpdateBotResponse
            {
                success = true,
                name = botUser.DisplayName,
                slug = bot.Slug,
                description = bot.Description,
                avatar = AvatarUrl(botUser),
            }, payload);
        }
        catch (Exception ex)
        {
            return (new SupraUpdateBotResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<(SupraUpdateBotResponse response, SupraWsBotUpdatedPayload? updated)> SaveBotAvatarPathAsync(
        UserRecord user, string botUserId, string avatarPath, CancellationToken ct = default)
    {
        try
        {
            var (bot, botUser, error) = await GetBotAccessAsync(user.Id, botUserId, ct);
            if (error != null)
                return (new SupraUpdateBotResponse { success = false, error = error }, null);
            if (IsBotDeleted(bot!))
                return (new SupraUpdateBotResponse { success = false, error = "Бот удалён" }, null);

            botUser!.AvatarPath = avatarPath;
            await _store.SaveUserAsync(botUser, ct);
            var payload = new SupraWsBotUpdatedPayload
            {
                botUserId = botUser.Id.ToString(),
                botName = botUser.DisplayName,
                botAvatar = AvatarUrl(botUser),
                slug = bot!.Slug,
                description = bot.Description,
                menu = BotMenuHelper.ParseMenu(bot.MenuJson),
            };
            return (new SupraUpdateBotResponse
            {
                success = true,
                name = botUser.DisplayName,
                slug = bot.Slug,
                description = bot.Description,
                avatar = AvatarUrl(botUser),
            }, payload);
        }
        catch (Exception ex)
        {
            return (new SupraUpdateBotResponse { success = false, error = ex.Message }, null);
        }
    }

    public async Task<SupraGetBotUsersResponse> GetBotUsersAsync(
        Guid userId, string botUserId, int page, int rowCount, string searchQuery, CancellationToken ct = default)
    {
        try
        {
            var (bot, _, error) = await GetBotAccessAsync(userId, botUserId, ct);
            if (error != null)
                return new SupraGetBotUsersResponse { success = false, error = error };

            var query = (searchQuery ?? "").Trim();
            var allChats = await _store.GetChatsAsync(ct);
            var allParts = await _store.GetAllParticipantsAsync(ct);
            var users = await _store.GetUsersAsync(ct);
            var userIds = new HashSet<Guid>();

            foreach (var chat in allChats.Where(c =>
                         string.Equals(c.Type, "direct", StringComparison.OrdinalIgnoreCase)))
            {
                var parts = allParts.Where(p => p.ChatId == chat.Id).ToList();
                if (!parts.Any(p => p.UserId == bot!.BotUserId)) continue;
                var otherId = parts.FirstOrDefault(p => p.UserId != bot!.BotUserId)?.UserId;
                if (otherId.HasValue) userIds.Add(otherId.Value);
            }

            var filtered = users
                .Where(u => userIds.Contains(u.Id) && u.Type != UserType.Bot)
                .Where(u => string.IsNullOrEmpty(query) ||
                            u.DisplayName.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                            u.Login.Contains(query, StringComparison.OrdinalIgnoreCase))
                .OrderBy(u => u.DisplayName)
                .ToList();

            var skip = Math.Max(0, (Math.Max(1, page) - 1) * Math.Max(1, rowCount));
            var take = Math.Max(1, rowCount);
            var pageItems = filtered.Skip(skip).Take(take + 1).ToList();
            var hasMore = pageItems.Count > take;
            if (hasMore) pageItems.RemoveAt(pageItems.Count - 1);

            return new SupraGetBotUsersResponse
            {
                success = true,
                users = pageItems.Select(u => new SupraBotMemberDto
                {
                    id = u.Id.ToString(),
                    name = u.DisplayName,
                    login = u.Login,
                    avatar = AvatarUrl(u),
                }).ToList(),
                hasMore = hasMore,
            };
        }
        catch (Exception ex)
        {
            return new SupraGetBotUsersResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraGetBotLinkPreviewResponse> GetBotLinkPreviewAsync(
        Guid userId, string slug, CancellationToken ct = default)
    {
        try
        {
            var bot = await _store.GetBotBySlugAsync(slug, ct);
            if (bot == null)
                return new SupraGetBotLinkPreviewResponse { success = false, error = "Бот не найден" };

            var botUser = await _store.GetUserByIdAsync(bot.BotUserId, ct);
            if (botUser == null || !IsBotUser(botUser))
                return new SupraGetBotLinkPreviewResponse { success = false, error = "Бот не найден" };

            var chatId = await FindDirectChatWithBotAsync(userId, bot.BotUserId, ct);
            var blocked = chatId.HasValue &&
                          await IsDirectPairBlockedAsync(userId, bot.BotUserId, ct);
            var isStarted = !blocked &&
                            await IsBotChatEngagedAsync(userId, bot.BotUserId, chatId, ct);

            return new SupraGetBotLinkPreviewResponse
            {
                success = true,
                botUserId = bot.BotUserId.ToString(),
                name = botUser.DisplayName,
                slug = bot.Slug,
                description = bot.Description,
                avatar = AvatarUrl(botUser),
                isStarted = isStarted,
                chatId = isStarted && chatId.HasValue ? chatId.Value.ToString() : null,
                userCount = await CountBotUsersAsync(bot.BotUserId, ct),
                menu = BotMenuHelper.ParseMenu(bot.MenuJson),
            };
        }
        catch (Exception ex)
        {
            return new SupraGetBotLinkPreviewResponse { success = false, error = ex.Message };
        }
    }

    const string BotStartCommand = "/start";

    public async Task<(SupraCreateChatResponse response, SupraWsNewChatPayload? notify, SupraWsNewMessagePayload? startMessage)> StartBotAsync(
        UserRecord user, string slug, CancellationToken ct = default)
    {
        try
        {
            var bot = await _store.GetBotBySlugAsync(slug, ct);
            if (bot == null)
                return (new SupraCreateChatResponse { success = false, error = "Бот не найден" }, null, null);

            var botUser = await _store.GetUserByIdAsync(bot.BotUserId, ct);
            if (botUser == null || !IsBotUser(botUser) || !botUser.IsActive)
                return (new SupraCreateChatResponse { success = false, error = "Бот недоступен" }, null, null);

            var (response, _) = await CreateDirectChatAsync(user, bot.BotUserId.ToString(), ct);
            if (!response.success)
                return (response, null, null);

            await MarkBotEngagedAsync(user.Id, bot.BotUserId, ct);
            response.isBotContact = true;
            response.botSlug = bot.Slug;
            response.botEngaged = true;

            SupraWsNewMessagePayload? startMessage = null;
            var (sendResp, startPayload) = await SendMessageAsync(
                user,
                response.chatId!,
                BotStartCommand,
                clientLocalId: $"bot-start:{user.Id:N}:{bot.BotUserId:N}",
                ct: ct);
            if (sendResp.success && startPayload != null)
                startMessage = startPayload;

            var notify = BuildBotDirectChatNotify(response.chatId!, botUser, bot.Slug);
            return (response, notify, startMessage);
        }
        catch (Exception ex)
        {
            return (new SupraCreateChatResponse { success = false, error = ex.Message }, null, null);
        }
    }

    public async Task<SupraSimpleResponse> TransferBotOwnershipAsync(
        UserRecord user, string botUserId, string newOwnerUserId, CancellationToken ct = default)
    {
        try
        {
            var (bot, botUser, error) = await GetBotAccessAsync(user.Id, botUserId, ct);
            if (error != null)
                return new SupraSimpleResponse { success = false, error = error };
            if (IsBotDeleted(bot!))
                return new SupraSimpleResponse { success = false, error = "Бот удалён" };

            if (!Guid.TryParse(newOwnerUserId, out var newOwnerGuid))
                return new SupraSimpleResponse { success = false, error = "Некорректный userId" };
            if (newOwnerGuid == user.Id)
                return new SupraSimpleResponse { success = false, error = "Нельзя передать бот себе" };

            var newOwner = await _store.GetUserByIdAsync(newOwnerGuid, ct);
            if (newOwner == null || !newOwner.IsActive || IsBotUser(newOwner))
                return new SupraSimpleResponse { success = false, error = "Пользователь не найден" };

            bot!.OwnerUserId = newOwnerGuid;
            await _store.SaveBotAsync(bot, ct);

            await CreateDirectChatAsync(newOwner, bot.BotUserId.ToString(), ct);
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> DeleteBotAsync(
        UserRecord user, string botUserId, CancellationToken ct = default)
    {
        try
        {
            var (bot, botUser, error) = await GetBotAccessAsync(user.Id, botUserId, ct);
            if (error != null)
                return new SupraSimpleResponse { success = false, error = error };
            if (IsBotDeleted(bot!))
                return new SupraSimpleResponse { success = false, error = "Бот уже удалён" };

            bot!.DeletedOn = DateTime.UtcNow;
            bot.TokenHash = null;
            botUser!.IsActive = false;
            await _store.SaveBotAsync(bot, ct);
            await _store.SaveUserAsync(botUser, ct);
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraSimpleResponse> RestoreBotAsync(
        UserRecord user, string botUserId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(botUserId, out var botUserGuid))
                return new SupraSimpleResponse { success = false, error = "Некорректный botUserId" };
            var bot = await _store.GetBotByUserIdAsync(botUserGuid, ct);
            if (bot == null)
                return new SupraSimpleResponse { success = false, error = "Бот не найден" };
            if (bot.OwnerUserId != user.Id)
                return new SupraSimpleResponse { success = false, error = "Нет доступа" };
            if (!IsBotDeleted(bot))
                return new SupraSimpleResponse { success = false, error = "Бот не удалён" };
            if (!CanRestoreBot(bot))
                return new SupraSimpleResponse { success = false, error = "Срок восстановления истёк" };

            bot.DeletedOn = null;
            var botUser = await _store.GetUserByIdAsync(bot.BotUserId, ct);
            if (botUser != null)
            {
                botUser.IsActive = true;
                await _store.SaveUserAsync(botUser, ct);
            }
            await _store.SaveBotAsync(bot, ct);
            return new SupraSimpleResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraSimpleResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraGenerateBotTokenResponse> GenerateBotTokenAsync(
        UserRecord user, string botUserId, CancellationToken ct = default)
    {
        try
        {
            var (bot, _, error) = await GetBotAccessAsync(user.Id, botUserId, ct);
            if (error != null)
                return new SupraGenerateBotTokenResponse { success = false, error = error };
            if (IsBotDeleted(bot!))
                return new SupraGenerateBotTokenResponse { success = false, error = "Бот удалён" };

            var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            bot!.TokenHash = HashBotToken(token);
            await _store.SaveBotAsync(bot, ct);
            return new SupraGenerateBotTokenResponse { success = true, token = token };
        }
        catch (Exception ex)
        {
            return new SupraGenerateBotTokenResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraWsBotUpdatedPayload?> GetBotUpdatedPayloadAsync(
        Guid botUserId, CancellationToken ct = default)
    {
        var bot = await _store.GetBotByUserIdAsync(botUserId, ct);
        if (bot == null) return null;
        var botUser = await _store.GetUserByIdAsync(botUserId, ct);
        if (botUser == null) return null;
        return new SupraWsBotUpdatedPayload
        {
            botUserId = botUserId.ToString(),
            botName = botUser.DisplayName,
            botAvatar = AvatarUrl(botUser),
            slug = bot.Slug,
            description = bot.Description,
            menu = BotMenuHelper.ParseMenu(bot.MenuJson),
        };
    }

    public async Task<(bool isBot, string? slug)> TryGetBotSlugForUserAsync(Guid userId, CancellationToken ct)
    {
        var user = await _store.GetUserByIdAsync(userId, ct);
        if (user == null || !IsBotUser(user)) return (false, null);
        var bot = await _store.GetBotByUserIdAsync(userId, ct);
        return bot == null || IsBotDeleted(bot) ? (true, null) : (true, bot.Slug);
    }

    public async Task<bool> IsDirectBotChatAsync(Guid chatId, CancellationToken ct)
    {
        var chat = await _store.GetChatByIdAsync(chatId, ct);
        if (chat == null || !string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
            return false;
        var parts = await _store.GetParticipantsByChatAsync(chatId, ct);
        foreach (var p in parts)
        {
            var u = await _store.GetUserByIdAsync(p.UserId, ct);
            if (IsBotUser(u)) return true;
        }
        return false;
    }
}
