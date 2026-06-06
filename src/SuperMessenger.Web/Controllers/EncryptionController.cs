using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Controllers;

[ApiController]
[Route("api/encryption")]
[Authorize]
public sealed class EncryptionController : ControllerBase
{
    private readonly SupraEncryptionService _encryption;
    private readonly CurrentUserAccessor _current;

    public EncryptionController(SupraEncryptionService encryption, CurrentUserAccessor current)
    {
        _encryption = encryption;
        _current = current;
    }

    [HttpGet("status")]
    public async Task<IActionResult> Status(CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        return Ok(new
        {
            configured = _encryption.IsEncryptionConfigured(user),
            salt = user.EncryptionSalt,
        });
    }

    [HttpPost("setup")]
    public async Task<IActionResult> Setup([FromBody] SetupEncryptionRequest req, CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        var publicKey = string.IsNullOrWhiteSpace(req.PublicKey) ? null : req.PublicKey.Trim();
        var privateKeyBlob = string.IsNullOrWhiteSpace(req.PrivateKeyBlob) ? null : req.PrivateKeyBlob.Trim();
        var (ok, error) = await _encryption.SetupMasterEncryptionAsync(
            user, req.Salt ?? "", req.Verifier ?? "", publicKey, privateKeyBlob, ct);
        if (!ok) return BadRequest(new { error });
        return Ok(new { success = true });
    }

    [HttpGet("private-key-backup")]
    public async Task<IActionResult> GetPrivateKeyBackup(CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        if (string.IsNullOrEmpty(user.EncryptionPrivateKeyBlob))
            return Ok(new { found = false });
        return Ok(new { found = true, blob = user.EncryptionPrivateKeyBlob });
    }

    [HttpPost("public-keys")]
    public async Task<IActionResult> PublicKeys([FromBody] PublicKeysRequest req, CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        var ids = (req.UserIds ?? [])
            .Select(s => Guid.TryParse(s, out var g) ? g : (Guid?)null)
            .Where(g => g.HasValue)
            .Select(g => g!.Value);
        var keys = await _encryption.GetPublicKeysAsync(ids, ct);
        return Ok(new { keys });
    }

    [HttpPost("group-keys")]
    public async Task<IActionResult> SaveGroupKeys([FromBody] SaveGroupKeysRequest req, CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        if (!Guid.TryParse(req.ChatId, out var chatId))
            return BadRequest(new { error = "Некорректный chatId" });

        var entries = (req.Keys ?? [])
            .Where(k => Guid.TryParse(k.UserId, out _))
            .Select(k => (Guid.Parse(k.UserId!), k.WrappedAutoPassword ?? ""))
            .ToList();

        var (ok, error) = await _encryption.SaveGroupMemberKeysAsync(
            user, chatId, entries, req.RequiresCustomPassword, ct);
        if (!ok) return BadRequest(new { error });
        return Ok(new { success = true });
    }

    [HttpGet("group-keys/{chatId}")]
    public async Task<IActionResult> GetMyGroupKey(string chatId, CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        if (!Guid.TryParse(chatId, out var chatGuid))
            return BadRequest(new { error = "Некорректный chatId" });

        var chat = await _encryption.GetMyWrappedGroupAutoPasswordAsync(user.Id, chatGuid, ct);
        if (chat == null)
            return Ok(new { found = false });

        return Ok(new { found = true, wrappedAutoPassword = chat });
    }

    [HttpGet("group-keys/{chatId}/missing")]
    public async Task<IActionResult> MissingGroupKeys(string chatId, CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        if (!Guid.TryParse(chatId, out var chatGuid))
            return BadRequest(new { error = "Некорректный chatId" });

        var missing = await _encryption.GetMembersMissingGroupKeyAsync(chatGuid, ct);
        return Ok(new { userIds = missing.Select(id => id.ToString()).ToList() });
    }

    [HttpPost("reset")]
    public async Task<IActionResult> Reset(CancellationToken ct)
    {
        var user = await _current.GetCurrentUserAsync(ct);
        if (user == null) return Unauthorized();
        await _encryption.ResetMasterEncryptionAsync(user, ct);
        return Ok(new { success = true });
    }

    public sealed class SetupEncryptionRequest
    {
        public string? Salt { get; set; }
        public string? Verifier { get; set; }
        public string? PublicKey { get; set; }
        /// <summary>AES-GCM PKCS#8 blob from client (encrypted with master password).</summary>
        public string? PrivateKeyBlob { get; set; }
    }

    public sealed class PublicKeysRequest
    {
        public List<string>? UserIds { get; set; }
    }

    public sealed class SaveGroupKeysRequest
    {
        public string? ChatId { get; set; }
        public bool RequiresCustomPassword { get; set; }
        public List<GroupKeyEntry>? Keys { get; set; }
    }

    public sealed class GroupKeyEntry
    {
        public string? UserId { get; set; }
        public string? WrappedAutoPassword { get; set; }
    }
}
