using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Dtos;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Services;

namespace SuperMessenger.Web.Services;

public sealed class MessengerSyncService
{
    private readonly SupraMessengerService _messenger;
    private readonly SupraEncryptionService _encryption;
    private readonly UserPresenceService _presence;
    private readonly IDataStore _store;

    public MessengerSyncService(
        SupraMessengerService messenger,
        SupraEncryptionService encryption,
        UserPresenceService presence,
        IDataStore store)
    {
        _messenger = messenger;
        _encryption = encryption;
        _presence = presence;
        _store = store;
    }

    public Task<SupraRequestSyncResponse> RequestSyncAsync(
        UserRecord user,
        SupraRequestSyncRequest request,
        CancellationToken ct = default)
    {
        return _messenger.RequestSyncAsync(
            user.Id,
            request,
            BuildPublicProfileAsync,
            BuildEncryptionKeyAsync,
            ct);
    }

    async Task<SupraPublicProfileDto?> BuildPublicProfileAsync(
        Guid viewerId, Guid contactId, CancellationToken ct)
    {
        var user = await _store.GetUserByIdAsync(contactId, ct);
        if (user == null || !user.IsActive) return null;

        string? onlineStatus = null;
        if (await _messenger.CanSeeOnlineStatusAsync(viewerId, contactId, ct))
            onlineStatus = _presence.GetStatus(contactId);
        var canWrite = await _messenger.CanWriteAsync(viewerId, contactId, ct);

        return new SupraPublicProfileDto
        {
            id = user.Id.ToString(),
            login = user.Login,
            displayName = user.DisplayName,
            avatar = AvatarUrlHelper.ForUser(user),
            statusText = user.StatusText ?? "",
            aboutText = user.AboutText ?? "",
            lastSeenAt = user.LastSeenAt,
            onlineStatus = onlineStatus,
            canWrite = canWrite,
        };
    }

    async Task<SupraSyncEncryptionKeyDto> BuildEncryptionKeyAsync(
        Guid userId, Guid chatId, CancellationToken ct)
    {
        var wrapped = await _encryption.GetMyWrappedGroupAutoPasswordAsync(userId, chatId, ct);
        return new SupraSyncEncryptionKeyDto
        {
            found = wrapped != null,
            wrappedAutoPassword = wrapped,
        };
    }
}
