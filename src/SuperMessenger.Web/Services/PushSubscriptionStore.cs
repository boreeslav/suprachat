using System.Text.Json;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Хранилище Web Push подписок (endpoint + ключи), привязанных к пользователю.
/// Простое JSON-хранилище в data/push/subscriptions.json — по образцу остальных
/// файловых сторов проекта. Ключ записи — endpoint (уникален для устройства/браузера).
/// </summary>
public sealed class PushSubscriptionStore
{
    private readonly string _path;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public PushSubscriptionStore(string dataRoot)
    {
        var dir = Path.Combine(dataRoot, "push");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "subscriptions.json");
    }

    public async Task UpsertAsync(StoredPushSubscription sub, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(sub.Endpoint)) return;
        await _lock.WaitAsync(ct);
        try
        {
            var all = await ReadUnlockedAsync(ct);
            all.RemoveAll(s => string.Equals(s.Endpoint, sub.Endpoint, StringComparison.Ordinal));
            sub.CreatedAt = sub.CreatedAt == default ? DateTime.UtcNow : sub.CreatedAt;
            all.Add(sub);
            await WriteUnlockedAsync(all, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task RemoveByEndpointAsync(string endpoint, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(endpoint)) return;
        await _lock.WaitAsync(ct);
        try
        {
            var all = await ReadUnlockedAsync(ct);
            var removed = all.RemoveAll(s => string.Equals(s.Endpoint, endpoint, StringComparison.Ordinal));
            if (removed > 0) await WriteUnlockedAsync(all, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<IReadOnlyList<StoredPushSubscription>> GetByUserAsync(Guid userId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var all = await ReadUnlockedAsync(ct);
            return all.Where(s => s.UserId == userId).ToList();
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task<List<StoredPushSubscription>> ReadUnlockedAsync(CancellationToken ct)
    {
        if (!File.Exists(_path)) return new List<StoredPushSubscription>();
        try
        {
            var json = await File.ReadAllTextAsync(_path, ct);
            return JsonSerializer.Deserialize<List<StoredPushSubscription>>(json, JsonOptions)
                ?? new List<StoredPushSubscription>();
        }
        catch
        {
            return new List<StoredPushSubscription>();
        }
    }

    private async Task WriteUnlockedAsync(List<StoredPushSubscription> all, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(all, JsonOptions);
        var temp = _path + ".tmp";
        await File.WriteAllTextAsync(temp, json, ct);
        File.Move(temp, _path, true);
    }
}

public sealed class StoredPushSubscription
{
    public string Endpoint { get; set; } = "";
    public string P256dh { get; set; } = "";
    public string Auth { get; set; } = "";
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }
}
