namespace SuperMessenger.Web.Services;

public sealed class UserPresenceService
{
    private readonly object _lock = new();
    private readonly Dictionary<Guid, PresenceEntry> _entries = new();

    public const int IdleMinutes = 5;
    public const int HeartbeatTimeoutSeconds = 90;

    public void UserConnected(Guid userId)
    {
        lock (_lock)
        {
            if (!_entries.TryGetValue(userId, out var entry))
            {
                entry = new PresenceEntry();
                _entries[userId] = entry;
            }
            entry.ConnectionCount++;
            var now = DateTime.UtcNow;
            entry.LastHeartbeatUtc = now;
            entry.LastActivityUtc = now;
            entry.IsForeground = true;
        }
    }

    public void UserDisconnected(Guid userId)
    {
        lock (_lock)
        {
            if (!_entries.TryGetValue(userId, out var entry)) return;
            entry.ConnectionCount = Math.Max(0, entry.ConnectionCount - 1);
        }
    }

    public void ReportHeartbeat(Guid userId)
    {
        lock (_lock)
        {
            if (!_entries.TryGetValue(userId, out var entry)) return;
            if (entry.ConnectionCount <= 0) return;
            entry.LastHeartbeatUtc = DateTime.UtcNow;
        }
    }

    public void ReportActivity(Guid userId)
    {
        lock (_lock)
        {
            if (!_entries.TryGetValue(userId, out var entry)) return;
            if (entry.ConnectionCount <= 0) return;
            var now = DateTime.UtcNow;
            entry.LastHeartbeatUtc = now;
            entry.LastActivityUtc = now;
        }
    }

    public string GetStatus(Guid userId)
    {
        lock (_lock)
        {
            if (!_entries.TryGetValue(userId, out var entry) || !IsAlive(entry))
                return "offline";
            var idle = DateTime.UtcNow - entry.LastActivityUtc;
            return idle.TotalMinutes >= IdleMinutes ? "idle" : "online";
        }
    }

    public bool IsConnected(Guid userId)
    {
        lock (_lock)
        {
            return _entries.TryGetValue(userId, out var entry) && IsAlive(entry);
        }
    }

    public bool IsForeground(Guid userId)
    {
        lock (_lock)
        {
            return _entries.TryGetValue(userId, out var entry) && entry.IsForeground;
        }
    }

    /// <summary>
    /// Пользователь доступен для realtime-доставки (WS жив и приложение на переднем плане).
    /// </summary>
    public bool IsRealtimeAvailable(Guid userId)
    {
        lock (_lock)
        {
            return _entries.TryGetValue(userId, out var entry) && IsAlive(entry) && entry.IsForeground;
        }
    }

    public void ReportForeground(Guid userId)
    {
        lock (_lock)
        {
            if (!_entries.TryGetValue(userId, out var entry)) return;
            if (entry.ConnectionCount <= 0) return;
            entry.IsForeground = true;
            var now = DateTime.UtcNow;
            entry.LastHeartbeatUtc = now;
        }
    }

    public void ReportBackground(Guid userId)
    {
        lock (_lock)
        {
            if (!_entries.TryGetValue(userId, out var entry)) return;
            if (entry.ConnectionCount <= 0) return;
            entry.IsForeground = false;
        }
    }

    /// <summary>
    /// Сбрасывает «зависшие» подключения без heartbeat и возвращает userId для рассылки offline.
    /// </summary>
    public IReadOnlyList<Guid> ExpireStaleConnections()
    {
        lock (_lock)
        {
            var expired = new List<Guid>();
            foreach (var (userId, entry) in _entries)
            {
                if (entry.ConnectionCount <= 0) continue;
                if (IsAlive(entry)) continue;
                entry.ConnectionCount = 0;
                expired.Add(userId);
            }
            return expired;
        }
    }

    private static bool IsAlive(PresenceEntry entry)
    {
        if (entry.ConnectionCount <= 0) return false;
        return (DateTime.UtcNow - entry.LastHeartbeatUtc).TotalSeconds < HeartbeatTimeoutSeconds;
    }

    private sealed class PresenceEntry
    {
        public int ConnectionCount;
        public DateTime LastHeartbeatUtc = DateTime.UtcNow;
        public DateTime LastActivityUtc = DateTime.UtcNow;
        public bool IsForeground = true;
    }
}
