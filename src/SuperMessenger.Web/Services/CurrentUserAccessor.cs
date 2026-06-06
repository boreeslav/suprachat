using System.Security.Claims;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Web.Services;

public sealed class CurrentUserAccessor
{
    private readonly IHttpContextAccessor _http;
    private readonly IDataStore _store;

    public CurrentUserAccessor(IHttpContextAccessor http, IDataStore store)
    {
        _http = http;
        _store = store;
    }

    public Guid? GetUserId()
    {
        var id = _http.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(id, out var g) ? g : null;
    }

    public async Task<UserRecord?> GetCurrentUserAsync(CancellationToken ct = default)
    {
        var id = GetUserId();
        return id.HasValue ? await _store.GetUserByIdAsync(id.Value, ct) : null;
    }
}
