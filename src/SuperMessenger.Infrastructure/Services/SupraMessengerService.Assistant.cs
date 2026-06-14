using System.Text.Json;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class SupraMessengerService
{
    static bool IsAssistantSourceChat(SupraChatRecord chat) =>
        string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase)
        || IsGroupChat(chat)
        || IsGroupBranchChat(chat);

    async Task<BotApiMenuDto> ResolveAssistantMenuAsync(BotRecord bot, string? chatId, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(chatId) &&
            Guid.TryParse(chatId.Trim(), out var chatGuid))
        {
            var chatMenu = await _store.GetBotAssistantChatMenuAsync(bot.BotUserId, chatGuid, ct);
            if (chatMenu != null)
                return BotMenuHelper.ParseMenu(chatMenu.MenuJson);
        }
        return BotMenuHelper.ParseMenu(bot.AssistantMenuJson);
    }

    async Task<Guid?> FindDirectChatBetweenAsync(Guid userA, Guid userB, CancellationToken ct)
    {
        foreach (var p in await _store.GetParticipantsByUserAsync(userA, ct))
        {
            if (!await _store.IsParticipantAsync(p.ChatId, userB, ct)) continue;
            var chat = await _store.GetChatByIdAsync(p.ChatId, ct);
            if (chat != null && string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
                return p.ChatId;
        }
        return null;
    }

    public async Task<SupraAddBotAssistantResponse> AddBotAssistantAsync(
        UserRecord user, string botUserId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(botUserId, out var botGuid))
                return new SupraAddBotAssistantResponse { success = false, error = "Некорректный botUserId" };

            var botUser = await _store.GetUserByIdAsync(botGuid, ct);
            var bot = await _store.GetBotByUserIdAsync(botGuid, ct);
            if (botUser == null || bot == null || !IsBotUser(botUser) || IsBotDeleted(bot))
                return new SupraAddBotAssistantResponse { success = false, error = "Бот не найден" };

            if (!await _store.HasBotEngagementAsync(user.Id, botGuid, ct))
                return new SupraAddBotAssistantResponse { success = false, error = "Сначала начните диалог с ботом" };

            var menu = BotMenuHelper.ParseMenu(bot.AssistantMenuJson);
            if ((menu.items ?? []).Count == 0)
                return new SupraAddBotAssistantResponse { success = false, error = "У бота не настроено меню помощника" };

            await _store.SaveUserBotAssistantAsync(new UserBotAssistantRecord
            {
                UserId = user.Id,
                BotUserId = botGuid,
                AddedOn = DateTime.UtcNow,
            }, ct);

            return new SupraAddBotAssistantResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraAddBotAssistantResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraRemoveBotAssistantResponse> RemoveBotAssistantAsync(
        UserRecord user, string botUserId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(botUserId, out var botGuid))
                return new SupraRemoveBotAssistantResponse { success = false, error = "Некорректный botUserId" };

            await _store.DeleteUserBotAssistantAsync(user.Id, botGuid, ct);
            return new SupraRemoveBotAssistantResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraRemoveBotAssistantResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraGetBotAssistantsResponse> GetBotAssistantsAsync(
        Guid userId, CancellationToken ct = default)
    {
        try
        {
            var records = await _store.GetUserBotAssistantsAsync(userId, ct);
            var items = new List<SupraBotAssistantListItemDto>();
            foreach (var record in records.OrderBy(r => r.AddedOn))
            {
                var botUser = await _store.GetUserByIdAsync(record.BotUserId, ct);
                var bot = await _store.GetBotByUserIdAsync(record.BotUserId, ct);
                if (botUser == null || bot == null || IsBotDeleted(bot)) continue;

                var directChatId = await FindDirectChatBetweenAsync(userId, record.BotUserId, ct);
                var assistantMenu = await ResolveAssistantMenuAsync(bot, directChatId?.ToString(), ct);
                if ((assistantMenu.items ?? []).Count == 0) continue;

                items.Add(new SupraBotAssistantListItemDto
                {
                    botUserId = record.BotUserId.ToString(),
                    name = botUser.DisplayName,
                    slug = bot.Slug,
                    avatar = AvatarUrl(botUser),
                    assistantMenu = assistantMenu,
                    botChatId = directChatId?.ToString(),
                });
            }

            return new SupraGetBotAssistantsResponse { success = true, assistants = items };
        }
        catch (Exception ex)
        {
            return new SupraGetBotAssistantsResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(SupraInvokeBotAssistantResponse response, List<BotInboxMessageRecord> inboxRecords, List<(Guid chatId, SupraWsNewMessagePayload payload)> broadcasts)> InvokeBotAssistantAsync(
        UserRecord user,
        string sourceChatId,
        IReadOnlyList<string> messageIds,
        string botUserId,
        string menuItemId,
        IReadOnlyList<SupraAssistantInvokeMessageDto> plaintextMessages,
        CancellationToken ct = default)
    {
        var broadcasts = new List<(Guid, SupraWsNewMessagePayload)>();
        try
        {
            if (plaintextMessages == null || plaintextMessages.Count == 0)
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Нет сообщений для отправки" }, [], broadcasts);

            if (!Guid.TryParse(sourceChatId, out var sourceChatGuid))
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Некорректный sourceChatId" }, [], broadcasts);

            if (!Guid.TryParse(botUserId, out var botGuid))
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Некорректный botUserId" }, [], broadcasts);

            if (!await _store.IsParticipantAsync(sourceChatGuid, user.Id, ct))
                throw new UnauthorizedAccessException("Пользователь не является участником чата");

            var sourceChat = await _store.GetChatByIdAsync(sourceChatGuid, ct);
            if (sourceChat == null || !IsAssistantSourceChat(sourceChat))
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Помощник доступен только в личных и групповых чатах" }, [], broadcasts);

            if (!await _store.HasUserBotAssistantAsync(user.Id, botGuid, ct))
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Бот не добавлен как помощник" }, [], broadcasts);

            var botUser = await _store.GetUserByIdAsync(botGuid, ct);
            var bot = await _store.GetBotByUserIdAsync(botGuid, ct);
            if (botUser == null || bot == null || IsBotDeleted(bot))
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Бот не найден" }, [], broadcasts);

            var botDirectChatId = await FindDirectChatBetweenAsync(user.Id, botGuid, ct);
            if (!botDirectChatId.HasValue)
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Чат с ботом не найден" }, [], broadcasts);

            var assistantMenu = await ResolveAssistantMenuAsync(bot, botDirectChatId.Value.ToString(), ct);
            var menuItem = BotMenuHelper.FindLeafItemById(assistantMenu, menuItemId);
            if (menuItem == null || string.IsNullOrWhiteSpace(menuItem.message))
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Пункт меню не найден" }, [], broadcasts);

            var session = new BotAssistantSessionRecord
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                BotUserId = botGuid,
                SourceChatId = sourceChatGuid,
                SourceChatName = sourceChat.Name,
                MenuItemId = menuItemId,
                Command = menuItem.message.Trim(),
                Status = BotAssistantSessionStatus.Active,
                CreatedOn = DateTime.UtcNow,
                ExpiresOn = DateTime.UtcNow + BotApiService.AssistantSessionTtl,
            };
            await _store.SaveBotAssistantSessionAsync(session, ct);

            var forwarded = await ResolveAssistantForwardedMessagesAsync(sourceChatGuid, plaintextMessages, ct);

            if (forwarded.Count == 0)
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Нет содержимого для отправки боту" }, [], broadcasts);

            if (forwarded.Any(m => IsEncryptedPayload(m.text)))
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Не удалось расшифровать сообщение для отправки боту" }, [], broadcasts);

            var combinedText = BuildCombinedAssistantMessageText(forwarded);
            var invisibleTag = BuildAssistantInvisibleTag(session.Id);
            var messageText = invisibleTag + combinedText;

            var allFileGuids = forwarded
                .SelectMany(m => m.attachmentFileIds ?? [])
                .Select(id => Guid.TryParse(id, out var g) ? g : (Guid?)null)
                .Where(g => g.HasValue)
                .Select(g => g!.Value)
                .Distinct()
                .ToList();

            var forwardedFrom = forwarded.Count == 1
                ? forwarded[0].senderName
                : sourceChat.Name;

            var (sendResp, payload) = await SendMessageAsync(
                user,
                botDirectChatId.Value.ToString(),
                messageText,
                forwardedFromSenderName: forwardedFrom,
                encryptionTier: "basic",
                attachmentFileIds: allFileGuids.Count > 0 ? allFileGuids : null,
                ct: ct);

            if (!sendResp.success)
                return (new SupraInvokeBotAssistantResponse { success = false, error = sendResp.error ?? "Не удалось отправить сообщение боту" }, [], broadcasts);
            if (payload != null)
                broadcasts.Add((botDirectChatId.Value, payload));

            if (sendResp.messageId == null || !Guid.TryParse(sendResp.messageId, out var lastMsgId))
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Не удалось переслать сообщения боту" }, [], broadcasts);

            var sessionDto = new BotAssistantSessionDto
            {
                sessionId = session.Id.ToString(),
                command = session.Command,
                forwardedMessages = forwarded,
            };

            var botChat = await _store.GetChatByIdAsync(botDirectChatId.Value, ct);
            var lastMessage = await _store.GetMessageByIdAsync(lastMsgId, ct);
            if (lastMessage == null)
                return (new SupraInvokeBotAssistantResponse { success = false, error = "Сообщение не найдено" }, [], broadcasts);

            var inbox = new BotInboxMessageRecord
            {
                Id = Guid.NewGuid(),
                BotUserId = botGuid,
                ChatId = botDirectChatId.Value,
                ChatType = botChat?.Type ?? "direct",
                ChatName = botChat?.Name,
                MessageId = lastMessage.Id,
                SenderUserId = user.Id,
                SenderLogin = user.Login,
                SenderName = lastMessage.SenderName,
                Text = lastMessage.Text,
                AssistantSessionJson = JsonSerializer.Serialize(sessionDto),
                CreatedOn = DateTime.UtcNow,
            };
            await _store.SaveBotInboxMessageAsync(inbox, ct);

            return (new SupraInvokeBotAssistantResponse
            {
                success = true,
                sessionId = session.Id.ToString(),
                botChatId = botDirectChatId.Value.ToString(),
                message = payload,
            }, [inbox], broadcasts);
        }
        catch (Exception ex)
        {
            return (new SupraInvokeBotAssistantResponse { success = false, error = ex.Message }, [], broadcasts);
        }
    }

    public async Task<SupraConfirmAssistantReplyResponse> ConfirmAssistantReplyAsync(
        UserRecord user, string sessionId, string insertedMessageId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(sessionId, out var sessionGuid))
                return new SupraConfirmAssistantReplyResponse { success = false, error = "Некорректный sessionId" };

            var session = await _store.GetBotAssistantSessionByIdAsync(sessionGuid, ct);
            if (session == null || session.UserId != user.Id)
                return new SupraConfirmAssistantReplyResponse { success = false, error = "Сессия не найдена" };

            if (!Guid.TryParse(insertedMessageId, out var insertedGuid))
                return new SupraConfirmAssistantReplyResponse { success = false, error = "Некорректный messageId" };

            var inserted = await _store.GetMessageByIdAsync(insertedGuid, ct);
            if (inserted == null || inserted.ChatId != session.SourceChatId || inserted.SenderUserId != user.Id)
                return new SupraConfirmAssistantReplyResponse { success = false, error = "Сообщение не найдено" };

            session.InsertedMessageId = insertedGuid;
            session.Status = BotAssistantSessionStatus.Inserted;
            await _store.SaveBotAssistantSessionAsync(session, ct);
            return new SupraConfirmAssistantReplyResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraConfirmAssistantReplyResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraDismissAssistantReplyResponse> DismissAssistantReplyAsync(
        UserRecord user, string sessionId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(sessionId, out var sessionGuid))
                return new SupraDismissAssistantReplyResponse { success = false, error = "Некорректный sessionId" };

            var session = await _store.GetBotAssistantSessionByIdAsync(sessionGuid, ct);
            if (session == null || session.UserId != user.Id)
                return new SupraDismissAssistantReplyResponse { success = false, error = "Сессия не найдена" };

            if (string.Equals(session.Status, BotAssistantSessionStatus.Inserted, StringComparison.OrdinalIgnoreCase)
                || string.Equals(session.Status, BotAssistantSessionStatus.Dismissed, StringComparison.OrdinalIgnoreCase))
                return new SupraDismissAssistantReplyResponse { success = true };

            if (!string.Equals(session.Status, BotAssistantSessionStatus.Replied, StringComparison.OrdinalIgnoreCase))
                return new SupraDismissAssistantReplyResponse { success = false, error = "Ответ помощника ещё не готов" };

            session.Status = BotAssistantSessionStatus.Dismissed;
            await _store.SaveBotAssistantSessionAsync(session, ct);
            return new SupraDismissAssistantReplyResponse { success = true };
        }
        catch (Exception ex)
        {
            return new SupraDismissAssistantReplyResponse { success = false, error = ex.Message };
        }
    }

    public async Task<SupraGetPendingAssistantRepliesResponse> GetPendingAssistantRepliesAsync(
        Guid userId, CancellationToken ct = default)
    {
        try
        {
            var sessions = await _store.GetBotAssistantSessionsByUserAsync(userId, ct);
            var pending = new List<SupraPendingAssistantReplyDto>();

            foreach (var session in sessions.Where(s =>
                         string.Equals(s.Status, BotAssistantSessionStatus.Replied, StringComparison.OrdinalIgnoreCase)
                         && s.BotReplyMessageId.HasValue
                         && !s.InsertedMessageId.HasValue
                         && s.RepliedOn.HasValue))
            {
                var botUser = await _store.GetUserByIdAsync(session.BotUserId, ct);
                var replyMsg = await _store.GetMessageByIdAsync(session.BotReplyMessageId!.Value, ct);
                if (replyMsg == null) continue;

                var fileRefs = await _store.GetMessageFileReferencesByMessageAsync(replyMsg.Id, ct);
                pending.Add(new SupraPendingAssistantReplyDto
                {
                    sessionId = session.Id.ToString(),
                    sourceChatId = session.SourceChatId.ToString(),
                    sourceChatName = session.SourceChatName,
                    botUserId = session.BotUserId.ToString(),
                    botName = botUser?.DisplayName ?? "",
                    botMessageId = replyMsg.Id.ToString(),
                    text = replyMsg.Text,
                    attachmentFileIds = fileRefs.Select(r => r.FileId.ToString()).ToList(),
                    repliedOn = session.RepliedOn!.Value,
                });
            }

            return new SupraGetPendingAssistantRepliesResponse { success = true, replies = pending };
        }
        catch (Exception ex)
        {
            return new SupraGetPendingAssistantRepliesResponse { success = false, error = ex.Message };
        }
    }

    static string BuildAssistantInvisibleTag(Guid sessionId) =>
        $"\u2060\u200Bassistant:{sessionId:N}\u200B\u2060";

    static bool IsEncryptedAssistantSourceText(string text) =>
        text.StartsWith("E1:", StringComparison.Ordinal);

    static string BuildCombinedAssistantMessageText(IReadOnlyList<BotAssistantForwardedMessageDto> messages)
    {
        if (messages.Count == 1)
            return messages[0].text ?? "";

        var parts = new List<string>(messages.Count);
        for (var i = 0; i < messages.Count; i++)
        {
            var m = messages[i];
            var sender = string.IsNullOrWhiteSpace(m.senderName) ? "" : $"{m.senderName}: ";
            var body = MessageAttachmentParser.TryParse(m.text) != null
                ? MessageAttachmentParser.ToPreview(m.text)
                : (m.text ?? "");
            if (string.IsNullOrWhiteSpace(body) && m.attachmentFileIds is { Count: > 0 })
                body = MessageAttachmentParser.ToPreview(m.text);
            parts.Add($"[{i + 1}] {sender}{body}");
        }
        return string.Join("\n\n", parts);
    }

    async Task<List<BotAssistantForwardedMessageDto>> ResolveAssistantForwardedMessagesAsync(
        Guid sourceChatGuid,
        IReadOnlyList<SupraAssistantInvokeMessageDto> clientMessages,
        CancellationToken ct)
    {
        var result = new List<BotAssistantForwardedMessageDto>();
        foreach (var client in clientMessages)
        {
            var text = client.text?.Trim() ?? "";
            var attachmentIds = new List<string>(client.attachmentFileIds ?? []);
            var senderName = client.senderName;
            var originalId = client.originalMessageId;

            if (Guid.TryParse(originalId, out var msgGuid))
            {
                var source = await _store.GetMessageByIdAsync(msgGuid, ct);
                if (source != null && source.ChatId == sourceChatGuid && !source.DeletedForEveryone)
                {
                    if (string.Equals(source.EncryptionTier, "protected", StringComparison.OrdinalIgnoreCase))
                        continue;

                    if (string.IsNullOrWhiteSpace(senderName))
                        senderName = source.SenderName;

                    var sourceText = source.Text?.Trim() ?? "";
                    var sourceEncrypted = IsEncryptedAssistantSourceText(sourceText);
                    var clientEncrypted = IsEncryptedAssistantSourceText(text);

                    if (!sourceEncrypted && !string.IsNullOrEmpty(sourceText))
                        text = sourceText;
                    else if (sourceEncrypted && clientEncrypted)
                        text = "";

                    if (attachmentIds.Count == 0)
                    {
                        attachmentIds = (await _store.GetMessageFileReferencesByMessageAsync(msgGuid, ct))
                            .Select(r => r.FileId.ToString())
                            .Distinct()
                            .ToList();
                    }

                    if (sourceEncrypted && attachmentIds.Count > 0
                        && (string.IsNullOrEmpty(text) || clientEncrypted || MessageAttachmentParser.TryParse(text) == null))
                    {
                        var packedFromRefs = await BuildAssistantMediaTextFromFileIdsAsync(attachmentIds, ct);
                        if (!string.IsNullOrEmpty(packedFromRefs))
                            text = packedFromRefs;
                    }
                }
            }

            if (MessageAttachmentParser.TryParse(text) == null && attachmentIds.Count > 0)
            {
                var packed = await BuildAssistantMediaTextFromFileIdsAsync(attachmentIds, ct);
                if (!string.IsNullOrEmpty(packed))
                    text = packed;
            }

            if (string.IsNullOrEmpty(text) && attachmentIds.Count == 0)
                continue;

            if (IsEncryptedAssistantSourceText(text))
                continue;

            if (attachmentIds.Count == 0)
                attachmentIds = MessageAttachmentParser.ExtractFileIds(text).Select(id => id.ToString()).ToList();

            result.Add(new BotAssistantForwardedMessageDto
            {
                text = text,
                senderName = senderName,
                originalMessageId = originalId,
                attachmentFileIds = attachmentIds,
            });
        }

        return result;
    }

    async Task<string?> BuildAssistantMediaTextFromFileIdsAsync(IReadOnlyList<string> fileIdStrings, CancellationToken ct)
    {
        var files = new List<SupraFileRecord>();
        foreach (var idStr in fileIdStrings.Distinct())
        {
            if (!Guid.TryParse(idStr, out var id)) continue;
            var file = await _store.GetFileByIdAsync(id, ct);
            if (file != null)
                files.Add(file);
        }

        if (files.Count == 0) return null;

        if (files.Count == 1)
        {
            var f = files[0];
            var isImage = f.MimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
            var payload = new
            {
                fileId = f.Id.ToString(),
                fileName = f.FileName,
                fileSize = f.Size,
                mimeType = f.MimeType,
                chatId = f.ChatId.ToString(),
            };
            return MessageAttachmentParser.Pack(
                isImage ? MessageAttachmentParser.ContentTypeImage : MessageAttachmentParser.ContentTypeFile,
                payload);
        }

        var images = files.Where(f => f.MimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)).ToList();
        if (images.Count == files.Count)
        {
            var albumPayload = new
            {
                fileIds = images.Select(f => f.Id.ToString()).ToArray(),
                fileNames = images.Select(f => f.FileName).ToArray(),
                fileSizes = images.Select(f => f.Size).ToArray(),
                mimeTypes = images.Select(f => f.MimeType).ToArray(),
                caption = "",
                chatId = images[0].ChatId.ToString(),
            };
            return MessageAttachmentParser.Pack(MessageAttachmentParser.ContentTypePhotoAlbum, albumPayload);
        }

        var doc = files[0];
        var docPayload = new
        {
            fileId = doc.Id.ToString(),
            fileName = doc.FileName,
            fileSize = doc.Size,
            mimeType = doc.MimeType,
            chatId = doc.ChatId.ToString(),
        };
        return MessageAttachmentParser.Pack(MessageAttachmentParser.ContentTypeFile, docPayload);
    }
}
