using SuperMessenger.Core.Dtos;

namespace SuperMessenger.Infrastructure.Services;

public sealed class ChatActivityTracker
{
    public static readonly TimeSpan DefaultTimeout = TimeSpan.FromMinutes(5);
    public const int MaxActivityMessageLength = 120;

    sealed class Entry
    {
        public required Guid ChatId { get; init; }
        public required Guid UserId { get; init; }
        public required string UserName { get; init; }
        public required string ActivityType { get; init; }
        public string? ActivityMessage { get; init; }
        public DateTime ExpiresAt { get; set; }
    }

    readonly object _lock = new();
    readonly Dictionary<string, Entry> _entries = new(StringComparer.Ordinal);

    static string Key(Guid chatId, Guid userId, string activityType) =>
        $"{chatId:N}:{userId:N}:{activityType}";

    public static string? TruncateActivityMessage(string? message)
    {
        if (string.IsNullOrWhiteSpace(message)) return null;
        var trimmed = message.Trim().ReplaceLineEndings(" ");
        if (trimmed.Length <= MaxActivityMessageLength) return trimmed;
        return trimmed[..(MaxActivityMessageLength - 3)] + "...";
    }

    public void Set(
        Guid chatId,
        Guid userId,
        string userName,
        string activityType,
        bool active,
        string? activityMessage = null)
    {
        var key = Key(chatId, userId, activityType);
        lock (_lock)
        {
            if (!active)
            {
                _entries.Remove(key);
                return;
            }

            _entries[key] = new Entry
            {
                ChatId = chatId,
                UserId = userId,
                UserName = userName,
                ActivityType = activityType,
                ActivityMessage = TruncateActivityMessage(activityMessage),
                ExpiresAt = DateTime.UtcNow.Add(DefaultTimeout),
            };
        }
    }

    public List<SupraChatActivityDto> GetActiveForChat(Guid chatId)
    {
        lock (_lock)
        {
            PruneExpiredLocked(DateTime.UtcNow);
            return _entries.Values
                .Where(e => e.ChatId == chatId)
                .Select(MapDto)
                .ToList();
        }
    }

    public List<SupraChatActivityDto> GetActiveForUserInChat(Guid chatId, Guid userId)
    {
        lock (_lock)
        {
            PruneExpiredLocked(DateTime.UtcNow);
            return _entries.Values
                .Where(e => e.ChatId == chatId && e.UserId == userId)
                .Select(MapDto)
                .ToList();
        }
    }

    static SupraChatActivityDto MapDto(Entry e) => new()
    {
        userId = e.UserId.ToString(),
        userName = e.UserName,
        activityType = e.ActivityType,
        activityMessage = e.ActivityMessage,
        expiresAt = e.ExpiresAt,
    };

    public SupraWsUserActivityPayload BuildPayload(
        Guid chatId,
        Guid userId,
        string userName,
        string activityType,
        bool active,
        string? activityMessage = null)
    {
        string? message = null;
        if (active)
        {
            lock (_lock)
            {
                var key = Key(chatId, userId, activityType);
                if (_entries.TryGetValue(key, out var entry))
                    message = entry.ActivityMessage;
            }
            message ??= TruncateActivityMessage(activityMessage);
        }

        return new SupraWsUserActivityPayload
        {
            chatId = chatId.ToString(),
            userId = userId.ToString(),
            userName = userName,
            activityType = activityType,
            active = active,
            activityMessage = message,
        };
    }

    void PruneExpiredLocked(DateTime now)
    {
        var expired = _entries
            .Where(kv => kv.Value.ExpiresAt <= now)
            .Select(kv => kv.Key)
            .ToList();
        foreach (var key in expired)
            _entries.Remove(key);
    }
}
