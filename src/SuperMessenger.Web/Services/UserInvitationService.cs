using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Web.Services;

public sealed class UserInvitationService
{
    public const int MaxActivePerUser = 5;
    public static readonly TimeSpan ActiveLifetime = TimeSpan.FromDays(3);

    private readonly IDataStore _store;

    public UserInvitationService(IDataStore store)
    {
        _store = store;
    }

    public async Task CleanupExpiredAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var all = await _store.GetInvitationsAsync(ct);
        foreach (var inv in all)
        {
            if (!inv.IsUserInvite || inv.IsUsed)
                continue;
            var expires = inv.ExpiresOn ?? inv.CreatedOn.Add(ActiveLifetime);
            if (expires <= now)
                await _store.DeleteInvitationAsync(inv.Id, ct);
        }
    }

    public async Task<IReadOnlyList<InvitationRecord>> GetActiveForUserAsync(Guid userId, CancellationToken ct = default)
    {
        await CleanupExpiredAsync(ct);
        var now = DateTime.UtcNow;
        return (await _store.GetInvitationsAsync(ct))
            .Where(i => i.IsUserInvite
                        && i.CreatedByUserId == userId
                        && !i.IsUsed
                        && (i.ExpiresOn ?? i.CreatedOn.Add(ActiveLifetime)) > now)
            .OrderByDescending(i => i.CreatedOn)
            .ToList();
    }

    public async Task<int> CountActiveForUserAsync(Guid userId, CancellationToken ct = default)
        => (await GetActiveForUserAsync(userId, ct)).Count;

    public bool IsActive(InvitationRecord inv, DateTime? now = null)
    {
        now ??= DateTime.UtcNow;
        if (inv.IsUsed)
            return false;
        if (!inv.IsUserInvite)
            return !inv.ExpiresOn.HasValue || inv.ExpiresOn > now;

        var expires = inv.ExpiresOn ?? inv.CreatedOn.Add(ActiveLifetime);
        return expires > now;
    }

    public DateTime GetExpiresOn(InvitationRecord inv)
        => inv.ExpiresOn ?? inv.CreatedOn.Add(ActiveLifetime);
}
