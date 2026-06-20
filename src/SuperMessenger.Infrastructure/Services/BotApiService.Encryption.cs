using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed partial class BotApiService
{
    /// <summary>
    /// Текущее состояние шифрования бота. Бот использует salt, чтобы детерминированно
    /// воспроизвести ту же RSA-пару из своего мастер-пароля при каждом запуске.
    /// </summary>
    public Task<BotApiEncryptionStatusResponse> GetEncryptionStatusAsync(
        UserRecord botUser, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return Task.FromResult(new BotApiEncryptionStatusResponse
        {
            success = true,
            configured = _encryption.IsEncryptionConfigured(botUser),
            salt = botUser.EncryptionSalt,
            publicKey = botUser.EncryptionPublicKey,
            privateKeyBlob = botUser.EncryptionPrivateKeyBlob,
        });
    }

    /// <summary>
    /// Публикация ключей шифрования бота (как у обычного пользователя): salt, verifier,
    /// публичный RSA-ключ и зашифрованный мастер-паролем приватный ключ.
    /// </summary>
    public async Task<BotApiEncryptionSetupResponse> SetupEncryptionAsync(
        UserRecord botUser,
        string? salt,
        string? verifier,
        string? publicKey,
        string? privateKeyBlob,
        CancellationToken ct = default)
    {
        var (ok, error) = await _encryption.SetupMasterEncryptionAsync(
            botUser,
            salt ?? "",
            verifier ?? "",
            string.IsNullOrWhiteSpace(publicKey) ? null : publicKey.Trim(),
            string.IsNullOrWhiteSpace(privateKeyBlob) ? null : privateKeyBlob.Trim(),
            ct);
        return ok
            ? new BotApiEncryptionSetupResponse { success = true }
            : new BotApiEncryptionSetupResponse { success = false, error = error };
    }

    /// <summary>
    /// Обёрнутый под публичный ключ бота автопароль чата (RSA-OAEP). Бот развернёт его
    /// своим приватным ключом и выведет AES-ключ чата — как у обычного участника.
    /// </summary>
    public async Task<BotApiGroupKeyResponse> GetGroupKeyAsync(
        UserRecord botUser, string? chatId, CancellationToken ct = default)
    {
        if (!Guid.TryParse(chatId, out var chatGuid))
            return new BotApiGroupKeyResponse { success = false, error = "Некорректный chatId" };

        var wrapped = await _encryption.GetMyWrappedGroupAutoPasswordAsync(botUser.Id, chatGuid, ct);
        return new BotApiGroupKeyResponse
        {
            success = true,
            found = !string.IsNullOrEmpty(wrapped),
            wrappedAutoPassword = wrapped,
        };
    }
}
