using System.Text.Json;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Персональные настройки мессенджера пользователя (data/messenger/user-preferences.json).
/// </summary>
public sealed class MessengerUserPreferencesStore
{
    private readonly string _path;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public MessengerUserPreferencesStore(string dataRoot)
    {
        var dir = Path.Combine(dataRoot, "messenger");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "user-preferences.json");
    }

    public async Task<MessengerUserPreferences> GetAsync(Guid userId, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var all = await ReadUnlockedAsync(ct);
            return Find(all, userId) ?? new MessengerUserPreferences { UserId = userId };
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task SetUseThemeChatBgAsync(Guid userId, bool useThemeChatBg, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var all = await ReadUnlockedAsync(ct);
            var entry = Find(all, userId);
            if (entry == null)
            {
                entry = new MessengerUserPreferences { UserId = userId };
                all.Add(entry);
            }
            entry.UseThemeChatBg = useThemeChatBg;
            await WriteUnlockedAsync(all, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    static MessengerUserPreferences? Find(List<MessengerUserPreferences> all, Guid userId) =>
        all.FirstOrDefault(p => p.UserId == userId);

    async Task<List<MessengerUserPreferences>> ReadUnlockedAsync(CancellationToken ct)
    {
        if (!File.Exists(_path)) return [];
        try
        {
            var json = await File.ReadAllTextAsync(_path, ct);
            return JsonSerializer.Deserialize<List<MessengerUserPreferences>>(json, JsonOptions) ?? [];
        }
        catch
        {
            return [];
        }
    }

    async Task WriteUnlockedAsync(List<MessengerUserPreferences> all, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(all, JsonOptions);
        var temp = _path + ".tmp";
        await File.WriteAllTextAsync(temp, json, ct);
        File.Move(temp, _path, true);
    }
}

public sealed class MessengerUserPreferences
{
    public Guid UserId { get; set; }
    /// <summary>Personal override for theme chat background (color + wallpaper).</summary>
    public bool? UseThemeChatBg { get; set; }
}
