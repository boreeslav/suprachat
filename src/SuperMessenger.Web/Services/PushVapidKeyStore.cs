using System.Text.Json;
using WebPush;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Хранит VAPID-пару ключей для Web Push. Пара генерируется один раз и
/// переиспользуется между перезапусками (как и Data Protection keys), иначе
/// все ранее выданные подписки станут невалидными.
/// </summary>
public sealed class PushVapidKeyStore
{
    private readonly string _path;
    private readonly string _subject;
    private readonly object _lock = new();
    private VapidDetails? _cached;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public PushVapidKeyStore(string dataRoot, string? publicUrl)
    {
        var dir = Path.Combine(dataRoot, "push");
        Directory.CreateDirectory(dir);
        _path = Path.Combine(dir, "vapid.json");
        _subject = ResolveSubject(publicUrl);
    }

    /// <summary>Полные VAPID-данные (subject + публичный/приватный ключ) для отправки пушей.</summary>
    public VapidDetails GetVapidDetails()
    {
        if (_cached != null) return _cached;
        lock (_lock)
        {
            if (_cached != null) return _cached;

            var stored = TryRead();
            if (stored == null)
            {
                var generated = VapidHelper.GenerateVapidKeys();
                stored = new StoredKeys
                {
                    PublicKey = generated.PublicKey,
                    PrivateKey = generated.PrivateKey,
                };
                Write(stored);
            }

            _cached = new VapidDetails(_subject, stored.PublicKey, stored.PrivateKey);
            return _cached;
        }
    }

    /// <summary>Публичный ключ (base64url) для клиентской подписки.</summary>
    public string GetPublicKey() => GetVapidDetails().PublicKey;

    private StoredKeys? TryRead()
    {
        try
        {
            if (!File.Exists(_path)) return null;
            var json = File.ReadAllText(_path);
            var keys = JsonSerializer.Deserialize<StoredKeys>(json, JsonOptions);
            if (keys == null || string.IsNullOrWhiteSpace(keys.PublicKey) || string.IsNullOrWhiteSpace(keys.PrivateKey))
                return null;
            return keys;
        }
        catch
        {
            return null;
        }
    }

    private void Write(StoredKeys keys)
    {
        var json = JsonSerializer.Serialize(keys, JsonOptions);
        var temp = _path + ".tmp";
        File.WriteAllText(temp, json);
        File.Move(temp, _path, true);
    }

    private static string ResolveSubject(string? publicUrl)
    {
        var url = (publicUrl ?? "").Trim().TrimEnd('/');
        if (url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            url.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            return url;
        // Web Push требует mailto: или https-URL в качестве subject.
        return "mailto:admin@supermessenger.local";
    }

    private sealed class StoredKeys
    {
        public string PublicKey { get; set; } = "";
        public string PrivateKey { get; set; } = "";
    }
}
