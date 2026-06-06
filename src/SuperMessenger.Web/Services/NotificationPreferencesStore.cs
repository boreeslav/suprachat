using System.Text.Json;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Пользовательские настройки уведомлений: глобальное отключение и список
/// заглушённых чатов/групп. Хранится в data/push/preferences.json.
/// Используется и серверным Web Push, и (через API) клиентом для локальных
/// уведомлений, чтобы поведение совпадало.
/// </summary>
public sealed class NotificationPreferencesStore
{
    private readonly string _path;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public NotificationPreferencesStore(string dataRoot)
    {
        var dir = Path.Combine(dataRoot, "push");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "preferences.json");
    }

    public async Task<NotificationPreferences> GetAsync(Guid userId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var all = await ReadUnlockedAsync(ct);
            return Find(all, userId) ?? new NotificationPreferences { UserId = userId };
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task SetGlobalMutedAsync(Guid userId, bool muted, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var all = await ReadUnlockedAsync(ct);
            var entry = Find(all, userId);
            if (entry == null)
            {
                entry = new NotificationPreferences { UserId = userId };
                all.Add(entry);
            }
            entry.GlobalMuted = muted;
            await WriteUnlockedAsync(all, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task SetChatMutedAsync(Guid userId, string chatId, bool muted, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(chatId)) return;
        await _lock.WaitAsync(ct);
        try
        {
            var all = await ReadUnlockedAsync(ct);
            var entry = Find(all, userId);
            if (entry == null)
            {
                entry = new NotificationPreferences { UserId = userId };
                all.Add(entry);
            }
            entry.MutedChatIds ??= new List<string>();
            entry.MutedChatIds.RemoveAll(c => string.Equals(c, chatId, StringComparison.OrdinalIgnoreCase));
            if (muted) entry.MutedChatIds.Add(chatId);
            await WriteUnlockedAsync(all, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>true, если пользователю можно слать уведомление о сообщении в этом чате.</summary>
    public async Task<bool> ShouldNotifyAsync(Guid userId, string chatId, CancellationToken ct = default)
    {
        var prefs = await GetAsync(userId, ct);
        if (prefs.GlobalMuted) return false;
        if (prefs.MutedChatIds != null &&
            prefs.MutedChatIds.Any(c => string.Equals(c, chatId, StringComparison.OrdinalIgnoreCase)))
            return false;
        return true;
    }

    private static NotificationPreferences? Find(List<NotificationPreferences> all, Guid userId) =>
        all.FirstOrDefault(p => p.UserId == userId);

    private async Task<List<NotificationPreferences>> ReadUnlockedAsync(CancellationToken ct)
    {
        if (!File.Exists(_path)) return new List<NotificationPreferences>();
        try
        {
            var json = await File.ReadAllTextAsync(_path, ct);
            return JsonSerializer.Deserialize<List<NotificationPreferences>>(json, JsonOptions)
                ?? new List<NotificationPreferences>();
        }
        catch
        {
            return new List<NotificationPreferences>();
        }
    }

    private async Task WriteUnlockedAsync(List<NotificationPreferences> all, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(all, JsonOptions);
        var temp = _path + ".tmp";
        await File.WriteAllTextAsync(temp, json, ct);
        File.Move(temp, _path, true);
    }
}

public sealed class NotificationPreferences
{
    public Guid UserId { get; set; }
    public bool GlobalMuted { get; set; }
    public List<string>? MutedChatIds { get; set; } = new();
}
