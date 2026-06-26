using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class SupraMessengerService
{
    const string PinStatePinned = "pinned";
    const string PinStateHidden = "hidden";
    const string PinScopeAll = "all";
    const string PinScopeSelf = "self";

    /// <summary>
    /// Может ли пользователь закреплять/откреплять «для всех» в этом чате:
    /// админ/создатель группы или ветки, владелец/админ канала, любой участник личного чата.
    /// </summary>
    async Task<bool> CanPinForEveryoneAsync(Guid userId, SupraChatRecord? chat, CancellationToken ct)
    {
        if (chat == null) return false;
        if (IsGroupChat(chat))
        {
            var root = await GetRootGroupChatAsync(chat.Id, ct) ?? chat;
            return await IsGroupModeratorAsync(userId, root, ct);
        }
        if (IsChannelChat(chat))
        {
            var me = (await _store.GetParticipantsByChatAsync(chat.Id, ct))
                .FirstOrDefault(p => p.UserId == userId);
            return me != null && ChannelRoles.CanManageMembers(ResolveParticipantRole(me, chat));
        }
        if (string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase))
            return true;
        return false;
    }

    /// <summary>
    /// Эффективный список закреплённых сообщений для пользователя: глобальные закрепы
    /// (минус персонально скрытые) плюс личные закрепы. Возвращает только id + метаданные
    /// видимых сообщений, отсортированные хронологически по Seq.
    /// </summary>
    async Task<List<SupraPinnedMessageDto>> GetEffectivePinnedDtosAsync(
        Guid chatGuid, Guid userId, CancellationToken ct)
    {
        var globals = await _store.GetPinnedMessagesByChatAsync(chatGuid, ct);
        var userRecs = await _store.GetPinnedMessageUserRecordsByChatUserAsync(chatGuid, userId, ct);
        if (globals.Count == 0 && userRecs.Count == 0)
            return [];

        var hidden = userRecs
            .Where(r => string.Equals(r.State, PinStateHidden, StringComparison.OrdinalIgnoreCase))
            .Select(r => r.MessageId)
            .ToHashSet();
        var personal = userRecs
            .Where(r => string.Equals(r.State, PinStatePinned, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var eff = new Dictionary<Guid, (DateTime pinnedAt, Guid pinnedBy, string scope)>();
        foreach (var g in globals)
        {
            if (hidden.Contains(g.MessageId)) continue;
            eff[g.MessageId] = (g.PinnedAt, g.PinnedByUserId, PinScopeAll);
        }
        foreach (var p in personal)
        {
            if (eff.ContainsKey(p.MessageId)) continue; // глобальный закреп приоритетнее личного
            eff[p.MessageId] = (p.UpdatedAt, userId, PinScopeSelf);
        }
        if (eff.Count == 0)
            return [];

        // Только сообщения, реально видимые пользователю (исключает удалённые для всех,
        // скрытые лично и невидимые/адресные), заодно берём канонический Seq для сортировки.
        var visible = await GetVisibleMessagesOrderedAsync(chatGuid, userId, ct);
        var byId = visible.ToDictionary(m => m.Id);

        var result = new List<SupraPinnedMessageDto>();
        foreach (var (messageId, meta) in eff)
        {
            if (!byId.TryGetValue(messageId, out var rec)) continue;
            result.Add(new SupraPinnedMessageDto
            {
                messageId = messageId.ToString(),
                seq = rec.Seq,
                pinnedAt = meta.pinnedAt,
                pinnedBy = meta.pinnedBy.ToString(),
                scope = meta.scope,
            });
        }
        return result.OrderBy(p => p.seq).ToList();
    }

    public async Task<SupraGetPinnedMessagesResponse> GetPinnedMessagesAsync(
        Guid userId, string chatId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return new SupraGetPinnedMessagesResponse { success = false, error = "Некорректный chatId" };
            if (!await _store.IsParticipantAsync(chatGuid, userId, ct))
                return new SupraGetPinnedMessagesResponse { success = false, error = "Нет доступа" };

            var pinned = await GetEffectivePinnedDtosAsync(chatGuid, userId, ct);
            return new SupraGetPinnedMessagesResponse { success = true, pinned = pinned };
        }
        catch (Exception ex)
        {
            return new SupraGetPinnedMessagesResponse { success = false, error = ex.Message };
        }
    }

    public async Task<(SupraPinMessageResponse response, SupraWsMessagePinnedPayload? payload, bool broadcastAll)> PinMessageAsync(
        UserRecord user, string chatId, string messageId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new SupraPinMessageResponse { success = false, error = "Некорректный chatId" }, null, false);
            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                return (new SupraPinMessageResponse { success = false, error = "Нет доступа" }, null, false);
            if (!Guid.TryParse(messageId, out var msgGuid))
                return (new SupraPinMessageResponse { success = false, error = "Некорректный messageId" }, null, false);

            var message = await _store.GetMessageByIdAsync(msgGuid, ct);
            if (message == null
                || message.ChatId != chatGuid
                || message.DeletedForEveryone
                || !IsMessageVisibleToUser(message, user.Id)
                || await _store.IsMessageDeletedForUserAsync(msgGuid, user.Id, ct))
                return (new SupraPinMessageResponse { success = false, error = "Сообщение не найдено" }, null, false);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            var canAll = await CanPinForEveryoneAsync(user.Id, chat, ct);
            var now = DateTime.UtcNow;

            if (canAll)
            {
                await _store.SavePinnedMessageAsync(new SupraPinnedMessageRecord
                {
                    Id = Guid.NewGuid(),
                    ChatId = chatGuid,
                    MessageId = msgGuid,
                    PinnedByUserId = user.Id,
                    PinnedAt = now,
                }, ct);
                // Свежий глобальный закреп виден всем — сбрасываем персональные скрытия/закрепы по этому сообщению.
                await _store.DeletePinnedMessageUserByMessageAsync(chatGuid, msgGuid, ct);

                var payload = new SupraWsMessagePinnedPayload
                {
                    chatId = chatGuid.ToString(),
                    messageId = msgGuid.ToString(),
                    seq = message.Seq,
                    pinnedAt = now,
                    pinnedBy = user.Id.ToString(),
                    scope = PinScopeAll,
                };
                return (new SupraPinMessageResponse { success = true, scope = PinScopeAll }, payload, true);
            }

            await _store.SavePinnedMessageUserAsync(new SupraPinnedMessageUserRecord
            {
                Id = Guid.NewGuid(),
                ChatId = chatGuid,
                MessageId = msgGuid,
                UserId = user.Id,
                State = PinStatePinned,
                UpdatedAt = now,
            }, ct);

            var selfPayload = new SupraWsMessagePinnedPayload
            {
                chatId = chatGuid.ToString(),
                messageId = msgGuid.ToString(),
                seq = message.Seq,
                pinnedAt = now,
                pinnedBy = user.Id.ToString(),
                scope = PinScopeSelf,
            };
            return (new SupraPinMessageResponse { success = true, scope = PinScopeSelf }, selfPayload, false);
        }
        catch (Exception ex)
        {
            return (new SupraPinMessageResponse { success = false, error = ex.Message }, null, false);
        }
    }

    public async Task<(SupraSimpleResponse response, SupraWsMessageUnpinnedPayload? payload, bool broadcastAll)> UnpinMessageAsync(
        UserRecord user, string chatId, string messageId, CancellationToken ct = default)
    {
        try
        {
            if (!Guid.TryParse(chatId, out var chatGuid))
                return (new SupraSimpleResponse { success = false, error = "Некорректный chatId" }, null, false);
            if (!await _store.IsParticipantAsync(chatGuid, user.Id, ct))
                return (new SupraSimpleResponse { success = false, error = "Нет доступа" }, null, false);
            if (!Guid.TryParse(messageId, out var msgGuid))
                return (new SupraSimpleResponse { success = false, error = "Некорректный messageId" }, null, false);

            var chat = await _store.GetChatByIdAsync(chatGuid, ct);
            var canAll = await CanPinForEveryoneAsync(user.Id, chat, ct);
            var globalExists = (await _store.GetPinnedMessagesByChatAsync(chatGuid, ct))
                .Any(p => p.MessageId == msgGuid);

            if (canAll && globalExists)
            {
                await _store.DeletePinnedMessageAsync(chatGuid, msgGuid, ct);
                await _store.DeletePinnedMessageUserByMessageAsync(chatGuid, msgGuid, ct);
                var payload = new SupraWsMessageUnpinnedPayload
                {
                    chatId = chatGuid.ToString(),
                    messageId = msgGuid.ToString(),
                    scope = PinScopeAll,
                };
                return (new SupraSimpleResponse { success = true }, payload, true);
            }

            if (globalExists)
            {
                // Обычный участник скрывает глобальный закреп только у себя.
                await _store.SavePinnedMessageUserAsync(new SupraPinnedMessageUserRecord
                {
                    Id = Guid.NewGuid(),
                    ChatId = chatGuid,
                    MessageId = msgGuid,
                    UserId = user.Id,
                    State = PinStateHidden,
                    UpdatedAt = DateTime.UtcNow,
                }, ct);
            }
            else
            {
                // Снимаем личный закреп пользователя.
                await _store.DeletePinnedMessageUserAsync(chatGuid, msgGuid, user.Id, ct);
            }

            var selfPayload = new SupraWsMessageUnpinnedPayload
            {
                chatId = chatGuid.ToString(),
                messageId = msgGuid.ToString(),
                scope = PinScopeSelf,
            };
            return (new SupraSimpleResponse { success = true }, selfPayload, false);
        }
        catch (Exception ex)
        {
            return (new SupraSimpleResponse { success = false, error = ex.Message }, null, false);
        }
    }

    /// <summary>
    /// Удаляет все закрепы (глобальные и персональные) для конкретного сообщения.
    /// Вызывается при удалении сообщения «для всех», чтобы не оставлять висячих закрепов.
    /// Возвращает true, если существовал глобальный закреп (для рассылки открепления всем).
    /// </summary>
    public async Task<bool> RemovePinsForDeletedMessageAsync(Guid chatId, Guid messageId, CancellationToken ct = default)
    {
        var hadGlobal = (await _store.GetPinnedMessagesByChatAsync(chatId, ct))
            .Any(p => p.MessageId == messageId);
        await _store.DeletePinnedMessageAsync(chatId, messageId, ct);
        await _store.DeletePinnedMessageUserByMessageAsync(chatId, messageId, ct);
        return hadGlobal;
    }
}
