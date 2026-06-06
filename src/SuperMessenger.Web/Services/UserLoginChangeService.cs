using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Services;

namespace SuperMessenger.Web.Services;

public sealed class UserLoginChangeService
{
    public const int LoginChangeCooldownHours = 24;

    private readonly IDataStore _store;
    private readonly SupraMessengerService _messenger;
    private readonly RealtimeNotifier _realtime;

    public UserLoginChangeService(IDataStore store, SupraMessengerService messenger, RealtimeNotifier realtime)
    {
        _store = store;
        _messenger = messenger;
        _realtime = realtime;
    }

    public static bool CanChangeLogin(UserRecord user, DateTime? utcNow = null)
    {
        if (!user.LastLoginChangedAt.HasValue) return true;
        return (utcNow ?? DateTime.UtcNow) >= user.LastLoginChangedAt.Value.AddHours(LoginChangeCooldownHours);
    }

    public static DateTime? GetNextLoginChangeAt(UserRecord user)
        => user.LastLoginChangedAt?.AddHours(LoginChangeCooldownHours);

    public async Task<(bool success, string? error, string? oldLogin)> TryChangeLoginAsync(
        UserRecord user, string newLogin, bool skipRateLimit = false, CancellationToken ct = default)
    {
        newLogin = newLogin.Trim();
        if (newLogin.Length < 4)
            return (false, "Логин должен быть не короче 4 символов", null);
        if (newLogin.Contains('.'))
            return (false, "Логин не может содержать точку", null);
        if (string.Equals(user.Login, newLogin, StringComparison.OrdinalIgnoreCase))
            return (false, "Новый логин совпадает с текущим", null);
        if (!skipRateLimit && !CanChangeLogin(user))
            return (false, "Логин можно менять не чаще одного раза в сутки", null);
        if (await _store.IsLoginTakenAsync(newLogin, user.Id, ct))
            return (false, "Логин уже занят", null);

        var oldLogin = user.Login;
        user.PreviousLogins ??= [];
        if (!user.PreviousLogins.Any(p => string.Equals(p, oldLogin, StringComparison.OrdinalIgnoreCase)))
            user.PreviousLogins.Add(oldLogin);
        user.Login = newLogin;
        user.LastLoginChangedAt = DateTime.UtcNow;
        await _store.SaveUserAsync(user, ct);

        await _store.SaveLoginChangeAsync(new LoginChangeRecord
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            OldLogin = oldLogin,
            NewLogin = newLogin,
            ChangedOn = DateTime.UtcNow,
        }, ct);

        await BroadcastLoginChangedAsync(user, oldLogin, ct);
        return (true, null, oldLogin);
    }

    public async Task BroadcastLoginChangedAsync(UserRecord user, string oldLogin, CancellationToken ct)
    {
        var payload = new SupraWsLoginChangedPayload
        {
            userId = user.Id.ToString(),
            oldLogin = oldLogin,
            newLogin = user.Login,
            displayName = user.DisplayName,
            avatar = AvatarUrlHelper.ForUser(user),
        };
        var recipients = new HashSet<Guid>(await _messenger.GetChatContactUserIdsAsync(user.Id, ct));
        recipients.Add(user.Id);
        foreach (var uid in recipients)
            await _realtime.SendToUserAsync(uid, payload, ct);
    }

    public async Task DeliverPendingLoginChangesAsync(Guid viewerId, CancellationToken ct)
    {
        var contactIds = await _messenger.GetChatContactUserIdsAsync(viewerId, ct);
        if (contactIds.Count == 0) return;

        var viewer = await _store.GetUserByIdAsync(viewerId, ct);
        var minSince = DateTime.UtcNow.AddDays(-30);
        var since = viewer?.LastSeenAt ?? minSince;
        if (since < minSince) since = minSince;
        var changes = await _store.GetLoginChangesForUsersAsync(contactIds, since, ct);
        var users = await _store.GetUsersAsync(ct);
        foreach (var change in changes)
        {
            var user = users.FirstOrDefault(u => u.Id == change.UserId);
            if (user == null) continue;
            await _realtime.SendToUserAsync(viewerId, new SupraWsLoginChangedPayload
            {
                userId = change.UserId.ToString(),
                oldLogin = change.OldLogin,
                newLogin = change.NewLogin,
                displayName = user.DisplayName,
                avatar = AvatarUrlHelper.ForUser(user),
            }, ct);
        }
    }
}
