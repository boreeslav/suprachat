using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed class SupraEncryptionService
{
    private readonly IDataStore _store;

    public SupraEncryptionService(IDataStore store) => _store = store;

    public bool IsEncryptionConfigured(UserRecord user) =>
        !string.IsNullOrEmpty(user.EncryptionSalt) &&
        !string.IsNullOrEmpty(user.EncryptionVerifier) &&
        !string.IsNullOrEmpty(user.EncryptionPublicKey);

    public async Task<(bool success, string? error)> SetupMasterEncryptionAsync(
        UserRecord user,
        string salt,
        string verifier,
        string? publicKey,
        string? privateKeyBlob = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(salt) || string.IsNullOrWhiteSpace(verifier))
            return (false, "Неполные параметры шифрования");

        if (IsEncryptionConfigured(user))
        {
            if (!string.IsNullOrWhiteSpace(publicKey))
            {
                if (!string.IsNullOrEmpty(user.EncryptionPublicKey))
                    return (false, "Шифрование уже настроено");
                user.EncryptionPublicKey = publicKey.Trim();
            }
            user.EncryptionSalt = salt.Trim();
            user.EncryptionVerifier = verifier.Trim();
            if (!string.IsNullOrWhiteSpace(privateKeyBlob))
                user.EncryptionPrivateKeyBlob = privateKeyBlob.Trim();
            await _store.SaveUserAsync(user, ct);
            return (true, null);
        }

        if (string.IsNullOrWhiteSpace(publicKey))
            return (false, "Неполные параметры шифрования");

        user.EncryptionSalt = salt.Trim();
        user.EncryptionVerifier = verifier.Trim();
        user.EncryptionPublicKey = publicKey.Trim();
        if (!string.IsNullOrWhiteSpace(privateKeyBlob))
            user.EncryptionPrivateKeyBlob = privateKeyBlob.Trim();
        await _store.SaveUserAsync(user, ct);
        return (true, null);
    }

    public async Task<Dictionary<string, string>> GetPublicKeysAsync(IEnumerable<Guid> userIds, CancellationToken ct = default)
    {
        var ids = userIds.Distinct().ToHashSet();
        var users = await _store.GetUsersAsync(ct);
        var result = new Dictionary<string, string>();
        foreach (var u in users)
        {
            if (!ids.Contains(u.Id) || string.IsNullOrEmpty(u.EncryptionPublicKey)) continue;
            result[u.Id.ToString()] = u.EncryptionPublicKey;
        }
        return result;
    }

    public async Task<(bool success, string? error)> SaveGroupMemberKeysAsync(
        UserRecord actor,
        Guid chatId,
        IReadOnlyList<(Guid userId, string wrappedAutoPassword)> keys,
        bool requiresCustomPassword,
        CancellationToken ct = default)
    {
        if (!await _store.IsParticipantAsync(chatId, actor.Id, ct))
            return (false, "Нет доступа к чату");

        var chat = await _store.GetChatByIdAsync(chatId, ct);
        if (chat == null)
            return (false, "Чат не найден");
        var isDirect = string.Equals(chat.Type, "direct", StringComparison.OrdinalIgnoreCase);
        if (!SupraMessengerService.IsGroupChat(chat) && !isDirect)
            return (false, "Ключи доступны только для групп и личных чатов");

        var participants = (await _store.GetParticipantsByChatAsync(chatId, ct))
            .Select(p => p.UserId)
            .ToHashSet();

        foreach (var (userId, wrapped) in keys)
        {
            if (!participants.Contains(userId))
                return (false, "Пользователь не является участником группы");
            if (string.IsNullOrWhiteSpace(wrapped))
                return (false, "Пустой ключ для участника");

            await _store.SaveChatMemberKeyAsync(new SupraChatMemberKeyRecord
            {
                Id = Guid.NewGuid(),
                ChatId = chatId,
                UserId = userId,
                WrappedAutoPassword = wrapped.Trim(),
            }, ct);
        }

        if (requiresCustomPassword)
        {
            chat.RequiresCustomGroupPassword = true;
            await _store.SaveChatAsync(chat, ct);
        }

        return (true, null);
    }

    public async Task<string?> GetMyWrappedGroupAutoPasswordAsync(Guid userId, Guid chatId, CancellationToken ct = default)
    {
        if (!await _store.IsParticipantAsync(chatId, userId, ct))
            return null;
        var key = await _store.GetChatMemberKeyAsync(chatId, userId, ct);
        return key?.WrappedAutoPassword;
    }

    public async Task<List<Guid>> GetMembersMissingGroupKeyAsync(Guid chatId, CancellationToken ct = default)
    {
        var participants = await _store.GetParticipantsByChatAsync(chatId, ct);
        var keys = await _store.GetChatMemberKeysByChatAsync(chatId, ct);
        var hasKey = keys.Select(k => k.UserId).ToHashSet();
        return participants.Where(p => !hasKey.Contains(p.UserId)).Select(p => p.UserId).ToList();
    }

    /// <summary>Clears server-side encryption for user and removes their wrapped group keys.</summary>
    public async Task ResetMasterEncryptionAsync(UserRecord user, CancellationToken ct = default)
    {
        user.EncryptionSalt = null;
        user.EncryptionVerifier = null;
        user.EncryptionPublicKey = null;
        user.EncryptionPrivateKeyBlob = null;
        await _store.SaveUserAsync(user, ct);
        await _store.DeleteChatMemberKeysForUserAsync(user.Id, ct);
    }
}
