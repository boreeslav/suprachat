using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/push")]
[Authorize]
public sealed class PushController : ControllerBase
{
    private readonly PushVapidKeyStore _vapid;
    private readonly PushSubscriptionStore _subscriptions;
    private readonly NotificationPreferencesStore _prefs;
    private readonly CurrentUserAccessor _current;

    public PushController(
        PushVapidKeyStore vapid,
        PushSubscriptionStore subscriptions,
        NotificationPreferencesStore prefs,
        CurrentUserAccessor current)
    {
        _vapid = vapid;
        _subscriptions = subscriptions;
        _prefs = prefs;
        _current = current;
    }

    [HttpGet("vapid-public-key")]
    [AllowAnonymous]
    public IActionResult GetVapidPublicKey() => Ok(new { publicKey = _vapid.GetPublicKey() });

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscribeRequest req, CancellationToken ct)
    {
        var userId = _current.GetUserId();
        if (userId == null) return Unauthorized();
        if (req == null || string.IsNullOrWhiteSpace(req.Endpoint) ||
            string.IsNullOrWhiteSpace(req.P256dh) || string.IsNullOrWhiteSpace(req.Auth))
            return BadRequest();

        await _subscriptions.UpsertAsync(new StoredPushSubscription
        {
            Endpoint = req.Endpoint.Trim(),
            P256dh = req.P256dh.Trim(),
            Auth = req.Auth.Trim(),
            UserId = userId.Value,
            CreatedAt = DateTime.UtcNow,
        }, ct);

        return Ok(new { ok = true });
    }

    [HttpPost("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] PushUnsubscribeRequest req, CancellationToken ct)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.Endpoint)) return BadRequest();
        await _subscriptions.RemoveByEndpointAsync(req.Endpoint.Trim(), ct);
        return Ok(new { ok = true });
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences(CancellationToken ct)
    {
        var userId = _current.GetUserId();
        if (userId == null) return Unauthorized();
        var prefs = await _prefs.GetAsync(userId.Value, ct);
        return Ok(new
        {
            globalMuted = prefs.GlobalMuted,
            mutedChatIds = prefs.MutedChatIds ?? new List<string>(),
        });
    }

    [HttpPost("preferences/global")]
    public async Task<IActionResult> SetGlobalMuted([FromBody] PushGlobalMuteRequest req, CancellationToken ct)
    {
        var userId = _current.GetUserId();
        if (userId == null) return Unauthorized();
        if (req == null) return BadRequest();
        await _prefs.SetGlobalMutedAsync(userId.Value, req.Muted, ct);
        return Ok(new { ok = true });
    }

    [HttpPost("preferences/chat")]
    public async Task<IActionResult> SetChatMuted([FromBody] PushChatMuteRequest req, CancellationToken ct)
    {
        var userId = _current.GetUserId();
        if (userId == null) return Unauthorized();
        if (req == null || string.IsNullOrWhiteSpace(req.ChatId)) return BadRequest();
        await _prefs.SetChatMutedAsync(userId.Value, req.ChatId.Trim(), req.Muted, ct);
        return Ok(new { ok = true });
    }
}

public sealed class PushGlobalMuteRequest
{
    public bool Muted { get; set; }
}

public sealed class PushChatMuteRequest
{
    public string? ChatId { get; set; }
    public bool Muted { get; set; }
}

public sealed class PushSubscribeRequest
{
    public string? Endpoint { get; set; }
    public string? P256dh { get; set; }
    public string? Auth { get; set; }
}

public sealed class PushUnsubscribeRequest
{
    public string? Endpoint { get; set; }
}
