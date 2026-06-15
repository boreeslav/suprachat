using System.Collections.Concurrent;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Полный след попытки доставки Web Push при новом сообщении (для отладки администратором).
/// </summary>
public sealed class PushDeliveryTrace
{
    public string chatId { get; set; } = "";
    public string? messageId { get; set; }
    public DateTimeOffset at { get; set; } = DateTimeOffset.UtcNow;
    public string? senderUserId { get; set; }
    public List<PushRecipientTrace> recipients { get; set; } = [];
}

public sealed class PushRecipientTrace
{
    public string userId { get; set; } = "";
    public string? displayName { get; set; }
    public string presenceStatus { get; set; } = "offline";
    public bool isConnected { get; set; }
    public bool isForeground { get; set; } = true;
    public bool globalMuted { get; set; }
    public bool chatMuted { get; set; }
    public int subscriptionCount { get; set; }
    /// <summary>skipped | sent | failed | no-subscriptions</summary>
    public string action { get; set; } = "";
    public string? skipReason { get; set; }
    public bool? anyDelivered { get; set; }
    public List<PushSubscriptionAttempt> attempts { get; set; } = [];
}

public sealed class PushSubscriptionAttempt
{
    public string endpointSuffix { get; set; } = "";
    /// <summary>sent | stale-removed | failed | error</summary>
    public string outcome { get; set; } = "";
    public int? httpStatus { get; set; }
    public string? error { get; set; }
    public DateTimeOffset at { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class PushUserSendResult
{
    public int SubscriptionCount { get; set; }
    public int SuccessCount { get; set; }
    public List<PushSubscriptionAttempt> Attempts { get; set; } = [];
}

/// <summary>Кольцевой буфер последних push-трасс для просмотра в админке.</summary>
public sealed class PushDiagnosticLogStore
{
    private const int MaxEntries = 300;
    private readonly ConcurrentQueue<PushDeliveryTrace> _entries = new();
    private readonly ConcurrentDictionary<string, PushDeliveryTrace> _byMessageId = new();
    private int _count;

    public void Add(PushDeliveryTrace trace)
    {
        _entries.Enqueue(trace);
        if (!string.IsNullOrWhiteSpace(trace.messageId))
            _byMessageId[trace.messageId] = trace;

        if (Interlocked.Increment(ref _count) > MaxEntries)
        {
            Interlocked.Decrement(ref _count);
            if (_entries.TryDequeue(out var removed) && !string.IsNullOrWhiteSpace(removed.messageId))
                _byMessageId.TryRemove(removed.messageId, out _);
        }
    }

    public PushDeliveryTrace? GetByMessageId(string messageId)
    {
        if (string.IsNullOrWhiteSpace(messageId)) return null;
        return _byMessageId.TryGetValue(messageId, out var trace) ? trace : null;
    }

    public IReadOnlyList<PushDeliveryTrace> GetRecent(int limit = 50)
    {
        limit = Math.Clamp(limit, 1, MaxEntries);
        return _entries.Reverse().Take(limit).ToList();
    }
}

public static class PushDiagnosticsHelper
{
    public static string MaskEndpoint(string endpoint)
    {
        if (string.IsNullOrWhiteSpace(endpoint)) return "";
        var e = endpoint.Trim();
        return e.Length <= 48 ? e : "…" + e[^48..];
    }
}
