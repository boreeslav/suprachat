using System.Collections.Concurrent;
using SuperMessenger.Core.Dtos;

namespace SuperMessenger.Web.Services;

public sealed class MiniAppSessionService
{
    public static readonly TimeSpan SessionTtl = TimeSpan.FromMinutes(15);
    public const int MaxPayloadBytes = 64_000;

    private readonly ConcurrentDictionary<string, MiniAppSession> _sessions = new(StringComparer.Ordinal);

    public string CreateSession(
        Guid viewerUserId,
        Guid messageId,
        Guid chatId,
        Guid botUserId,
        BotMiniAppManifestDto manifest)
    {
        PurgeExpired();
        var token = Guid.NewGuid().ToString("N");
        _sessions[token] = new MiniAppSession
        {
            Token = token,
            ViewerUserId = viewerUserId,
            MessageId = messageId,
            ChatId = chatId,
            BotUserId = botUserId,
            Manifest = manifest,
            ExpiresOn = DateTime.UtcNow.Add(SessionTtl),
        };
        return token;
    }

    public MiniAppSession? TryGet(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        if (!_sessions.TryGetValue(token.Trim(), out var session)) return null;
        if (session.ExpiresOn <= DateTime.UtcNow)
        {
            _sessions.TryRemove(token.Trim(), out _);
            return null;
        }
        return session;
    }

    void PurgeExpired()
    {
        var now = DateTime.UtcNow;
        foreach (var kv in _sessions)
        {
            if (kv.Value.ExpiresOn <= now)
                _sessions.TryRemove(kv.Key, out _);
        }
    }

    public sealed class MiniAppSession
    {
        public string Token { get; set; } = "";
        public Guid ViewerUserId { get; set; }
        public Guid MessageId { get; set; }
        public Guid ChatId { get; set; }
        public Guid BotUserId { get; set; }
        public BotMiniAppManifestDto Manifest { get; set; } = new();
        public DateTime ExpiresOn { get; set; }
    }
}
