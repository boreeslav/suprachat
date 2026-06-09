using System.Security.Cryptography;
using SuperMessenger.Core.Abstractions;

namespace SuperMessenger.Web.Services;

public static class InvitationTokenGenerator
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    public const int TokenLength = 7;

    public static async Task<string> GenerateUniqueAsync(IDataStore store, CancellationToken ct = default)
    {
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var token = Generate();
            if (await store.GetInvitationByTokenAsync(token, ct) == null)
                return token;
        }

        throw new InvalidOperationException("Не удалось сгенерировать уникальный код приглашения");
    }

    private static string Generate()
    {
        Span<char> chars = stackalloc char[TokenLength];
        Span<byte> bytes = stackalloc byte[TokenLength];
        RandomNumberGenerator.Fill(bytes);
        for (var i = 0; i < TokenLength; i++)
            chars[i] = Alphabet[bytes[i] % Alphabet.Length];
        return new string(chars);
    }
}
